import { ITenderlyContractData, TDeployArgs, TProxyKind } from "../missions/types";
import axios from "axios";
import { IContractV6, ITransactionResponseBase } from "../campaign/types";
import { IHardhatBase, ISignerBase, IHardhatDeployerArgs } from "./types";
import { EnvironmentLevels } from "./constants";


export class HardhatDeployer <
  H extends IHardhatBase,
  S extends ISignerBase
> {
  hre : H;
  signer : S;
  env : string;
  confirmationsN : number;

  constructor ({
    hre,
    signer,
    env,
    confirmationsN,
  } : IHardhatDeployerArgs<H, S>) {
    this.hre = hre;
    this.signer = signer;
    this.env = env;
    this.confirmationsN = confirmationsN;
  }

  async awaitConfirmation (tx : ITransactionResponseBase | null) {
    if (this.env !== EnvironmentLevels.dev) {
      if (tx) await tx.wait(this.confirmationsN);
    }
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const contractFactory = await this.getFactory(contractName);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const contract = await this.hre.upgrades!.deployProxy(contractFactory, args, {
      kind,
    });

    const deployTx = contract.deploymentTransaction();

    await this.awaitConfirmation(deployTx);

    return contract;
  }

  async deployContract (contractName : string, args : TDeployArgs) : Promise<IContractV6> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const contractFactory = await this.getFactory(contractName);
    const contract = await contractFactory.deploy(...args);

    const deployTx = contract.deploymentTransaction();

    await this.awaitConfirmation(deployTx);

    return contract;
  }

  getContractArtifact (contractName : string) {
    return this.hre.artifacts.readArtifactSync(contractName);
  }

  async getProxyImplAddress (proxyContract : string) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.hre.upgrades!.erc1967.getImplementationAddress(proxyContract);
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
