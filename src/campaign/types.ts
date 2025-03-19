import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IProviderBase, TSigner, TEnvironment } from "../deployer/types";
import { ContractInterface, BaseContract } from "ethers";


export type TSupportedChain = "zchain" | "ethereum";
export interface ISupportedChains {
  z : TSupportedChain;
  eth : TSupportedChain;
}

export interface IDeployCampaignConfig extends IBaseDataMap {
  env : TEnvironment;
  upgrade : boolean;
  deployAdmin : TSigner;
  confirmationsN : number;
  srcChainName : TSupportedChain;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
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

export interface IBaseDataMap {
  [key : string] : TCampaignDataType | TSigner | undefined;
}

export interface IAddressable {
  getAddress : () => Promise<string>;
}

export type TLogger = WinstonLogger | Console;

export interface ITransactionResponseBase {
  wait(confirms ?: number, timeout ?: number) : Promise<ITransactionReceipt | null>;
}

export type TGeneralContract = BaseContract & Omit<ContractInterface, keyof BaseContract>;

export interface IContractState {
  [name : string] : BaseContract;
}

export interface IMissionInstances <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> {
  [key : string] : BaseDeployMission<C, St>;
}

export interface ICampaignState <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<C, St>>;
  instances : IMissionInstances<C, St>;
  contracts : St;
}

export interface ICampaignArgs <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<C, St>>;
  deployer : HardhatDeployer;
  dbAdapter : MongoDBAdapter;
  logger : TLogger;
  config : C;
}
