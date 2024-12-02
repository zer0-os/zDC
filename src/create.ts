import { getLogger } from "./logger/create-logger";
import { HardhatDeployer, IHardhatBase, ISignerBase } from "./deployer";
import { DeployCampaign, IContractState, IDeployCampaignConfig, TLogger } from "./campaign";
import { getMongoAdapter, MongoDBAdapter } from "./db";
import { TDeployMissionCtor } from "./missions";


export const createDeployCampaign = async <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> ({
  hre,
  config,
  missions,
  deployer,
  logger,
  dbAdapter,
  dbUri,
  dbName,
  dbVersion,
  archiveDb,
  clientOpts,
  contractsVersion,
} : {
  hre : H;
  config : C;
  missions : Array<TDeployMissionCtor<H, S, C, St>>;
  deployer ?: HardhatDeployer<H, S>;
  logger ?: TLogger;
  dbAdapter ?: MongoDBAdapter;
  dbUri ?: string;
  dbName ?: string;
  dbVersion ?: string;
  archiveDb ?: boolean;
  clientOpts ?: Record<string, unknown>;
  contractsVersion ?: string;
}) => {
  if (!logger) logger = getLogger();

  if (!deployer) {
    deployer = new HardhatDeployer({
      hre,
      signer: config.deployAdmin,
      env: config.env,
      confirmationsN: config.confirmationsN,
    });
  }

  if (!dbAdapter) dbAdapter = await getMongoAdapter({
    logger,
    contractsVersion,
    dbUri,
    dbName,
    dbVersion,
    archiveDb,
    clientOpts,
  });

  return new DeployCampaign<H, S, C, St>({
    missions,
    deployer,
    dbAdapter,
    logger,
    config,
  });
};
