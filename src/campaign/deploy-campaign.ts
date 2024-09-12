import {
  ICampaignArgs,
  ICampaignState,
  TLogger,
  IMissionInstances,
  IDeployCampaignConfig, IContractState,
} from "./types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { ITenderlyContractData, TDeployMissionCtor } from "../missions/types";
import { BaseDeployMission } from "../missions/base-deploy-mission";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { makeCampaignProxy } from "./proxy";
import { Contract } from "ethers";


export class DeployCampaign <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> {
  state : ICampaignState<C, St>;
  deployer : HardhatDeployer;
  dbAdapter : MongoDBAdapter;
  logger : TLogger;
  config : C;

  // TODO dep: improve typing here so that methods of each contract type are resolved in Mission classes!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name : string | symbol] : any;

  constructor ({
    missions,
    deployer,
    dbAdapter,
    logger,
    config,
  } : ICampaignArgs<C, St>) {
    this.state = {
      missions,
      instances: {},
      contracts: {} as St,
    };
    this.deployer = deployer;
    this.dbAdapter = dbAdapter;
    this.logger = logger;
    this.config = config;

    const campaignProxy = makeCampaignProxy(this);

    // instantiate all missions
    this.state.instances = missions.reduce(
      (acc : IMissionInstances<C, St>, mission : TDeployMissionCtor<C, St>) => {
        const instance = new mission({
          campaign: campaignProxy,
          logger,
          config,
        });

        acc[instance.instanceName] = instance;
        return acc;
      },
      {}
    );

    this.logger.info("Deploy Campaign initialized.");

    return campaignProxy;
  }

  async execute () {
    this.logger.info("Deploy Campaign execution started.");

    await this.dbAdapter.configureVersioning();

    await Object.values(this.state.instances).reduce(
      async (
        acc : Promise<void>,
        missionInstance : BaseDeployMission<C, St>,
      ) : Promise<void> => {
        await acc;
        return missionInstance.execute();
      },
      Promise.resolve()
    );

    if (this.config.postDeploy.verifyContracts) {
      await this.verify();
    }

    if (this.config.postDeploy.monitorContracts) {
      await this.monitor();
    }

    // eslint-disable-next-line max-len
    this.logger.info(`Deploy Campaign execution finished successfully under DB Version: ${this.dbAdapter.versioner.curDbVersion}.`);
  }

  updateStateContract (instanceName : string, contractName : string, contract : Contract) {
    // TODO: can we improve this?
    (this.state.contracts as IContractState)[instanceName] = contract;
    this.logger.debug(`Data of deployed contract '${contractName}' is added to Campaign state at '${instanceName}'.`);
  }

  async verify () {
    return Object.values(this.state.instances).reduce(
      async (
        acc : Promise<void>,
        missionInstance : BaseDeployMission<C, St>,
      ) => {
        await acc;
        return missionInstance.verify();
      },
      Promise.resolve()
    );
  }

  async monitor () {
    this.logger.info("Pushing contracts to Tenderly...");

    const contracts = await Object.values(this.state.instances).reduce(
      async (
        acc : Promise<Array<ITenderlyContractData>>,
        missionInstance : BaseDeployMission<C, St>,
      ) : Promise<Array<ITenderlyContractData>> => {
        const newAcc = await acc;
        const data = await missionInstance.getMonitoringData();

        return [...newAcc, ...data];
      },
      Promise.resolve([])
    );

    try {
      const response = await this.deployer.tenderlyPush(contracts);
      this.logger.info(
        `Tenderly push finished successfully for Project ${this.config.postDeploy.tenderlyProjectSlug}
        with data: ${JSON.stringify(response, null, "\t")}`
      );
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (e : any) {
      this.logger.error("Tenderly push failed.");
      this.logger.error(e.message);
      this.logger.debug("Continuing...");
    }
  }
}
