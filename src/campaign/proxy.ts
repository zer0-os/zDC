import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";
import { DeployCampaign } from "./deploy-campaign";
import { IContractState } from "./types";

export const makeCampaignProxy = <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> (campaign : DeployCampaign<H, S, P, St>) => new Proxy(campaign, {
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
