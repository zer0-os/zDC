/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import {
  IContractArtifact,
  IContractFactoryBase,
  IDeployOpts,
  IHHSubtaskArguments, IUpgradeOpts,
  TDeployArgs,
  THHTaskArguments,
  TProxyKind,
} from "../../src";
import { Contract } from "ethers";


const contractMock = {
  target: "0xcontractAddress",
  getAddress: async () => Promise.resolve("0xcontractAddress"),
  waitForDeployment: async () => Promise.resolve(contractMock),
  deploymentTransaction: () => ({
    hash: "0xhash",
    wait: async () => Promise.resolve({ hash: "0xhash" }),
  }),
  interface: {},
} as Contract;

export const contractFactoryMock = {
  deploy: async () => Promise.resolve(contractMock),
  attach: async () => Promise.resolve(contractMock),
  contractName: "",
} as unknown as IContractFactoryBase;

export interface IExecutedCall {
  methodName : string;
  // @ts-ignore
  args ?: any;
}

export class HardhatMock {
  called : Array<IExecutedCall> = [];

  ethers = {
    getContractFactory: async <F extends IContractFactoryBase>
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (contractName : string, signerOrOptions : any) : Promise<F> => (
      {
        ...contractFactoryMock,
        contractName,
      }
    ) as unknown as Promise<F>,
    provider: {
      getCode: async () => Promise.resolve("0xbytecode"),
    },
  };

  upgrades = {
    deployProxy: async (
      factory : any,
      args : TDeployArgs,
      options : IDeployOpts,
    ) : Promise<Contract> => {
      this.called.push({
        methodName: "deployProxy",
        args: { contractName: factory.contractName, args, kind: options.kind },
      });

      return contractMock as unknown as Promise<Contract>;
    },
    upgradeProxy: async <F extends IContractFactoryBase> (
      proxy : string | Contract,
      Contract : F,
      opts : IUpgradeOpts,
      // TODO: implement properly for tests
    ) : Promise<Contract> => Promise.resolve(contractMock),
    erc1967: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getImplementationAddress: async (address : string) => Promise.resolve("0ximplementationAddress"),
    },
  };

  artifacts = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    readArtifactSync: (contractName : string) => ({
      abi: [],
      bytecode: "0xbytecode",
      deployedBytecode: "0xdeployedBytecode",
      sourceName: "SourceName",
      contractName: "ContractName",
    } as IContractArtifact),
  };

  async run (
    taskIdentifier : string | { scope ?: string; task : string; },
    taskArguments ?: THHTaskArguments,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    subtaskArguments ?: IHHSubtaskArguments
  ) {
    this.called.push({
      methodName: taskIdentifier as string,
      args: taskArguments,
    });
  }
}
