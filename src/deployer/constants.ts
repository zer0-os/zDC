import { IRedeployImplementationOpts, TRedeployImplementationOpt } from "./types";
import { IProxyKinds } from "../missions";

export interface INetworkData {
  [env : string] : {
    name : string;
    id : string;
  };
}

export const NetworkData : INetworkData = {
  test: {
    name: "sepolia",
    id: "11155111",
  },
  prod: {
    name: "mainnet",
    id: "1",
  },
  dev: {
    name: "hardhat",
    id: "31337",
  },
};

export const RedeployImplementationOpts : IRedeployImplementationOpts = {
  always: "always",
  never: "never",
  onchange: "onchange",
};

export const ProxyKinds : IProxyKinds = {
  uups: "uups",
  transparent: "transparent",
  beacon: "beacon",
};