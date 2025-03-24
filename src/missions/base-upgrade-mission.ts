import { BaseDeployMission } from "./base-deploy-mission";
import { IContractState, IDeployCampaignConfig } from "../campaign";
import { UpgradeOps } from "./constants";
import { IContractDbData, IDBVersion } from "../db";


export class BaseUpgradeMission <
  C extends IDeployCampaignConfig,
  St extends IContractState,
> extends BaseDeployMission<C, St> {
  async upgrade () {
    this.logger.info(`Upgrading ${this.contractName}...`);

    if (!this.proxyData.isProxy) {
      // eslint-disable-next-line max-len
      throw new Error(`${this.contractName} is not a proxy contract. Cannot upgrade. Check 'proxyData' field in your specific mission class.`);
    }

    const deployedContract = await this.getDeployedFromDB();

    if (!deployedContract) {
      // eslint-disable-next-line max-len
      throw new Error(`No deployed contract with the name ${this.contractName} found in DB. This may signify an error or a bug on the previous stages of the upgrade flow.`);
    }

    const contract = await this.campaign.deployer.upgradeProxy(
      this.contractName,
      deployedContract.address,
      // TODO upg: add the ability to pass upgrade options
      {
        kind: this.proxyData.kind,
      }
    );

    await this.saveToDB(contract);

    this.campaign.updateStateContract(this.instanceName, this.contractName, contract);

    // eslint-disable-next-line max-len
    this.logger.info(`Successfully upgraded ${this.contractName} contract to the newest version at ${await contract.getAddress()}`);
  }

  async needsPostUpgrade () : Promise<boolean> {
    return Promise.resolve(false);
  }

  async postUpgrade () : Promise<void> {
    return Promise.resolve();
  }

  async executeUpgrade () {
    const op = await this.getContractOperation();

    switch (op) {
    case UpgradeOps.deploy:
      await super.execute();
      break;
    case UpgradeOps.copy:
      await this.dbCopy();
      break;
    case UpgradeOps.upgrade:
      await this.upgrade();

      if (await this.needsPostUpgrade()) {
        await this.postUpgrade();
      }
      break;
    case UpgradeOps.keep:
      // TODO upg: do we need any logic here ?
      break;
    default:
      throw new Error(`Deploy operation ${op} is not supported.`);
    }
  }
}
