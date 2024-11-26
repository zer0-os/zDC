import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IHardhatBase, ISignerBase, TEnvironment } from "../deployer/types";


export type TSupportedChain = "zchain" | "ethereum";
export interface ISupportedChains {
  z : TSupportedChain;
  eth : TSupportedChain;
}

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

export interface ITransactionResponseBase {
  wait(confirms ?: number, timeout ?: number) : Promise<ITransactionReceipt | null>;
}

export interface IContractV6 {
  getAddress : () => Promise<string>;
  waitForDeployment : () => Promise<IContractV6>;
  deploymentTransaction : () => ITransactionResponseBase | null;
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
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> {
  [key : string] : BaseDeployMission<H, S, C, St>;
}

export interface ICampaignState <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<H, S, C, St>>;
  instances : IMissionInstances<H, S, C, St>;
  contracts : St;
}

export interface ICampaignArgs <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<H, S, C, St>>;
  deployer : HardhatDeployer<H, S>;
  dbAdapter : MongoDBAdapter;
  logger : TLogger;
  config : C;
}

export interface IDeployCampaignConfig <Signer> extends IBaseDataMap<Signer> {
  env : TEnvironment;
  deployAdmin : Signer;
  confirmationsN : number;
  srcChainName : TSupportedChain;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}
