/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
import {
  BaseDeployMission,
  IContractState, IDeployMissionArgs,
  IHardhatBase,
  IProviderBase,
  ISignerBase,
  ProxyKinds,
  TDeployArgs,
} from "../../src";
import { IExecutedCall } from "./hardhat";

// @ts-ignore
export const makeTestMissionProxy = (mission : any) => new Proxy(mission, {
  get: (target, prop) => {
    if (typeof target[prop] === "function") {
      target.called.push(prop);
    }

    return target[prop];
  },
});

export abstract class ATestDeployMission<
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> extends BaseDeployMission<H, S, P, St> {
  called : Array<IExecutedCall> = [];
}

export const makeMissionMock = <
  H extends IHardhatBase,
  S extends ISignerBase,
  P extends IProviderBase,
  St extends IContractState,
> ({
  _contractName,
  _instanceName,
  _isProxy,
  _deployArgs,
  _needsPostDeploy,
  _postDeployCb,
} : {
  _contractName : string;
  _instanceName : string;
  _isProxy : boolean;
  _deployArgs : TDeployArgs;
  _needsPostDeploy : boolean;
  _postDeployCb : () => Promise<void>;
}) => class TestMission extends ATestDeployMission<H, S, P, St> {
  called : Array<IExecutedCall> = [];

  proxyData = {
    isProxy: _isProxy,
    kind: ProxyKinds.uups, // this is not read when `isProxy` is false
  };

  contractName = _contractName;
  instanceName = _instanceName;

  constructor (args : IDeployMissionArgs<H, S, P, St>) {
    super(args);

    return makeTestMissionProxy(this);
  }

  async deployArgs () {
    return _deployArgs;
  }

  async needsPostDeploy () {
    return Promise.resolve(_needsPostDeploy);
  }

  async postDeploy () {
    await _postDeployCb();
  }
};
