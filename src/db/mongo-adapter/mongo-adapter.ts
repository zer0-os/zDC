import { Collection, Db, MongoClient } from "mongodb";
import { TLogger } from "../../campaign/types";
import { IMongoDBAdapterArgs } from "./types";
import { COLL_NAMES } from "./constants";
import { IContractDbData } from "../types";
import { DBVersioner } from "../versioning/db-versioner";


export class MongoDBAdapter {
  logger : TLogger;
  client : MongoClient;
  dbUri : string;
  dbName : string;
  db : Db;
  versioner : DBVersioner;

  // Collection pointer
  contracts : Collection<IContractDbData>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name : string | symbol] : any;

  constructor ({
    logger,
    dbUri,
    dbName,
    clientOpts,
    versionerClass = DBVersioner,
    dbVersion,
    contractsVersion,
    archive,
  } : IMongoDBAdapterArgs) {
    this.logger = logger;
    this.client = new MongoClient(dbUri, clientOpts);
    this.dbUri = dbUri;
    this.dbName = dbName;

    this.db = {} as Db;
    this.contracts = {} as Collection<IContractDbData>;

    this.versioner = new versionerClass({
      dbVersion,
      contractsVersion,
      archive,
      logger,
    });
  }

  // call this to actually start the adapter
  async initialize (version ?: string) {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);

      this.logger.info({
        message: "MongoDB connected",
      });
    } catch (e) {
      this.logger.error({
        message: "MongoDB connection failed",
        error: e,
      });
      throw e;
    }

    this.contracts = this.db.collection(COLL_NAMES.contracts);

    this.curDbVersion = await this.versioner.configureVersioning(this.db, version);

    return this.db;
  }

  async close (forceClose = false) {
    try {
      await this.client.close(forceClose);
      this.logger.info("MongoDB connection closed");
    } catch (e) {
      this.logger.error({
        message: "MongoDB connection failed to close",
        error: e,
      });
      throw e;
    }
  }

  // Contract methods
  async getContract (contractName : string, version ?: string) {
    if (!version) {
      ({ dbVersion: version } = await this.versioner.getCheckLatestVersion());
    }

    return this.contracts.findOne({
      name: contractName,
      version,
    });
  }

  async writeContract (contractName : string, data : Omit<IContractDbData, "version">, version ?: string) {
    if (!version) {
      ({ dbVersion: version } = await this.versioner.getCheckLatestVersion());
    }

    await this.contracts.insertOne({
      ...data,
      version,
    });

    this.logger.debug(`Successfully wrote ${contractName} to DB.`);
  }

  async clearDBForVersion (version : string) {
    await this.contracts.deleteMany({
      version,
    });

    return this.versioner.clearDBForVersion(version);
  }

  async finalize (version ?: string) {
    await this.versioner.finalizeDeployedVersion(version);
  }

  async dropDB () {
    await this.db.dropDatabase();
    this.logger.info("Database dropped successfully.");
  }
}
