import { TLogger } from "../../campaign/types";
import { DBVersioner } from "../versioning/db-versioner";
import { IDBVersionerArgs } from "../versioning/types";


export interface IMongoDBAdapterArgs {
  logger : TLogger;
  dbUri : string;
  dbName : string;
  versionerClass ?: new (args : IDBVersionerArgs) => DBVersioner;
  contractsVersion ?: string;
  dbVersion ?: string;
  clientOpts ?: Record<string, unknown>;
  archive ?: boolean;
}

export interface IDBVersion {
  dbVersion : string;
  contractsVersion : string;
  type : string;
}
