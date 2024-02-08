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
      // TODO upg: do we need this if OZ-upgrades already checks the bytecode ?
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
