import { ITenderlyContractData, TDeployArgs } from "../missions/types";
import axios from "axios";
import { IHardhatDeployerArgs, TSigner, HardhatExtended } from "./types";
import { Contract, ContractFactory } from "ethers";
import { UpgradeProxyOptions } from "@openzeppelin/hardhat-upgrades/dist/utils";


export class HardhatDeployer {
  hre : HardhatExtended;
  signer : TSigner;
  env : string;

  constructor ({
    hre,
    signer,
    env,
  } : IHardhatDeployerArgs) {
    this.hre = hre;
    this.signer = signer;
    this.env = env;
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

    return deployment.waitForDeployment();
  }

  async deployContract (contractName : string, args : TDeployArgs) : Promise<Contract> {
    const contractFactory = await this.getFactory(contractName);
    const deployment = await contractFactory.deploy(...args);

    return deployment.waitForDeployment();
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

  // TODO upg: remove this function if not needed!
  async awaitDeployment (
    contractName : string,
    deployment : Contract,
    factory : ContractFactory,
  ) : Promise<Contract> {
    return deployment.waitForDeployment();
  }

  getContractArtifact (contractName : string) {
    return this.hre.artifacts.readArtifactSync(contractName);
  }

  async getProxyImplAddress (proxyContract : string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
