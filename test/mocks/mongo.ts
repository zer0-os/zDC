import {
  MongoClient,
  MongoClientOptions,
  Db,
  DbOptions,
  WriteConcern,
  ReadConcern,
} from "mongodb";

export const collectionMock = {
  insertOne: async () => Promise.resolve(),
  findOne: async (
    args : {
      name : string;
      version : string;
      type : string;
    }
  ) => {
    if (args.name === "Contract_deployed") {
      return {
        name: `${args.name}`,
        address: `0xaddress_${args.name}`,
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
  databaseName: "mockDb",
  options: {},
  readConcern: new ReadConcern("local"),
  writeConcern: new WriteConcern(),
  secondaryOk: true,
  readPreference: { mode: "primary" },  // Заглушка для readPreference
  command: async () => Promise.resolve({}),  // Заглушка для command
  aggregate: () => ({
    toArray: async () => Promise.resolve([]),
  }),
} as unknown as Db;  // Приведение к типу Db

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
