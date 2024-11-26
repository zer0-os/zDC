import { MongoDBAdapter } from "./mongo-adapter";
import { getLogger } from "../../logger/create-logger";
import { DEFAULT_MONGO_DB_NAME, DEFAULT_MONGO_URI } from "./constants";
import { TLogger } from "../../campaign/types";


let mongoAdapter : MongoDBAdapter | null = null;

export const resetMongoAdapter = () => {
  mongoAdapter = null;
};


export const getMongoAdapter = async ({
  logger,
  contractsVersion,
  dbUri = DEFAULT_MONGO_URI,
  dbName = DEFAULT_MONGO_DB_NAME,
  dbVersion,
  archiveDb = false,
  clientOpts,
} : {
  logger ?: TLogger;
  contractsVersion ?: string;
  dbUri ?: string;
  dbName ?: string;
  dbVersion ?: string;
  archiveDb ?: boolean;
  clientOpts ?: Record<string, unknown>;
} = {}) : Promise<MongoDBAdapter> => {
  logger = logger ?? getLogger();

  const params = {
    logger,
    dbUri,
    dbName,
    clientOpts,
    dbVersion,
    archive: archiveDb,
    contractsVersion,
  };

  if (!mongoAdapter) {
    logger.debug("Creating new MongoDBAdapter instance");
    mongoAdapter = new MongoDBAdapter({
      ...params,
    });
    await mongoAdapter.initialize();
  } else {
    logger.debug("Returning existing MongoDBAdapter instance");
  }

  return mongoAdapter;
};
