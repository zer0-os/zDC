import { ITenderlyContractData, TDeployArgs } from "../missions/types";
import axios from "axios";
import { IProviderBase, IHardhatDeployerArgs, TSigner, HardhatExtended } from "./types";
import { Contract, ContractFactory } from "ethers";
import { UpgradeProxyOptions } from "@openzeppelin/hardhat-upgrades/dist/utils";


// TODO upg: try and remove this general provider type if possible
export class HardhatDeployer <P extends IProviderBase> {
  hre : HardhatExtended;
  signer : TSigner;
  env : string;
  provider ?: P;

  constructor ({
    hre,
    signer,
    env,
    provider,
  } : IHardhatDeployerArgs<P>) {
    this.hre = hre;
    this.signer = signer;
    this.env = env;
    this.provider = provider;
  }

  async getFactory (contractName : string, signer ?: TSigner) {
    const attachedSigner = signer ?? this.signer;
    return this.hre.ethers.getContractFactory(contractName, attachedSigner);
  }

  async getContractObject (contractName : string, address : string) {
    const factory = await this.getFactory(contractName);

    return factory.attach(address);
  }

  async deployProxy ({
    contractName,
    args,
    opts,
  } : {
    contractName : string;
    args : TDeployArgs;
    opts : UpgradeProxyOptions;
  }) : Promise<Contract> {
    const contractFactory = await this.getFactory(contractName);
    const deployment = await this.hre.upgrades.deployProxy(contractFactory, args, opts);

    return this.awaitDeployment(contractName, deployment, contractFactory);
  }

  async deployContract (contractName : string, args : TDeployArgs) : Promise<Contract> {
    const contractFactory = await this.getFactory(contractName);
    const deployment = await contractFactory.deploy(...args);

    return this.awaitDeployment(contractName, deployment, contractFactory);
  }

  async upgradeProxy (
    contractName : string,
    contractAddress : string,
    upgradeOpts : UpgradeProxyOptions,
  ) {
    const contractFactory = await this.getFactory(contractName);

    const deployment = await this.hre.upgrades.upgradeProxy(
      contractAddress,
      contractFactory,
      upgradeOpts,
    );

    // TODO upg: is this going to be the same flow for upgrade as for deploy?
    return this.awaitDeployment(contractName, deployment, contractFactory);
  }

  async awaitDeployment (
    contractName : string,
    deployment : Contract,
    factory : ContractFactory,
  ) : Promise<Contract> {
    if (!this.provider) {
      return deployment.waitForDeployment();
    }

    const tx = deployment.deploymentTransaction();

    if (!tx) {
      throw new Error(`No deployment transaction returned for ${contractName}!`);
    }

    const receipt = await this.provider.waitForTransaction(tx.hash, 3);

    return factory.attach(receipt.contractAddress) as Contract;
  }

  getContractArtifact (contractName : string) {
    return this.hre.artifacts.readArtifactSync(contractName);
  }

  async getProxyImplAddress (proxyContract : string) {
    return this.hre.upgrades.erc1967.getImplementationAddress(proxyContract);
  }

  async getBytecodeFromChain (address : string) {
    return this.hre.ethers.provider.getCode(address);
  }

  async tenderlyPush (contracts : Array<ITenderlyContractData>) {
    const inst = axios.create({
      baseURL: "https://api.tenderly.co/",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": process.env.TENDERLY_ACCESS_KEY,
      },
    });

    const { data } = await inst.post(
      `api/v2/accounts/${process.env.TENDERLY_ACCOUNT_ID}/projects/${process.env.TENDERLY_PROJECT_SLUG}/contracts`,
      {
        contracts,
      }
    );

    return data;
  }

  async etherscanVerify ({
    address,
    ctorArgs,
  } : {
    address : string;
    ctorArgs ?: TDeployArgs;
  }) {
    return this.hre.run("verify:verify", {
      address,
      // this should only be used for non-proxied contracts
      // or proxy impls that have actual constructors
      constructorArguments: ctorArgs,
    });
  }
}
