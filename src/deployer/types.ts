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

export type TGetFactoryArgsOne = [
  name : string,
  signerOrOptions ?: ISignerBase | IFactoryOpts
];

export type TGetFactoryArgsTwo = [
  abi : Array<unknown>,
  bytecode : string,
  signer ?: ISignerBase
];

export type TGetFactoryArgs = TGetFactoryArgsOne | TGetFactoryArgsTwo;

export interface IHardhatBase {
  run : (
    taskIdentifier : string | { scope ?: string; task : string; },
    taskArguments ?: THHTaskArguments,
    subtaskArguments ?: IHHSubtaskArguments
  ) => Promise<void>;
  ethers : {
    getContractFactory : (
      ...args : TGetFactoryArgsOne
    ) => Promise<IContractFactoryBase>;
    provider : {
      getCode : (address : string) => Promise<string>;
    };
  };
  upgrades : {
    deployProxy : (
      factory : IContractFactoryBase,
      args : TDeployArgs,
      options : { kind : TProxyKind; }
    ) => Promise<IContractV6>;
    erc1967 : {
      getImplementationAddress : (address : string) => Promise<string>;
    };
  };
  artifacts : {
    // TODO iso: figure out typing for ABI return
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
