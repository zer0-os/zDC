import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IProviderBase, TSigner } from "../deployer/types";
import { ContractInterface, BaseContract } from "ethers";


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
  [key : string] : TCampaignDataType | TSigner;
}

export interface IAddressable {
  getAddress : () => Promise<string>;
}

export type TLogger = WinstonLogger | Console;

export type TGeneralContract = BaseContract & Omit<ContractInterface, keyof BaseContract>;

export interface IContractState {
  [name : string] : BaseContract;
}

export interface IMissionInstances <
  P extends IProviderBase,
  St extends IContractState,
> {
  [key : string] : BaseDeployMission<P, St>;
}

export interface ICampaignState <
  P extends IProviderBase,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<P, St>>;
  instances : IMissionInstances<P, St>;
  contracts : St;
}

export interface ICampaignArgs <
  P extends IProviderBase,
  St extends IContractState,
> {
  missions : Array<TDeployMissionCtor<P, St>>;
  deployer : HardhatDeployer<P>;
  dbAdapter : MongoDBAdapter;
  logger : TLogger;
  config : IDeployCampaignConfig;
}

export interface IDeployCampaignConfig extends IBaseDataMap {
  env : string;
  upgrade : boolean;
  deployAdmin : TSigner;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}
