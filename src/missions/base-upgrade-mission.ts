import { BaseDeployMission } from "./base-deploy-mission";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer";
import { IContractState } from "../campaign";


export class BaseUpgradeMission <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> extends BaseDeployMission<H, S, P, St> {
  async stateOfDeployment () {
    const newContract = await this.getLatestFromDB();
    const deployedContract = await this.getDeployedFromDB();

    // checking this first to know if this contract has been deployed previously
    // if not - we just deploy the new one
    if (!deployedContract) {
      return "deployNew";
    }

    // if deployedContract exists, but newContract does not,
    // we need to compare them
    if (!newContract) {
      // check if the current compiled contract is the same as the one deployed
      const sameCode = compareBytecode();

      // the same - just copy DB data over to the new version
      if (sameCode) {
        return "copyToNewDB";
      // different - we need to upgrade
      } else {
        return "upgrade";
      }
    // if both of them exist and their addresses are the same (proxies),
    // we don't need to do anything
    }

    if (newContract.address === deployedContract.address) {
      return "noChange";
    } else {
      throw new Error("Unknown state of deployment.");
    }
  }

  async needsUpgrade () : Promise<boolean> {}

  async upgrade () : Promise<void> {
    throw new Error("Not implemented");
  }

  async needsPostUpgrade () : Promise<boolean> {
    throw new Error("Not implemented");
  }

  async postUpgrade () : Promise<void> {
    throw new Error("Not implemented");
  }

  async execute () {
    if (!this.config.upgrade) {
      await super.execute();
    }

    const state = await this.stateOfDeployment();

    switch (state) {
    case "deployNew":
      await super.execute();
      break;
    case "copyToNewDB":
      await this.dbCopy();
      break;
    case "upgrade":
      await this.upgrade();
      break;
    case "noChange":
      break;
    default:
      throw new Error("Unknown state of deployment.");
    }
  }
}
