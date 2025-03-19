/* eslint-disable camelcase */
import {
  TDeployArgs,
  IProxyData,
  IDeployMissionArgs,
  ITenderlyContractData,
} from "./types";
import { DeployCampaign } from "../campaign/deploy-campaign";
import {
  IContractState,
  IDeployCampaignConfig,
  TLogger,
  ITransactionResponseBase,
} from "../campaign/types";
import { IContractDbData } from "../db/types";
import { EnvironmentLevels, NetworkData } from "../deployer/constants";
import { Contract } from "ethers";
import { UpgradeOps } from "./constants";
import { bytecodesMatch } from "../utils/bytecode";
import { IDBVersion } from "../db";


export class BaseDeployMission <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> {
  contractName! : string;
  instanceName! : string;
  proxyData! : IProxyData;
  campaign : DeployCampaign<C, St>;
  logger : TLogger;
  config : C;
  implAddress! : string | null;

  constructor ({
    campaign,
    logger,
    config,
  } : IDeployMissionArgs<C, St>) {
    this.campaign = campaign;
    this.logger = logger;
    this.config = config;
  }

  get dbName () : string {
    return this.contractName;
  }

  async getDeployedFromDB () {
    // ! Only one "DEPLOYED" version should exist in the DB at any time !
    const deployedVersionDoc = await this.campaign.dbAdapter.versioner.getDeployedVersion();
    if (!deployedVersionDoc) {
      // TODO upg: will this be logged by a logger or should we add logger call as well? test!
      // eslint-disable-next-line max-len
      throw new Error("No deployed version found in DB. This method should be run in upgrade mode only, and the 'DEPLOYED' DB version should exist already from the previous deploy.");
    }

    return this.campaign.dbAdapter.getContract(this.dbName, deployedVersionDoc.dbVersion);
  }

  async getLatestFromDB () {
    return this.campaign.dbAdapter.getContract(this.contractName);
  }

  async saveToDB (contract : Contract) {
    this.logger.debug(`Writing ${this.dbName} to DB...`);

    this.implAddress = this.proxyData.isProxy
      ? await this.campaign.deployer.getProxyImplAddress(await contract.getAddress())
      : null;

    const contractDbDoc = await this.buildDbObject(contract, this.implAddress);

    return this.campaign.dbAdapter.writeContract(this.dbName, contractDbDoc);
  }

  async dbCopy () {
    const deployedContract = await this.getDeployedFromDB();
    delete deployedContract?.version;
    // @ts-ignore
    delete deployedContract?._id;
    // TODO upg: fix this write method on db adapter to write contract with a proper version!
    const { dbVersion: tempV } = await this.campaign.dbAdapter.versioner.getTempVersion() as IDBVersion;
    await this.campaign.dbAdapter.writeContract(this.contractName, (deployedContract as IContractDbData), tempV);
    this.logger.debug(`${this.contractName} data is copied to the newest version of the DB...`);
  }

  async needsDeploy () {
    const dbContract = await this.getLatestFromDB();

    if (!dbContract) {
      this.logger.info(`${this.dbName} not found in DB, proceeding to deploy...`);
    } else {
      this.logger.info(`${this.dbName} found in DB at ${dbContract.address}, no deployment needed.`);

      const contract = await this.campaign.deployer.getContractObject(
        this.contractName,
        dbContract.address,
      );

      // eslint-disable-next-line max-len
      this.logger.debug(`Updating ${this.contractName} in state from DB data with address ${await contract.getAddress()}`);

      this.campaign.updateStateContract(this.instanceName, this.contractName, contract);
    }

    return !dbContract;
  }

  async deployArgs () : Promise<TDeployArgs> {
    return [];
  }

  getArtifact () {
    return this.campaign.deployer.getContractArtifact(this.contractName);
  }

  async buildDbObject (
    hhContract : Contract,
    implAddress : string | null
  ) : Promise<Omit<IContractDbData, "version">> {
    const { abi, bytecode } = this.getArtifact();
    return {
      name: this.dbName,
      address: await hhContract.getAddress(),
      abi: JSON.stringify(abi),
      bytecode,
      implementation: implAddress,
    };
  }

  async deploy () {
    const deployArgs = await this.deployArgs();
    this.logger.info(`Deploying ${this.contractName} with arguments: ${deployArgs}`);

    let contract : Contract;
    if (this.proxyData.isProxy) {
      contract = await this.campaign.deployer.deployProxy({
        contractName: this.contractName,
        args: deployArgs,
        opts: { kind: this.proxyData.kind },
      });
    } else {
      contract = await this.campaign.deployer.deployContract(this.contractName, deployArgs);
    }

    await this.saveToDB(contract);

    this.campaign.updateStateContract(this.instanceName, this.contractName, contract);

    this.logger.info(`Deployment success for ${this.contractName} at ${await contract.getAddress()}`);
  }

  async needsPostDeploy () {
    return Promise.resolve(false);
  }

  async postDeploy () {
    return Promise.resolve();
  }

  async getContractOperation () {
    const newContract = await this.getLatestFromDB();
    const deployedContract = await this.getDeployedFromDB();

    // checking this first to know if this contract has been deployed previously
    // if not - we just deploy the new one
    if (!deployedContract) {
      return UpgradeOps.deploy;
    }

    // if deployedContract is in DB, but newContract is not in DB yet
    // we need to compare them
    if (!newContract) {
      if (!this.proxyData.isProxy) return UpgradeOps.copy;

      // compare bytecodes against the DB
      const { bytecode: bytecodeInDB } = deployedContract;
      const bytecodeFromChain = await this.campaign.deployer.getBytecodeFromChain(deployedContract.address);
      const { bytecode: curBytecode } = this.getArtifact();
      const match = bytecodesMatch(bytecodeInDB, curBytecode);
      const match2 = bytecodesMatch(bytecodeFromChain, curBytecode);
      const match3 = bytecodesMatch(bytecodeFromChain, bytecodeInDB);

      // TODO upg: MAKE SURE THIS WORKS PROPERLY IN THE UPGRADES PACKAGE
      //  AND THE CONTRACT IS NOT DEPLOYED IN THE UPGRADE FLOW IF BYTECODES ARE THE SAME !!!
      //  IF IT DOESN'T, WE NEED OUR OWN WAY TO COMPARE BYTECODES
      if (!match) return UpgradeOps.upgrade;

      return UpgradeOps.copy;

      // TODO upg: possibly add a check for the RedeployImplementationOpt set for each mission
      //  as a prop akin to `proxyData`
      //  some contracts never need to be redeployed, some may always need redeploy and most are `onchange`
      //  this can be set by default in this mission and overriden by child missions
    }

    // if both of them exist and their addresses are the same (proxies),
    // we don't do anything
    if (newContract.address === deployedContract.address) {
      return UpgradeOps.keep;
    } else {
      throw new Error("Unknown state of deployment.");
    }
  }

  async executeUpgrade () {
    const op = await this.getContractOperation();

    switch (op) {
    case UpgradeOps.deploy:
      await this.executeDeploy();
      break;
    case UpgradeOps.copy:
      await this.dbCopy();
      break;
    case UpgradeOps.upgrade:
      throw new Error(
        // eslint-disable-next-line max-len
        `Contract ${this.contractName} source code differs, but it does not use BaseUpgradeMission, so it can not be upgraded.
        This is an error and needs to be addressed!`
      );
    case UpgradeOps.keep:
      // TODO upg: do we need any logic here ?
      break;
    default:
      throw new Error(`Deploy operation ${op} is not supported.`);
    }
  }

  async executeDeploy () {
    if (await this.needsDeploy()) {
      await this.deploy();
    } else {
      this.logger.info(`Skipping ${this.contractName} deployment...`);
    }

    if (await this.needsPostDeploy()) {
      await this.postDeploy();
    }
  }

  async execute () {
    if (this.config.upgrade) return this.executeUpgrade();

    return this.executeDeploy();
  }

  async awaitConfirmation (tx : ITransactionResponseBase | null) {
    const {
      config: {
        env,
        confirmationsN,
      },
    } = this.campaign;

    if (env !== EnvironmentLevels.dev) {
      if (tx) await tx.wait(confirmationsN);
    }
  }

  async verify () {
    this.logger.debug(`Verifying ${this.contractName} on Etherscan...`);
    const address = await this.campaign[this.instanceName].getAddress();

    const ctorArgs = !this.proxyData.isProxy ? await this.deployArgs() : undefined;
    try {
      await this.campaign.deployer.etherscanVerify({
        address,
        ctorArgs,
      });

      this.logger.debug(`Etherscan verification for ${this.contractName} finished successfully.`);
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (e : any) {
      this.logger.error(`Etherscan verification for ${this.contractName} failed.`);
      this.logger.error(e.message);
      this.logger.debug("Continuing...");
    }
  }

  async getMonitoringData () : Promise<Array<ITenderlyContractData>> {
    const networkId = NetworkData[this.campaign.config.env].id;
    const implName = this.contractName;
    let implAddress = await this.campaign[this.instanceName].getAddress();

    if (this.proxyData.isProxy) {
      const proxyAddress = await this.campaign[this.instanceName].getAddress();
      implAddress = this.implAddress || await this.campaign.deployer.getProxyImplAddress(proxyAddress);

      return [
        {
          display_name: `${this.contractName}Proxy`,
          address: proxyAddress,
          network_id: networkId,
        },
        {
          display_name: `${implName}Impl`,
          address: implAddress,
          network_id: networkId,
        },
      ];
    }

    return [
      {
        display_name: implName,
        address: implAddress,
        network_id: networkId,
      },
    ];
  }
}
