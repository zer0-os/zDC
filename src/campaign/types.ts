import { BaseDeployMission } from "../missions/base-deploy-mission";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";


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
  [key : string] : TCampaignDataType | SignerWithAddress;
}

export interface IAddressable {
  getAddress : () => Promise<string>;
}

export type TLogger = WinstonLogger | Console;

export interface IContractState<C extends Contract = Contract> {
  [key : string] : C;
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
  deployAdmin : SignerWithAddress;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}
