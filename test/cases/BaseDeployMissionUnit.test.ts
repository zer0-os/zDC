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
import { assertIsContract } from "../helpers/isContractCheck";


describe("Base deploy mission", () => {

  let campaign : DeployCampaign<IHardhatBase, ISignerBase, IDeployCampaignConfig<ISignerBase>, IContractState>;
  let hardhatMock : HardhatMock;
  let missionIdentifiers : Array<string>;

  // it has any type in the DeployCampaign class
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config : any;

  before(async () => {
    hardhatMock = new HardhatMock();

    config = {
      env: "prod",
      deployAdmin: {
        address: "0xdeployAdminAddress",
      },
      postDeploy: {
        tenderlyProjectSlug: "tenderlyProject",
        monitorContracts: true,
        verifyContracts: true,
      },
    };

    const signerMock = {
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
      "deployed",
      "proxyPost",
    ];

    const postDeployRun = [
      false,
      false,
      false,
    ];

    campaign = new DeployCampaign({
      logger: loggerMock,
      missions: await testMissions(
        missionIdentifiers,
        postDeployRun
      ),
      deployer,
      dbAdapter: mongoAdapterMock,
      config,
    });

    await campaign.execute();
  });

  describe("#deploy()", () => {
    it("Should deploy all contracts from `missionIdentifiers`", async () => {
      for (const mission of missionIdentifiers) {
        assert.equal(
          await campaign.state.contracts[mission].getAddress(),
          `0xcontractAddress_Contract_${mission}`
        );
        // does it make sense to do this?
        assert.deepEqual(
          await campaign.state.instances[mission].deployArgs(),
          [`arg_${mission}1`, `arg_${mission}2`]
        );
      }
    });

    it("#savetoDB() Should call `saveToDB()` when deploy a contract", async () => {
      for (const mission of missionIdentifiers) {
        if (mission !== "deployed") {
          assert.equal(
            // ts complains about `called` prop
            // @ts-ignore
            await campaign.state.instances[mission].called.includes("saveToDB"),
            true
          );
        }
      }
    });
  });

  describe("Minor methods", () => {
    it("Should update state of contracts in campaign, when deploys them", async () => {
      const state = await campaign.state.contracts;

      // check here that all objects of contracts got into the state
      assert.deepEqual(
        Object.keys(state),
        missionIdentifiers,
      );

      // double check that these objects look like the contracts
      for (const mission of missionIdentifiers) {
        const contract = state[mission];
        assertIsContract(contract);
      }
    });

    it("#buildObject() Should build correct object of contract and call insertOne()", async () => {
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
    it("Should return TRUE because the contract is NOT in the DB", async () => {
      assert.equal(
        await campaign.state.instances.needsDeploy.needsDeploy(),
        true
      );
    });

    it("Should return FALSE because the contract exists in the DB", async () => {
      assert.equal(
        await campaign.state.instances.deployed.needsDeploy(),
        false
      );
    });

    it("Should write the contract into the state from the DB " +
      "when #needsDeploy() returns FALSE", async () => {
      const contractFromDB = await campaign.dbAdapter.getContract(
        "Contract_deployed"
      );

      assert.equal(
        await campaign.state.instances.deployed.needsDeploy(),
        false
      );

      assert.equal(
        await campaign.state.contracts.deployed.getAddress(),
        contractFromDB?.address
      );
    });
  });
});