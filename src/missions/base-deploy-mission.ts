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
  IContractV6,
  IDeployCampaignConfig,
  ITransactionResponseBase,
  TLogger,
} from "../campaign/types";
import { IContractDbData } from "../db/types";
import { EnvironmentLevels, NetworkData } from "../deployer/constants";
import { IHardhatBase, ISignerBase } from "../deployer/types";


export class BaseDeployMission <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> {
  contractName! : string;
  instanceName! : string;
  proxyData! : IProxyData;
  campaign : DeployCampaign<H, S, C, St>;
  logger : TLogger;
  config : C;
  implAddress! : string | null;

  constructor ({
    campaign,
    logger,
    config,
  } : IDeployMissionArgs<H, S, C, St>) {
    this.campaign = campaign;
    this.logger = logger;
    this.config = config;
  }

  get dbName () : string {
    return this.contractName;
  }

  async getFromDB () {
    return this.campaign.dbAdapter.getContract(this.dbName);
  }

  async saveToDB (contract : IContractV6) {
    this.logger.debug(`Writing ${this.dbName} to DB...`);

    this.implAddress = this.proxyData.isProxy
      ? await this.campaign.deployer.getProxyImplAddress(await contract.getAddress())
      : null;

    const contractDbDoc = await this.buildDbObject(contract, this.implAddress);

    return this.campaign.dbAdapter.writeContract(this.dbName, contractDbDoc);
  }

  async needsDeploy () {
    const dbContract = await this.getFromDB();

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
    hhContract : IContractV6,
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
