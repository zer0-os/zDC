import { BaseDeployMission } from "./base-deploy-mission";
import { IProviderBase } from "../deployer";
import { IContractState } from "../campaign";
import { UpgradeOps } from "./constants";
import { IContractDbData } from "../db";


export class BaseUpgradeMission <
  P extends IProviderBase,
  St extends IContractState,
> extends BaseDeployMission<P, St> {
  async getUpgradeOperation () {
    const newContract = await this.getLatestFromDB();
    const deployedContract = await this.getDeployedFromDB();

    // checking this first to know if this contract has been deployed previously
    // if not - we just deploy the new one
    if (!deployedContract) {
      return UpgradeOps.deploy;
    }

    // if deployedContract is in DB, but newContract is not in DB yet
    // we need to compare them
    if (!newContract) {
      // TODO upg: MAKE SURE THIS WORKS PROPERLY IN THE UPGRADES PACKAGE
      //  AND THE CONTRACT IS NOT DEPLOYED IN THE UPGRADE FLOW IF BYTECODES ARE THE SAME !!!
      //  IF IT DOESN'T, WE NEED OUR OWN WAY TO COMPARE BYTECODES
      return UpgradeOps.upgrade;

      // TODO upg: possibly add a check for the RedeployImplementationOpt set for each mission
      //  as a prop akin to `proxyData`
      //  some contracts never need to be redeployed, some may always need redeploy and most are `onchange`
      //  this can be set by default in this mission and overriden by child missions
    }

    // if both of them exist and their addresses are the same (proxies),
    // we don't do anything
    if (newContract.address === deployedContract.address) {
      return UpgradeOps.keep;
    } else {
      throw new Error("Unknown state of deployment.");
    }
  }

  // TODO upg: this is currently NOT used. remove it if it's not needed
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
      return super.execute();
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
