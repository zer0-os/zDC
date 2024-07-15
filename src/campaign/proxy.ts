import { IHardhatBase, ISignerBase } from "../deployer/types";
import { DeployCampaign } from "./deploy-campaign";
import { IContractState, IDeployCampaignConfig } from "./types";

export const makeCampaignProxy = <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> (campaign : DeployCampaign<H, S, C, St>) => new Proxy(campaign, {
  get : (target, prop) => {
    if (typeof prop === "string") {
      if (!!target.state.contracts[prop]) {
        return target.state.contracts[prop];
      }

      if (!!target[prop]) {
        return target[prop];
      }
    }
  },
});
