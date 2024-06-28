import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";


export interface ITransactionReceipt {
  hash : string;
}

export type TCampaignDataType = bigint
  | string
  | number
  | Array<string>
  | Array<bigint>
  | boolean
  | object;

export interface IBaseDataMap<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key : string] : TCampaignDataType | T | IBaseDataMap<T> | undefined;
}

export interface IAddressable {
  getAddress : () => Promise<string>;
}

export interface IContractV6 {
  getAddress : () => Promise<string>;
  waitForDeployment : () => Promise<IContractV6>;
  deploymentTransaction : () => ITransactionReceipt | null;
  target : string | IAddressable;
  interface : object;
}

export type TLogger = WinstonLogger | Console;

export interface IContractState<C extends IContractV6 = IContractV6> {
  [key : string] : C;
}

export interface IMissionInstances <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> {
  [key : string] : BaseDeployMission<H, S, P, St>;
}

export interface ICampaignState <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<H, S, P, St>>;
  instances : IMissionInstances<H, S, P, St>;
  contracts : St;
}

export interface ICampaignArgs <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<H, S, P, St>>;
  deployer : HardhatDeployer<H, S, P>;
  dbAdapter : MongoDBAdapter;
  logger : TLogger;
  config : IDeployCampaignConfig<S>;
}

export interface IDeployCampaignConfig <Signer> extends IBaseDataMap<Signer> {
  env : string;
  deployAdmin : Signer;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}
