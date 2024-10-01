/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import {
  IContractArtifact,
  IContractFactoryBase,
  IContractV6,
  IHardhatBase,
  IHHSubtaskArguments,
  TDeployArgs,
  THHTaskArguments,
  TProxyKind,
} from "../../src";


const contractMock = (name : string) => ({
  target: `0xcontractAddress_${name}`,
  getAddress: async () => Promise.resolve(`0xcontractAddress_${name}`),
  waitForDeployment: async () => Promise.resolve(contractMock(name)),
  deploymentTransaction: () => ({
    hash: `0xhash_${name}`,
  }),
  interface: {},
} as unknown as IContractV6);

export const contractFactoryMock = (name : string) => ({
  deploy: async () => Promise.resolve(contractMock(name)),
  attach: async () => Promise.resolve(contractMock(name)),
  contractName: name,
} as unknown as IContractFactoryBase);

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
        ...contractFactoryMock(contractName),
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
      options : { kind : TProxyKind; }
    ) : Promise<IContractV6> => {
      this.called.push({
        methodName: "deployProxy",
        args: { contractName: factory.contractName, args, kind: options.kind },
      });

      return contractMock(factory.contractName) as unknown as Promise<IContractV6>;
    },
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
