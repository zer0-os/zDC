import assert from "node:assert";
import {
  DBVersioner,
  MongoDBAdapter,
  VERSION_TYPES,
} from "../../src";
import { loggerMock } from "../mocks/logger";
import { dbMock, MongoClientMock } from "../mocks/mongo";


describe("DB versioner", function () {
  this.timeout(5000);

  let mongoAdapter : MongoDBAdapter;
  let versioner : DBVersioner;

  const contractsVersion = "1.7.9";
  const dbVersion = "109381236293746234";

  before(async () => {

    versioner = new DBVersioner({
      dbVersion,
      contractsVersion,
      archive: false,
      logger: loggerMock,
    });

    mongoAdapter = new MongoDBAdapter({
      logger: loggerMock,
      dbUri: "mongodb://mockedMongo",
      dbName: "TestDatabase",
      mongoClientClass: MongoClientMock,
      versionerClass: DBVersioner,
      dbVersion,
      contractsVersion,
    });

    await mongoAdapter.initialize(dbVersion);
  });

  it("Should return existing temp version when calls configureVersioning()", async () => {
    // db mock returns `DBVersion`
    assert.equal(
      await versioner.configureVersioning(dbMock),
      dbVersion
    );
  });

  it("Should make a DB version (Date.now()) when it's not exist", async () => {
    // override the mock method to emulate the absence of a version in the DB
    // @ts-ignore // because native .collection() requires arguments
    dbMock.collection().findOne = async () => null;

    assert.equal(
      await versioner.configureVersioning(dbMock),
      Date.now().toString()
    );
  });

  it("Should finalize deloyed version", async () => {
    const tempVersion = "123";
    const deployedVersion = "456";

    const called : Array<{
      method : string;
      args : any;
    }> = [];

    // expected order of DB method calls when calling finalizeDeployedVersion()
    const expectedOrder = [
      "updateOne",
      "insertOne",
      "deleteOne",
      "updateOne",
    ];

    // make special mocks of db methods only for this case
    // @ts-ignore
    dbMock.collection().findOne = async (
      args : {
        type : string;
      }
    ) => {
      if (args.type === VERSION_TYPES.temp) {
        return {
          dbVersion: tempVersion,
          type: VERSION_TYPES.temp,
        };
      }

      if (args.type === VERSION_TYPES.deployed) {
        return {
          dbVersion: deployedVersion,
          type: VERSION_TYPES.deployed,
        };
      }

      return null;
    };

    // @ts-ignore
    dbMock.collection().insertOne = async doc => {
      called.push({
        method: "insertOne",
        args: doc,
      });
      return Promise.resolve(doc);
    };

    // @ts-ignore
    dbMock.collection().updateOne = async (filter, update) => {
      called.push({
        method: "updateOne",
        args: {
          filter,
          update,
        },
      });
      return Promise.resolve({
        matchedCount: 1,
        modifiedCount: 1,
      });
    };

    // @ts-ignore
    dbMock.collection().deleteOne = async filter => {
      called.push({
        method: "deleteOne",
        args: filter,
      });
      return Promise.resolve();
    };

    await versioner.finalizeDeployedVersion();

    // looking at the methods called by db, check the order of them and their arguments
    called.forEach((calledMethod, index) => {
      const methodName = calledMethod.method;
      const args = calledMethod.args;

      assert.equal(
        methodName,
        expectedOrder[index]
      );

      if (methodName === "deleteOne") {
        assert.equal(
          args.type,
          VERSION_TYPES.temp
        );
        assert.equal(
          args.dbVersion,
          tempVersion
        );
      }

      if (methodName === "insertOne") {
        assert.equal(
          args.type,
          VERSION_TYPES.deployed
        );
        assert.equal(
          args.dbVersion,
          tempVersion
        );
        assert.equal(
          args.contractsVersion,
          contractsVersion
        );
      }

      if (methodName === "updateOne") {
        assert.equal(
          args.filter.type,
          index === 0 ? VERSION_TYPES.deployed : VERSION_TYPES.temp
        );
        assert.equal(
          args.update.$set.type,
          VERSION_TYPES.archived
        );
      }
    });
  });
});