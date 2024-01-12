import { BaseDeployMission } from "../missions/base-deploy-mission";
import { BaseContract } from "ethers";
import { TDeployMissionCtor } from "../missions/types";
import { HardhatDeployer } from "../deployer/hardhat-deployer";
import { Logger as WinstonLogger } from "winston";
import { MongoDBAdapter } from "../db/mongo-adapter/mongo-adapter";
import { IGeneralConfig } from "../types";

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
  config : IGeneralConfig;
}

// TODO iso: figure out more general type here or remove this if works out of the box
export type TZNSContractState = IContractState;
