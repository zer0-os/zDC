import { TDeployArgs, TProxyKind } from "../missions/types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";
import { DefenderHardhatUpgrades, HardhatUpgrades } from "@openzeppelin/hardhat-upgrades";
import { Contract } from "ethers";


export interface HardhatExtensions {
  ethers : HardhatEthersHelpers;
  upgrades : HardhatUpgrades | DefenderHardhatUpgrades;
}

export type HardhatExtended = HardhatRuntimeEnvironment & HardhatExtensions;

export type THHTaskArguments = unknown;

export interface IHHSubtaskArguments {
  [subtaskName : string] : THHTaskArguments;
}

export interface IContractFactoryBase {
  deploy : (...args : TDeployArgs) => Promise<Contract>;
  attach : (address : string) => Contract;
}

export interface ISignerBase {
  address : string;
  getAddress ?: () => Promise<string>;
}

export type TSigner = SignerWithAddress;

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

// TODO upg: remove all unnecesary types!
export interface IHardhatBase {
  run : (
    taskIdentifier : string | { scope ?: string; task : string; },
    taskArguments ?: THHTaskArguments,
    subtaskArguments ?: IHHSubtaskArguments
  ) => Promise<void>;
  ethers : {
    getContractFactory : <
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
      options : { kind : TProxyKind; }
    ) => Promise<Contract>;
    erc1967 : {
      getImplementationAddress : (address : string) => Promise<string>;
    };
  };
  artifacts : {
    readArtifactSync : (contractName : string) => IContractArtifact;
  };
}

export interface IHardhatDeployerArgs<
  P extends IProviderBase,
> {
  hre : HardhatExtended;
  signer : TSigner;
  env : string;
  provider ?: P;
}
