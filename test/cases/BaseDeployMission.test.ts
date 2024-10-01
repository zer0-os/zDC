import assert from "node:assert";
import {
  DBVersioner,
  DeployCampaign,
  HardhatDeployer,
  IContractState,
  IDeployCampaignConfig,
  IHardhatBase,
  ISignerBase,
  MongoDBAdapter,
} from "../../src";
import { HardhatMock } from "../mocks/hardhat";
import { loggerMock } from "../mocks/logger";
import { testMissions } from "../mocks/missions";
import { MongoClientMock } from "../mocks/mongo";

// // imported it using es5. It doesn't allow me to do it any other way.
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const chai = require("chai");
// const expect = chai.expect;


describe.only("Base deploy mission", () => {
  let campaign : DeployCampaign<IHardhatBase, ISignerBase, IDeployCampaignConfig<ISignerBase>, IContractState>;
  let hardhatMock : HardhatMock;
  let missionIdentifiers : Array<string>;
  // it has any type in the DeployCampaign class
  let config : any;

  before(async () => {
    hardhatMock = new HardhatMock();

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

    const signerMock = {
      getAddress: async () => Promise.resolve("0xsignerAddress"),
      address: "0xsignerAddress",
    };

    const deployer = new HardhatDeployer({
      hre: hardhatMock,
      signer: signerMock,
      env: "prod",
    });

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
      "buildObject",
      "needsDeploy",
      "nonDeploy",
      "proxyPost",
    ];

    const postDeployRun = [
      false,
      false,
      false,
    ];

    campaign = new DeployCampaign({
      logger: loggerMock,
      missions: testMissions(
        missionIdentifiers,
        postDeployRun
      ),
      deployer,
      dbAdapter: mongoAdapterMock,
      config,
    });

    await campaign.execute();
  });

  describe("#saveToDB", () => {
    it("Should build correct object of contract and call insertOne()", async () => {
      const {
        buildObject,
      } = campaign.state.instances;

      const {
        buildObject: contractBuildObject,
      } = campaign.state.contracts;

      const buildedDbObject = await buildObject.buildDbObject(contractBuildObject, buildObject.implAddress);

      const resultBuildedDbObject = {
        address: "0xcontractAddress_Contract_buildObject",
        abi: "[]",
        bytecode: "0xbytecode",
        implementation: null,
        name: "Contract_buildObject",
      };

      assert.deepEqual(
        buildedDbObject,
        resultBuildedDbObject
      );
    });
  });

  describe("#needsDeploy()",() => {
    it("Should return false, because it found itself", async () => {
      assert.equal(
        await campaign.state.instances.needsDeploy.needsDeploy(),
        false
      );
    });
  });
});