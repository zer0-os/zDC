import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer/types";
import { DeployCampaign } from "./deploy-campaign";

export const makeCampaignProxy = <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> (campaign : DeployCampaign<H, S, P>) => new Proxy(campaign, {
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
