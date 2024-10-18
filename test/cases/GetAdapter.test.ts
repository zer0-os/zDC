import assert from "node:assert";
import {
  DEFAULT_MONGO_DB_NAME,
  DEFAULT_MONGO_URI,
  getLogger,
  getMongoAdapter,
  MongoDBAdapter,
  resetMongoAdapter,
} from "../../src";
import { loggerMock } from "../mocks/logger";


describe("Get Adapter", () => {
  let originalInitialize : any;
  let mongoAdapter : MongoDBAdapter;

  process.env.SILENT_LOGGER = "true";

  const mockLogger = loggerMock;

  beforeEach(() => {
    resetMongoAdapter();

    originalInitialize = MongoDBAdapter.prototype.initialize;

    // @ts-ignore
    MongoDBAdapter.prototype.initialize = async function () {
      return Promise.resolve();
    };
  });

  afterEach(() => {
    MongoDBAdapter.prototype.initialize = originalInitialize;
  });

  it("Should create a new MongoDBAdapter instance if no existing adapter", async () => {
    mongoAdapter = await getMongoAdapter();
    assert(mongoAdapter instanceof MongoDBAdapter);
  });

  it.skip("Should reset mongoAdapter to NULL after resetMongoAdapter() is called", async () => {
    resetMongoAdapter();
    assert.strictEqual(
      mongoAdapter,
      null
    );
  });

  it("Should use the default logger if it's not passed", async () => {
    const defaultLogger = getLogger();
    const mongoAdapter = await getMongoAdapter();
    assert.deepEqual(
      mongoAdapter.logger,
      defaultLogger
    );
  });

  it("Should use the provided logger if passed", async () => {
    const mongoAdapter = await getMongoAdapter({ logger: mockLogger });
    assert.strictEqual(
      mongoAdapter.logger,
      mockLogger
    );
  });

  it("Should create a new adapter if dbUri or dbName changes", async () => {
    const mongoAdapter1 = await getMongoAdapter();
    process.env.MONGO_DB_URI = "mongodb://address";
    const mongoAdapter2 = await getMongoAdapter();
    assert.notStrictEqual(
      mongoAdapter1,
      mongoAdapter2
    );
  });

  it("Should pass the contractsVersion to the MongoDBAdapter", async () => {
    const contractsVersion = "1.0.0";
    const mongoAdapter = await getMongoAdapter({
      logger: mockLogger,
      contractsVersion,
    });
    assert.equal(
      mongoAdapter.versioner.contractsVersion,
      contractsVersion
    );
  });

  it("Should handle missing environment variables and use defaults", async () => {
    delete process.env.MONGO_DB_URI;
    delete process.env.MONGO_DB_NAME;
    const mongoAdapter = await getMongoAdapter();
    assert.strictEqual(
      mongoAdapter.dbUri,
      DEFAULT_MONGO_URI
    );
    assert.strictEqual(
      mongoAdapter.dbName,
      DEFAULT_MONGO_DB_NAME
    );
  });

  it("Should set version to undefined if environment variable is missing", async () => {
    delete process.env.MONGO_DB_VERSION;
    const mongoAdapter = await getMongoAdapter();

    // It stays under todo. (Returns "0" if nothing passed)
    assert.strictEqual(
      mongoAdapter.versioner.curDbVersion,
      "0"
    );
  });

  it("Should set archive flag to true if ARCHIVE_PREVIOUS_DB_VERSION is TRUE", async () => {
    process.env.ARCHIVE_PREVIOUS_DB_VERSION = "true";
    const mongoAdapter = await getMongoAdapter();
    assert.strictEqual(
      mongoAdapter.versioner.archiveCurrentDeployed,
      true
    );
  });

  it("Should set archive flag to FALSE if ARCHIVE_PREVIOUS_DB_VERSION is not true", async () => {
    process.env.ARCHIVE_PREVIOUS_DB_VERSION = "false";
    const mongoAdapter = await getMongoAdapter();
    assert.strictEqual(
      mongoAdapter.versioner.archiveCurrentDeployed,
      false
    );
  });

  it("Should handle absence of MONGO_DB_URI and MONGO_DB_NAME", async () => {
    delete process.env.MONGO_DB_URI;
    delete process.env.MONGO_DB_NAME;

    const mongoAdapter = await getMongoAdapter();

    assert.strictEqual(
      mongoAdapter.dbUri,
      DEFAULT_MONGO_URI
    );
    assert.strictEqual(
      mongoAdapter.dbName,
      DEFAULT_MONGO_DB_NAME
    );
  });
});
