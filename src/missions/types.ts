import { BaseDeployMission } from "./base-deploy-mission";
import { DeployCampaign } from "../campaign/deploy-campaign";
import { IContractState, IDeployCampaignConfig, TCampaignDataType, TLogger } from "../campaign/types";
import { IHardhatBase, ISignerBase } from "../deployer/types";


export interface IDeployMissionArgs <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> {
  campaign : DeployCampaign<H, S, C, St>;
  logger : TLogger;
  config : C;
  dbName ?: string;
}

export type TDeployMissionCtor<
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> = new (args : IDeployMissionArgs<H, S, C, St>) => BaseDeployMission<H, S, C, St>;

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
