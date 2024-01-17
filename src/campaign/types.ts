import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";
import { DeployCampaign } from "./deploy-campaign";

// TODO iso: remove this type if the other one works
// export type ContractV6 = BaseContract & Omit<BaseContract, keyof BaseContract>;

export interface ITransactionReceipt {
  hash : string;
}

export interface IContractV6 {
  getAddress : () => Promise<string>;
  // TODO iso: do we need a better type here??
  waitForDeployment : () => Promise<IContractV6>;
  // TODO iso: add receipt type here !
  deploymentTransaction : () => Promise<ITransactionReceipt>;
}

export type TLogger = WinstonLogger | Console;

export interface IContractState {
  [key : string] : IContractV6;
}

export interface IMissionInstances <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> {
  [key : string] : BaseDeployMission<H, S, P>;
}

export interface ICampaignState <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> {
  missions : Array<TDeployMissionCtor>;
  instances : IMissionInstances<H, S, P>;
  contracts : TZNSContractState;
}

export interface ICampaignArgs <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> {
  missions : Array<TDeployMissionCtor>;
  deployer : HardhatDeployer<H, S, P>;
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
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> (args : ICampaignArgs<H, S, P>) => DeployCampaign<H, S, P>;
