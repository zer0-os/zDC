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

export type TEnvironment = "dev" | "test" | "prod";
export type TEnvironmentLevels = {
  [key in TEnvironment] : string;
};

export type INetworkData = {
  [env in TEnvironment] : {
    name : string;
    id : string;
  };
};

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

export type TRedeployImplementationOpt = "always" | "never" | "onchange";

export interface IRedeployImplementationOpts {
  always : TRedeployImplementationOpt;
  never : TRedeployImplementationOpt;
  onchange : TRedeployImplementationOpt;
}

export interface IHardhatDeployerArgs {
  hre : HardhatExtended;
  signer : TSigner;
  env : string;
  confirmationsN : number;
}
