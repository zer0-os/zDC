import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";

// TODO iso: remove this type if the other one works
// export type ContractV6 = BaseContract & Omit<BaseContract, keyof BaseContract>;

export interface ITransactionReceipt {
  hash : string;
}

export interface IGenericMap<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key : string] : bigint | string | number | boolean | object | T | IGenericMap<T>;
}

export interface IAddressable {
  getAddress : () => Promise<string>;
}

export interface IContractV6 {
  getAddress : () => Promise<string>;
  // TODO iso: do we need a better type here??
  waitForDeployment : () => Promise<IContractV6>;
  // TODO iso: add receipt type here !
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
  missions : Array<TDeployMissionCtor>;
  instances : IMissionInstances<H, S, P, St>;
  contracts : St;
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
  config : IDeployCampaignConfig<S>;
}

export interface IDeployCampaignConfig <Signer> extends IGenericMap<Signer> {
  env : string;
  deployAdmin : Signer;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}
