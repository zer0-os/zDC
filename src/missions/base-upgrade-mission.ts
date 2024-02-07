import { BaseDeployMission } from "./base-deploy-mission";
import { IHardhatBase, IProviderBase, ISignerBase } from "../deployer";
import { IContractState } from "../campaign";
import { UpgradeOps } from "./constants";
import { IContractDbData } from "../db";


export class BaseUpgradeMission <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> extends BaseDeployMission<H, S, P, St> {
  async getUpgradeOperation () {
    const newContract = await this.getDeployedFromDB();
    const deployedContract = await this.getLatestFromDB();

    // checking this first to know if this contract has been deployed previously
    // if not - we just deploy the new one
    if (!deployedContract) {
      return UpgradeOps.deploy;
    }

    // if deployedContract exists, but newContract does not,
    // we need to compare them
    if (!newContract) {
      // check if the current compiled contract is the same as the one deployed
      const sameCode = compareBytecode();

      // the same - just copy DB data over to the new version
      if (sameCode) {
        return UpgradeOps.copy;
      // different - we need to upgrade
      } else {
        return UpgradeOps.upgrade;
      }
    }

    // if both of them exist and their addresses are the same (proxies),
    // we don't do anything
    if (newContract.address === deployedContract.address) {
      return UpgradeOps.keep;
    } else {
      throw new Error("Unknown state of deployment.");
    }
  }

  async dbCopy () {
    const deployedContract = await this.getDeployedFromDB();
    delete deployedContract?.version;
    await this.campaign.dbAdapter.writeContract(this.contractName, (deployedContract as IContractDbData));
    this.logger.debug(`${this.contractName} data is copied to the newest version of the DB...`);
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

    const op = await this.getUpgradeOperation();

    switch (op) {
    case UpgradeOps.deploy:
      await super.execute();
      break;
    case UpgradeOps.copy:
      await this.dbCopy();
      break;
    case UpgradeOps.upgrade:
      await this.upgrade();
      break;
    case UpgradeOps.keep:
      break;
    default:
      throw new Error("Unknown state of deployment.");
    }
  }
}
