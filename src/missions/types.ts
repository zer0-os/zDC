import { BaseDeployMission } from "./base-deploy-mission";
import { DeployCampaign } from "../campaign/deploy-campaign";
import { IDeployCampaignConfig, TLogger } from "../campaign/types";
import { IHardhatGeneric, IProviderGeneric, ISignerGeneric } from "../deployer/types";


export interface IConfigGeneric {
  [key : string] : unknown;
}

export interface IDeployMissionArgs <
  H extends IHardhatGeneric,
  S extends ISignerGeneric,
  P extends IProviderGeneric,
> {
  campaign : DeployCampaign<H, S, P>;
  logger : TLogger;
  config : IDeployCampaignConfig;
}

export type TDeployMissionCtor = new <
  H extends IHardhatGeneric,
  S extends ISignerGeneric,
  P extends IProviderGeneric,
> (args : IDeployMissionArgs<H, S, P>) => BaseDeployMission<H, S, P>;

export type TDeployArg = string | Array<string> | bigint | IConfigGeneric;

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
