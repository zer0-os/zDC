import { INetworkData, TEnvironmentLevels } from "./types";
import { IProxyKinds } from "../missions";


export const EnvironmentLevels : TEnvironmentLevels = {
  dev: "dev",
  test: "test",
  prod: "prod",
};

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

export const ProxyKinds : IProxyKinds = {
  uups: "uups",
  transparent: "transparent",
  beacon: "beacon",
};
