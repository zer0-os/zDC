// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
import { Db, DbOptions, MongoClient, MongoClientOptions } from "mongodb";
import assert from "assert";
import {
  DBVersioner, DeployCampaign,
  HardhatDeployer,
  IContractState,
  IProviderBase,
  MongoDBAdapter,
  TLogger,
} from "../../src";
import { ATestDeployMission, makeMissionMock } from "../mocks/missions";
import { HardhatMock } from "../mocks/hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";


describe("Deploy Campaign Smoke Test", () => {
  let campaign : DeployCampaign<IProviderBase, IContractState>;
  let missionIdentifiers : Array<string>;
  let hardhatMock : HardhatMock;
  let config : any;
  let loggerMessages : Array<string>;

  before(async () => {
    config = {
      env: "prod",
      deployAdmin: {
        address: "0xdeployAdminAddress",
        getAddress: async () => Promise.resolve("0xdeployAdminAddress"),
      },
      postDeploy: {
        tenderlyProjectSlug: "tenderlyProject",
        monitorContracts: true,
        verifyContracts: true,
      },
    };

    loggerMessages = [];

    const loggerMock = {
      info: (msg : string) => {
        loggerMessages.push(msg);
      },
      error: () => {},
      debug: () => {},
      log: () => {},
    } as unknown as TLogger;

    hardhatMock = new HardhatMock();

    const providerMock = {
      waitForTransaction: async (
        txHash : string,
        confirmations ?: number | undefined,
        timeout ?: number | undefined
      ) => Promise.resolve({
        contractAddress: "0xcontractAddress",
      }),
    };

    const signerMock = {
      getAddress: async () => Promise.resolve("0xsignerAddress"),
      address: "0xsignerAddress",
    };

    const deployer = new HardhatDeployer({
      hre: hardhatMock,
      signer: signerMock,
      env: "prod",
      provider: providerMock,
    });

    const collectionMock = {
      insertOne: async () => Promise.resolve(),
      findOne: async (args : any) => {
        if (args.type) {
          return {
            dbVersion: "109381236293746234",
          };
        }
      },
      updateOne: async () => Promise.resolve(),
      deleteMany: async () => Promise.resolve(),
      deleteOne: async () => Promise.resolve(),
    };

    const dbMock = {
      collection: () => (collectionMock),
    };

    class MongoClientMock extends MongoClient {
      constructor (dbUri : string, clientOpts : MongoClientOptions) {
        super(dbUri, clientOpts);
      }

      async connect () {
        return Promise.resolve(this);
      }

      db (dbName ?: string | undefined, options ?: DbOptions | undefined) {
        return dbMock as unknown as Db;
      }

      async close (force ?: boolean) {
        await Promise.resolve();
      }
    }

    const contractsVersion = "1.7.9";
    const dbVersion = "109381236293746234";

    const mongoAdapterMock = new MongoDBAdapter({
      logger: loggerMock,
      dbUri: "mongodb://mockedMongo",
      dbName: "TestDatabase",
      mongoClientClass: MongoClientMock,
      versionerClass: DBVersioner,
      dbVersion,
      contractsVersion,
    });

    await mongoAdapterMock.initialize(dbVersion);

    missionIdentifiers = [
      "noProxy",
      "proxyNoPost",
      "proxyPost",
    ];

    const postDeployRun = [
      false,
      false,
      false,
    ];

    const testMissions = missionIdentifiers.map(
      (id, idx) => makeMissionMock({
        _contractName: `Contract${id}`,
        _instanceName: `${id}`,
        _deployArgs: [
          `arg${id}1`,
          `arg${id}2`,
        ],
        _isProxy: id.includes("proxy"),
        _needsPostDeploy: id === missionIdentifiers[2],
        _postDeployCb: async () => {
          postDeployRun[idx] = true;
        },
      }));

    campaign = new DeployCampaign({
      logger: loggerMock,
      missions: testMissions,
      deployer,
      dbAdapter: mongoAdapterMock,
      config,
    });

    await campaign.execute();
  });

  it("should instantiate all missions in its state upon construction", () => {
    const {
      state: {
        instances,
      },
    } = campaign;

    assert.equal(Object.keys(instances).length, missionIdentifiers.length);

    missionIdentifiers.forEach(id => {
      assert.equal(instances[id].contractName, `Contract${id}`);
      assert.equal(instances[id].instanceName, id);
      assert.equal(instances[id].proxyData.isProxy, id.includes("proxy"));
    });
  });

  it("should call correct mission methods in the correct order upon execute()", async () => {
    // noProxy
    const methodsCalledReference = [
      "execute",
      "needsDeploy",
      "getFromDB",
      "deploy",
      "deployArgs",
      "saveToDB",
      "buildDbObject",
      "getArtifact",
      "needsPostDeploy",
      "verify",
      "deployArgs",
      "getMonitoringData",
    ];

    const state = campaign.state.instances as Record<
    string,
    ATestDeployMission<IProviderBase, IContractState>
    >;

    // check proper sequence of methods called
    state[missionIdentifiers[0]].called.forEach(
      (method, idx) => assert.equal(method, methodsCalledReference[idx])
    );

    // should NOT deploy as proxy - deployProxy() only called twice for other 2 contracts
    hardhatMock.called
      .filter(
        ({ methodName }) => methodName === "deployProxy"
      ).length === 2;

    // proxyNoPost
    // deployArgs() should not be called at the end because ctor args are not needed to verify a proxy
    const proxyNoPostRef = methodsCalledReference.slice();
    proxyNoPostRef.splice(10, 1);

    state[missionIdentifiers[1]].called.forEach(
      (method, idx) => assert.equal(method, proxyNoPostRef[idx])
    );

    // deployProxy is called on the correct contract
    hardhatMock.called
      .filter(
        ({ methodName, args }) =>
          methodName === "deployProxy" && args.contractName === `Contract${missionIdentifiers[1]}`
      ).length === 1;

    // proxyPost
    // deployArgs() should not be called at the end because ctor args are not needed to verify a proxy
    // postDeploy() should be called
    const proxyPostRef = methodsCalledReference.slice();
    proxyPostRef.splice(9, 0, "postDeploy"); // inject postDeploy() call
    proxyPostRef.splice(11, 1); // remove deployArgs() call

    state[missionIdentifiers[2]].called.forEach(
      (method, idx) => assert.equal(method, proxyPostRef[idx])
    );

    // deployProxy is called on the correct contract
    hardhatMock.called
      .filter(
        ({ methodName, args }) =>
          methodName === "deployProxy" && args.contractName === `Contract${missionIdentifiers[2]}`
      ).length === 1;
  });

  it("should launch verification and monitoring logic if flags are turned on in the config", async () => {
    assert.equal(config.postDeploy.verifyContracts, true);
    assert.equal(config.postDeploy.monitorContracts, true);

    const state = campaign.state.instances as Record<
    string,
    ATestDeployMission<IProviderBase, IContractState>
    >;

    // make sure verify() and getMonitoringData() are called on all missions
    missionIdentifiers.forEach(
      id => {
        assert.equal(state[id].called.filter(
          methodName => methodName === "verify"
        ).length, 1);

        assert.equal(state[id].called.filter(
          methodName => methodName === "getMonitoringData"
        ).length, 1);
      }
    );

    // it will not push for test, but this messages indicates that a method has been called
    loggerMessages.includes("Pushing contracts to Tenderly...");
  });
});
