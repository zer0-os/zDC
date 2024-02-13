import { IProviderBase } from "../deployer/types";
import { DeployCampaign } from "./deploy-campaign";
import { IContractState } from "./types";

export const makeCampaignProxy = <
  P extends IProviderBase,
  St extends IContractState,
> (campaign : DeployCampaign<P, St>) => new Proxy(campaign, {
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
