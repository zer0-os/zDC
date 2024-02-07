/* eslint-disable camelcase */
import {
  TDeployArgs,
  IProxyData,
  IDeployMissionArgs,
  ITenderlyContractData,
} from "./types";
import { DeployCampaign } from "../campaign/deploy-campaign";
import { IContractState, IContractV6, IDeployCampaignConfig, TLogger } from "../campaign/types";
import { IContractDbData } from "../db/types";
import { NetworkData } from "../deployer/constants";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";


export class BaseDeployMission <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> {
  contractName! : string;
  instanceName! : string;
  proxyData! : IProxyData;
  campaign : DeployCampaign<H, S, P, St>;
  logger : TLogger;
  config : IDeployCampaignConfig<S>;
  implAddress! : string | null;

  constructor ({
    campaign,
    logger,
    config,
  } : IDeployMissionArgs<H, S, P, St>) {
    this.campaign = campaign;
    this.logger = logger;
    this.config = config;
  }

  async getDeployedFromDB () {
    // ! Only one "DEPLOYED" version should exist in the DB at any time !
    const deployedVersionDoc = await this.campaign.dbAdapter.versioner.getDeployedVersion();
    if (!deployedVersionDoc) {
      // TODO upg: will this be logged by a logger or should we add logger call asl well? test!
      // eslint-disable-next-line max-len
      throw new Error("No deployed version found in DB. This method should be run in upgrade mode only, and the 'DEPLOYED' DB version should exist already from the previous deploy.");
    }

    return this.campaign.dbAdapter.getContract(this.contractName, deployedVersionDoc.dbVersion);
  }

  async getLatestFromDB () {
    return this.campaign.dbAdapter.getContract(this.contractName);
  }

  async saveToDB (contract : IContractV6) {
    this.logger.debug(`Writing ${this.contractName} to DB...`);

    this.implAddress = this.proxyData.isProxy
      ? await this.campaign.deployer.getProxyImplAddress(await contract.getAddress())
      : null;

    const contractDbDoc = await this.buildDbObject(contract, this.implAddress);

    return this.campaign.dbAdapter.writeContract(this.contractName, contractDbDoc);
  }

  async needsDeploy () {
    const dbContract = await this.getDeployedFromDB();

    if (!dbContract) {
      this.logger.info(`${this.contractName} not found in DB, proceeding to deploy...`);
    } else {
      this.logger.info(`${this.contractName} found in DB at ${dbContract.address}, no deployment needed.`);

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
    hhContract : IContractV6,
    implAddress : string | null
  ) : Promise<Omit<IContractDbData, "version">> {
    const { abi, bytecode } = this.getArtifact();
    return {
      name: this.contractName,
      address: await hhContract.getAddress(),
      abi: JSON.stringify(abi),
      bytecode,
      implementation: implAddress,
    };
  }

  async deploy () {
    const deployArgs = await this.deployArgs();
    this.logger.info(`Deploying ${this.contractName} with arguments: ${deployArgs}`);

    let contract : IContractV6;
    if (this.proxyData.isProxy) {
      contract = await this.campaign.deployer.deployProxy({
        contractName: this.contractName,
        args: deployArgs,
        kind: this.proxyData.kind,
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

  async execute () {
    if (await this.needsDeploy()) {
      await this.deploy();
    } else {
      this.logger.info(`Skipping ${this.contractName} deployment...`);
    }

    if (await this.needsPostDeploy()) {
      await this.postDeploy();
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
