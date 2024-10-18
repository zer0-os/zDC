import assert from "node:assert";
import {
  COLL_NAMES,
  DBVersioner,
  VERSION_TYPES,
} from "../../src";
import { loggerMock } from "../mocks/logger";
import { dbMock } from "../mocks/mongo";


describe("DB versioner", () => {
  let versioner : DBVersioner;

  // Error for Date.now(). Leave +/- 2 seconds for code execution
  const allowedTimeDifference = 2;

  const contractsVersion = "1.7.9";
  const dbVersion = "109381236293746234";

  const tempVersion = "123[temp]";
  const deployedVersion = "456[deployed]";

  // expected order of DB method calls when calling finalizeDeployedVersion()
  const expectedOrder = [
    "updateOne",
    "insertOne",
    "deleteOne",
    "updateOne",
  ];

  // order of DB methods called by dbVersioner
  let called : Array<{
    method : string;
    args : any;
  }> = [];

  beforeEach(async () => {
    versioner = new DBVersioner({
      dbVersion,
      contractsVersion,
      archive: false,
      logger: loggerMock,
    });
    versioner.versions = dbMock.collection(COLL_NAMES.versions);

    // override the mock methods to track the execution
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
      return Promise.resolve();
    };

    // @ts-ignore
    dbMock.collection().deleteOne = async filter => {
      called.push({
        method: "deleteOne",
        args: filter,
      });
      return Promise.resolve();
    };

    // @ts-ignore
    dbMock.collection().deleteMany = async filter => {
      called.push({
        method: "deleteMany",
        args: filter,
      });
      return Promise.resolve();
    };
  });

  afterEach(() => {
    called = [];
  });

  describe("TEMP and DEPLOYED versions do NOT exist", async () => {
    beforeEach(async () => {
      // @ts-ignore. Because native .collection() requires arguments
      dbMock.collection().findOne = async args => {
        if (args.type === "TEMP" || args.type === "DEPLOYED") return null;
      };
    });

    it("Should make a DB version (Date.now()) when it does NOT exist", async () => {
      // do Math.abs, so that the error can be in both directions
      assert.ok(
        Math.abs(
          Number(
            await versioner.configureVersioning(dbMock)
          ) -
          Number(Date.now())
        ) <= allowedTimeDifference,
      );
    });

    it("Should make NEW final TEMP version (Date.now())", async () => {
      assert.ok(
        // do Math.abs, so that the error can be in both directions
        Math.abs(
          Number(await versioner.configureVersioning(dbMock)) -
          Number(Date.now())
        ) <= allowedTimeDifference,
      );
    });

    // TODO: What to do with it?
    it.skip("Should maintain the order of method calls (`expectedOrder`) when calls #finalizeDeloyedVersion()" +
      "WITHOUT passed version", async () => {
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

  describe("TEMP version does NOT exist", () => {
    beforeEach(async () => {
      // @ts-ignore
      dbMock.collection().findOne = async (
        args : {
          type : string;
        }
      ) => {
        if (args.type === VERSION_TYPES.deployed) {
          return {
            dbVersion: deployedVersion,
            type: VERSION_TYPES.deployed,
          };
        }

        called.push({
          method: "findOne",
          args,
        });

        return null;
      };
    });

    it("Should return NEW final TEMP version (Date.now())", async () => {
      assert.ok(
        // do Math.abs, so that the error can be in both directions
        Math.abs(
          Number(
            await versioner.configureVersioning(dbMock)
          ) -
          Number(Date.now())
        ) <= allowedTimeDifference,
      );
    });
  });

  describe("DEPLOYED version does NOT exist", () => {
    beforeEach(async () => {
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

        return null;
      };
    });

    // TODO: make this
    it.skip("if (!deployedV || version !== deployedV.dbVersion) #configureVersioning()", async () => {
      assert.equal(
        await versioner.configureVersioning(dbMock),
        tempVersion
      );
    });

    it("Should return TEMP version when call #configureVersioning()", async () => {
      assert.equal(
        await versioner.configureVersioning(dbMock),
        tempVersion
      );
    });

    it("Should maintain the order of method calls (`expectedOrder`) when calls #finalizeDeloyedVersion()" +
      "WITHOUT passed version", async () => {
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

  describe("Has SIMILAR `temp` and `deployed` versions", () => {
    const similarVersion = "similarVersion";

    beforeEach(async () => {
      // @ts-ignore
      dbMock.collection().findOne = async (
        args : {
          type : string;
        }
      ) => {
        if (args.type === VERSION_TYPES.temp) {
          return {
            dbVersion: similarVersion,
            type: VERSION_TYPES.temp,
          };
        }

        if (args.type === VERSION_TYPES.deployed) {
          return {
            dbVersion: similarVersion,
            type: VERSION_TYPES.deployed,
          };
        }

        return null;
      };
    });

    it("Should call only #updateOne with correct args when run #finalizeDeloyedVersion()", async () => {
      await versioner.finalizeDeployedVersion();

      const methodName = called[0].method;
      const args = called[0].args;

      assert.equal(
        methodName,
        "updateOne"
      );
      assert.equal(
        args.filter.type,
        VERSION_TYPES.temp
      );
      assert.equal(
        args.update.$set.type,
        VERSION_TYPES.archived
      );
    });

    // TODO with passed version
    it.skip("Should #finalizeDeloyedVersion()", async () => {
      await versioner.finalizeDeployedVersion();
    });
  });

  describe("Has DIFFERENT `temp` and `deployed` versions", () => {
    beforeEach(async () => {
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
    });

    it("Should return existing temp version when both, deployed and temp, exist", async () => {
      assert.equal(
        await versioner.configureVersioning(dbMock),
        tempVersion
      );
    });

    it("Should maintain the order of method calls (`expectedOrder`) when calls #finalizeDeloyedVersion()" +
      "WITHOUT passed version", async () => {
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


  describe("Minor methods", () => {
    it("#createUpdateTempVersion() should call #updateOne() method with correct args", async () => {
      await versioner.createUpdateTempVersion(tempVersion);

      const args = called[0].args;

      assert.equal(
        called[0].method,
        "updateOne"
      );
      assert.equal(
        args.filter.type,
        VERSION_TYPES.temp
      );
      assert.equal(
        args.update.$set.dbVersion,
        tempVersion
      );
      assert.equal(
        args.update.$set.contractsVersion,
        contractsVersion
      );
    });

    it("#clearDBForVersion() should call #deleteMany() (WITHOUT passed `db`)", async () => {
      await versioner.clearDBForVersion(tempVersion);

      const args = called[0].args;

      assert.equal(
        called[0].method,
        "deleteMany"
      );
      assert.equal(
        args.dbVersion,
        tempVersion
      );
    });

    it("#clearDBForVersion() should call deleteMany() TWO times (WITH passed `db`)", async () => {
      await versioner.clearDBForVersion(tempVersion, dbMock);

      called.forEach(calledMethod => {
        const args = calledMethod.args;

        assert.equal(
          calledMethod.method,
          "deleteMany"
        );

        if (args.hasOwnProperty("version")) {
          assert.equal(
            args.version,
            tempVersion
          );
        } else {
          assert.equal(
            args.dbVersion,
            tempVersion
          );
        }
      });
    });
  });
});
