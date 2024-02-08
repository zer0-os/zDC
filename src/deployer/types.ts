import { IContractV6 } from "../campaign/types";
import { TDeployArgs, TProxyKind } from "../missions/types";


export type THHTaskArguments = unknown;

export interface IHHSubtaskArguments {
  [subtaskName : string] : THHTaskArguments;
}

export interface IContractFactoryBase {
  deploy : (...args : TDeployArgs) => Promise<IContractV6>;
  attach : (address : string) => IContractV6;
}

export interface ISignerBase {
  address : string;
  getAddress ?: () => Promise<string>;
}

export interface ITxReceiptBase {
  contractAddress : string;
}

export interface IProviderBase {
  waitForTransaction : (
    txHash : string,
    confirmations ?: number | undefined,
    timeout ?: number | undefined
  ) => Promise<ITxReceiptBase>;
}

export interface IContractArtifact {
  abi : Array<unknown>;
  bytecode : string;
  deployedBytecode : string;
  sourceName : string;
  contractName : string;
}

export interface IFactoryOpts {
  signer ?: ISignerBase;
  libraries ?: unknown;
}

export type TGetFactoryArgs<
  S extends ISignerBase,
  O extends IFactoryOpts,
> = [
  name : string,
  signerOrOptions ?: S | O,
];

export type TRedeployImplementationOpt = "always" | "never" | "onchange";

export interface IRedeployImplementationOpts {
  always : TRedeployImplementationOpt;
  never : TRedeployImplementationOpt;
  onchange : TRedeployImplementationOpt;
}

export interface IDeployOpts {
  unsafeAllow ?: Array<unknown>;
  unsafeAllowRenames ?: boolean;
  unsafeSkipStorageCheck ?: boolean;
  constructorArgs ?: Array<unknown>;
  timeout ?: number;
  pollingInterval ?: number;
  redeployImplementation ?: TRedeployImplementationOpt;
  txOverrides ?: unknown;
  kind ?: Omit<TProxyKind, "beacon">;
}

export interface IUpgradeOpts extends IDeployOpts {
  call ?: string | { fn : string; args ?: Array<unknown>; };
}

export interface IHardhatBase {
  run : (
    taskIdentifier : string | { scope ?: string; task : string; },
    taskArguments ?: THHTaskArguments,
    subtaskArguments ?: IHHSubtaskArguments
  ) => Promise<void>;
  ethers : {
    getContractFactory : <
      // TODO upg: can we change all these base types to the ones from Ethers?
      F extends IContractFactoryBase,
      S extends ISignerBase,
      O extends IFactoryOpts,
    > (
      ...args : TGetFactoryArgs<S, O>
    ) => Promise<F>;
    provider : {
      getCode : (address : string) => Promise<string>;
    };
  };
  upgrades : {
    deployProxy : <F extends IContractFactoryBase> (
      factory : F,
      args : TDeployArgs,
      options : IDeployOpts,
    ) => Promise<IContractV6>;
    erc1967 : {
      getImplementationAddress : (address : string) => Promise<string>;
    };
    upgradeProxy : <F extends IContractFactoryBase> (
      proxy : string | IContractV6,
      Contract : F,
      opts : IUpgradeOpts,
    ) => Promise<IContractV6>;
  };
  artifacts : {
    readArtifactSync : (contractName : string) => IContractArtifact;
  };
}

export interface IHardhatDeployerArgs<
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
> {
  hre : H;
  signer : S;
  env : string;
  provider ?: P;
}
