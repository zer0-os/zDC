import { ITenderlyContractData, TDeployArgs, TProxyKind } from "../missions/types";
// TODO iso: possibly use Node's native API POST for Tenderly push so we don't need axios
import axios from "axios";
import { ContractV6 } from "../campaign/types";
import { IHardhatGeneric, ISignerGeneric, IProviderGeneric } from "./types";


export class HardhatDeployer <
  H extends IHardhatGeneric,
  S extends ISignerGeneric,
  P extends IProviderGeneric,
> {
  hre : H;
  signer : S;
  env : string;
  provider ?: P;

  constructor (
    hre : H,
    signer : S,
    env : string,
    provider ?: P,
  ) {
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
  }) : Promise<ContractV6> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const contractFactory = await this.getFactory(contractName);
    const deployment = await this.hre.upgrades.deployProxy(contractFactory, args, {
      kind,
    });

    let receipt;
    if (!this.provider) {
      return deployment.waitForDeployment();
    } else {
      const tx = await deployment.deploymentTransaction();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      receipt = await this.provider.waitForTransaction(tx!.hash, 3);

      return contractFactory.attach(receipt.contractAddress);
    }
  }

  async deployContract (contractName : string, args : TDeployArgs) : Promise<ContractV6> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const contractFactory = await this.getFactory(contractName);
    const deployment = await contractFactory.deploy(...args);

    let receipt;
    if (!this.provider) {
      return deployment.waitForDeployment();
    } else {
      const tx = await deployment.deploymentTransaction();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      receipt = await this.provider.waitForTransaction(tx.hash, 3);

      return contractFactory.attach(receipt.contractAddress);
    }
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
