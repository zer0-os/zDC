import { BaseDeployMission } from "./base-deploy-mission";
import { DeployCampaign } from "../campaign/deploy-campaign";
import { IContractState, IDeployCampaignConfig, TCampaignDataType, TLogger } from "../campaign/types";


export interface IDeployMissionArgs <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> {
  campaign : DeployCampaign<C, St>;
  logger : TLogger;
  config : C;
  dbName ?: string;
}

export type TDeployMissionCtor<
  C extends IDeployCampaignConfig,
  St extends IContractState,
> = new (args : IDeployMissionArgs<C, St>) => BaseDeployMission<C, St>;

export type TDeployArg = TCampaignDataType;

export type TDeployArgs = Array<TDeployArg>;

export type TProxyKind = "uups" | "transparent" | "beacon" | undefined;

export interface ITenderlyContractData {
  display_name : string;
  address : string;
  network_id : string;
}

export interface IProxyKinds {
  uups : TProxyKind;
  transparent : TProxyKind;
  beacon : TProxyKind;
}

export interface IProxyData {
  isProxy : boolean;
  kind ?: TProxyKind;
}
