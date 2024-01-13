import { IContractV6 } from "../campaign/types";
import { TDeployArgs, TProxyKind } from "../missions/types";


export type THHTaskArguments = unknown;

export interface IHHSubtaskArguments {
  [subtaskName : string] : THHTaskArguments;
}

export interface IContractFactoryGeneric {
  deploy : (...args : TDeployArgs) => Promise<IContractV6>;
  attach : (address : string) => IContractV6;
}

export interface ISignerGeneric {
  address : string;
}

export interface ITxReceiptGeneric {
  contractAddress : string;
}

export interface IProviderGeneric {
  waitForTransaction : (
    txHash : string,
    confirmations ?: number | undefined,
    timeout ?: number | undefined
  ) => Promise<ITxReceiptGeneric>;
}

export interface IContractArtifact {
  abi : Array<unknown>;
  bytecode : string;
  deployedBytecode : string;
  sourceName : string;
  contractName : string;
}

export interface IHardhatGeneric {
  run : (
    taskIdentifier : string | { scope ?: string; task : string; },
    taskArguments ?: THHTaskArguments,
    subtaskArguments ?: IHHSubtaskArguments
  ) => Promise<void>;
  ethers : {
    getContractFactory : (
      contractName : string,
      signer : ISignerGeneric
    ) => Promise<IContractFactoryGeneric>;
    provider : {
      getCode : (address : string) => Promise<string>;
    };
  };
  upgrades : {
    deployProxy : (
      factory : IContractFactoryGeneric,
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
