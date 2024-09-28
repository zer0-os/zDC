import { MongoClient, MongoClientOptions, Db, DbOptions } from "mongodb";

export const collectionMock = {
  insertOne: async () => Promise.resolve(),
  findOne: async (args: any) => {
    if (args.type) {
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
  constructor(dbUri: string, clientOpts: MongoClientOptions) {
    super(dbUri, clientOpts);
  }

  async connect() {
    return Promise.resolve(this);
  }

  db(dbName?: string | undefined, options?: DbOptions | undefined) {
    return dbMock as unknown as Db;
  }

  async close(force?: boolean) {
    await Promise.resolve();
  }
}
