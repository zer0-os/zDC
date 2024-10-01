import { MongoClient, MongoClientOptions, Db, DbOptions } from "mongodb";

export const collectionMock = {
  insertOne: async () => Promise.resolve(),
  findOne: async (
    args : {
      name : string;
      version : string;
      type : string;
    }
  ) => {
    if (
      args.name === "needsDeploy" &&
      args.type === "TEMP"
    ) {
      return {
        name: "needsDeploy",
        address: "0xaddress_Contract_needsDeploy",
        abi: "[]",
        bytecode: "0xbytecode",
        implementation: null,
        version: "109355555555555555",
      };
    }

    if (
      args.type === "TEMP" ||
      args.type === "DEPLOYED" ||
      args.type === "ARCHIVED"
    ) {
      return {
        dbVersion: "109381236293746234",
      };
    }
  },
  updateOne: async () => Promise.resolve(),
  deleteMany: async () => Promise.resolve(),
  deleteOne: async () => Promise.resolve(),
};

export const dbMock = {
  collection: () => collectionMock,
};

export class MongoClientMock extends MongoClient {
  constructor (dbUri : string, clientOpts : MongoClientOptions) {
    super(dbUri, clientOpts);
  }

  async connect () {
    return Promise.resolve(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  db (dbName ?: string | undefined, options ?: DbOptions | undefined) {
    return dbMock as unknown as Db;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async close (force ?: boolean) {
    await Promise.resolve();
  }
}
