import { ITenderlyContractData, TDeployArgs, TProxyKind } from "../missions/types";
import axios from "axios";
import { IContractV6 } from "../campaign/types";
import {
  IHardhatBase,
  ISignerBase,
  IProviderBase,
  IHardhatDeployerArgs,
  IUpgradeOpts,
  IContractFactoryBase,
} from "./types";


export class HardhatDeployer <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> {
  hre : H;
  signer : S;
  env : string;
  provider ?: P;

  constructor ({
    hre,
    signer,
    env,
    provider,
  } : IHardhatDeployerArgs<H, S, P>) {
    this.hre = hre;
    this.signer = signer;
    this.env = env;
    this.provider = provider;
  }

  async getFactory (contractName : string, signer ?: S) {
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
    kind,
  } : {
    contractName : string;
    args : TDeployArgs;
    kind : TProxyKind;
  }) : Promise<IContractV6> {
    const contractFactory = await this.getFactory(contractName);
    const deployment = await this.hre.upgrades.deployProxy(contractFactory, args, {
      kind,
    });

    return this.awaitDeployment(contractName, deployment, contractFactory);
  }

  async deployContract (contractName : string, args : TDeployArgs) : Promise<IContractV6> {
    const contractFactory = await this.getFactory(contractName);
    const deployment = await contractFactory.deploy(...args);

    return this.awaitDeployment(contractName, deployment, contractFactory);
  }

  async upgradeProxy (
    contractName : string,
    contractAddress : string,
    upgradeOpts : IUpgradeOpts,
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
    deployment : IContractV6,
    factory : IContractFactoryBase,
  ) {
    if (!this.provider) {
      return deployment.waitForDeployment();
    }

    const tx = deployment.deploymentTransaction();

    if (!tx) {
      throw new Error(`No deployment transaction returned for ${contractName}!`);
    }

    const receipt = await this.provider.waitForTransaction(tx.hash, 3);

    return factory.attach(receipt.contractAddress);
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
