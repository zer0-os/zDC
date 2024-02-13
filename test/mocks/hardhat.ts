/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import {
  IContractArtifact,
  IContractFactoryBase,
  IContractV6, IDeployOpts,
  IHardhatBase, IHHSubtaskArguments, ISignerBase, IUpgradeOpts,
  TDeployArgs,
  THHTaskArguments,
  TProxyKind,
} from "../../src";


const contractMock = {
  target: "0xcontractAddress",
  getAddress: async () => Promise.resolve("0xcontractAddress"),
  waitForDeployment: async () => Promise.resolve(contractMock),
  deploymentTransaction: () => ({
    hash: "0xhash",
  }),
  interface: {},
} as IContractV6;

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

export class HardhatMock implements IHardhatBase {
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
    deployProxy: async <F extends IContractFactoryBase> (
      factory : F,
      args : TDeployArgs,
      options : IDeployOpts,
    ) : Promise<IContractV6> => {
      this.called.push({
        methodName: "deployProxy",
        args: { contractName: factory.contractName, args, kind: options.kind },
      });

      return contractMock as unknown as Promise<IContractV6>;
    },
    upgradeProxy: async <F extends IContractFactoryBase> (
      proxy : string | IContractV6,
      Contract : F,
      opts : IUpgradeOpts,
      // TODO: implement properly for tests
    ) : Promise<IContractV6> => Promise.resolve(contractMock),
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
