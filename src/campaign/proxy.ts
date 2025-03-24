import { DeployCampaign } from "./deploy-campaign";
import { IContractState, IDeployCampaignConfig } from "./types";

export const makeCampaignProxy = <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> (campaign : DeployCampaign<C, St>) => new Proxy(campaign, {
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
