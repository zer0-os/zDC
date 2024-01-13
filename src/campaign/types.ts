import { BaseDeployMission } from "../missions/base-deploy-mission";
import { BaseContract } from "ethers";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IHardhatGeneric, IProviderGeneric, ISignerGeneric } from "../deployer/types";
import { DeployCampaign } from "./deploy-campaign";


export type ContractV6 = BaseContract & Omit<BaseContract, keyof BaseContract>;

export type TLogger = WinstonLogger | Console;

export interface IContractState {
  [key : string] : ContractV6;
}

export interface IMissionInstances {
  [key : string] : BaseDeployMission;
}

export interface ICampaignState {
  missions : Array<TDeployMissionCtor>;
  instances : IMissionInstances;
  contracts : TZNSContractState;
}

export interface ICampaignArgs {
  missions : Array<TDeployMissionCtor>;
  deployer : HardhatDeployer;
  dbAdapter : MongoDBAdapter;
  logger : TLogger;
  // TODO iso: figure out more general type here
  config : IDeployCampaignConfig;
}

// TODO iso: figure out more general type here or remove this if works out of the box
export type TZNSContractState = IContractState;

export interface IDeployCampaignConfig {
  // TODO iso: figure out more general type here
  [key : string] : any;
  env : string;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}

export type IDeployCampaignCtor = new <
  H extends IHardhatGeneric,
  S extends ISignerGeneric,
  P extends IProviderGeneric,
> (args : ICampaignArgs) => DeployCampaign<H, S, P>;
