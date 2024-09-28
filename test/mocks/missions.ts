/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, max-classes-per-file */
import {
  BaseDeployMission,
  IContractState, IDeployCampaignConfig, IDeployMissionArgs,
  IHardhatBase,
  ISignerBase,
  ProxyKinds,
  TDeployArgs,
} from "../../src";
import { IExecutedCall } from "./hardhat";

export const testMissions = (
  missionIdentifiers: string[],
  postDeployRun: boolean[]
) => {
  return missionIdentifiers.map((id, idx) =>
    makeMissionMock({
      _contractName: `Contract${id}`,
      _instanceName: `${id}`,
      _deployArgs: [`arg${id}1`, `arg${id}2`],
      _isProxy: id.includes("proxy"),
      _needsPostDeploy: id === missionIdentifiers[2],
      _postDeployCb: async () => {
        postDeployRun[idx] = true;
      },
    })
  );
};

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
  C extends IDeployCampaignConfig<S>,
  St extends IContractState,
> extends BaseDeployMission<H, S, C, St> {
  called : Array<IExecutedCall | string> = [];
}

export const makeMissionMock = <
  H extends IHardhatBase,
  S extends ISignerBase,
  C extends IDeployCampaignConfig<S>,
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
}) => class TestMission extends ATestDeployMission<H, S, C, St> {
  called : Array<IExecutedCall> = [];

  proxyData = {
    isProxy: _isProxy,
    kind: ProxyKinds.uups, // this is not read when `isProxy` is false
  };

  contractName = _contractName;
  instanceName = _instanceName;

  constructor (args : IDeployMissionArgs<H, S, C, St>) {
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
