import { TDeployArgs } from "../missions/types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatEthersHelpers } from "@nomicfoundation/hardhat-ethers/types";
import { DefenderHardhatUpgrades, HardhatUpgrades } from "@openzeppelin/hardhat-upgrades";
import { Contract } from "ethers";


// TODO upg: remove all unnecesary types!
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

export type TSigner = SignerWithAddress;

export interface IProviderBase {
  waitForTransaction : (
    txHash : string,
    confirmations ?: number | undefined,
    timeout ?: number | undefined
  ) => Promise<ITxReceiptBase>;
}

export interface ITxReceiptBase {
  contractAddress : string;
}

export interface IContractArtifact {
  abi : Array<unknown>;
  bytecode : string;
  deployedBytecode : string;
  sourceName : string;
  contractName : string;
}

export interface IFactoryOpts {
  signer ?: TSigner;
  libraries ?: unknown;
}

export type TGetFactoryArgs<
  O extends IFactoryOpts,
> = [
  name : string,
  signerOrOptions ?: TSigner | O,
];

export interface IHardhatDeployerArgs<
  P extends IProviderBase,
> {
  hre : HardhatExtended;
  signer : TSigner;
  env : string;
  provider ?: P;
}
