import { BaseDeployMission } from "./base-deploy-mission";
import { DeployCampaign } from "../campaign/deploy-campaign";
import { IContractState, IDeployCampaignConfig, TCampaignDataType, TLogger } from "../campaign/types";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";


export interface IDeployMissionArgs <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> {
  campaign : DeployCampaign<H, S, P, St>;
  logger : TLogger;
  config : IDeployCampaignConfig<S>;
}

export type TDeployMissionCtor<
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> = new (args : IDeployMissionArgs<H, S, P, St>) => BaseDeployMission<H, S, P, St>;

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
