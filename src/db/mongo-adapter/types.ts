import { TLogger } from "../../campaign/types";
import { DBVersioner } from "../versioning/db-versioner";
import { IDBVersionerArgs } from "../versioning/types";
import { MongoClient, MongoClientOptions } from "mongodb";


export interface IMongoDBAdapterArgs {
  logger : TLogger;
  dbUri : string;
  dbName : string;
  versionerClass ?: new (args : IDBVersionerArgs) => DBVersioner;
  mongoClientClass ?: new (dbUri : string, clientOpts : MongoClientOptions) => MongoClient;
  contractsVersion ?: string;
  dbVersion ?: string;
  clientOpts ?: MongoClientOptions;
  archive ?: boolean;
}

