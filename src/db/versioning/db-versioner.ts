import { Collection, Db } from "mongodb";
import { IDBVersion, IDBVersionerArgs } from "./types";
import { COLL_NAMES, VERSION_TYPES } from "../mongo-adapter/constants";
import { TLogger } from "../../campaign/types";


export class DBVersioner {
  curDbVersion ?: string;
  contractsVersion : string;
  archiveCurrentDeployed : boolean;
  logger : TLogger;

  // Collection pointer
  versions : Collection<IDBVersion>;

  constructor ({
    dbVersion,
    contractsVersion,
    archive,
    logger,
  } : IDBVersionerArgs) {
    if (!contractsVersion) {
      logger.info("No contracts version/tag provided to MongoDBAdapter! Only the DB version will be written.");
      this.contractsVersion = "0";
    } else {
      this.contractsVersion = contractsVersion;
    }

    this.curDbVersion = dbVersion;
    this.archiveCurrentDeployed = !!archive;
    this.logger = logger;

    this.versions = {} as Collection<IDBVersion>;
  }

  async configureVersioning (db : Db) {
    this.versions = db.collection(COLL_NAMES.versions);

    const tempV = await this.getTempVersion();
    const deployedV = await this.getDeployedVersion();

    let finalVersion : string;
    if (this.curDbVersion) {
      finalVersion = this.curDbVersion;

      if (!deployedV || this.curDbVersion !== deployedV.dbVersion) {
        // we should only have a single TEMP version at any given time
        if (tempV && this.curDbVersion !== tempV.dbVersion) {
          this.logger.debug("Clearing existing TEMP DB version...");
          await this.clearDBForVersion(tempV.dbVersion, db);
        }

        this.logger.debug(`Updating TEMP version for the new one: ${finalVersion}`);
        await this.createUpdateTempVersion(finalVersion);
      } else {
        this.logger.debug(`Using existing DEPLOYED DB version: ${finalVersion}`);
      }
    } else {
      if (!tempV) {
        // what to do with the current DEPLOYED version
        if (this.archiveCurrentDeployed) {
          this.logger.debug("Archiving enabled - Archiving current DEPLOYED DB version...");
          // archive the current DEPLOYED version
          await this.versions.updateOne(
            {
              type: VERSION_TYPES.deployed,
            },
            {
              $set: {
                type: VERSION_TYPES.archived,
              },
            });
        } else {
          if (deployedV) {
            // get the current DEPLOYED and clear DB for that version
            this.logger.debug("Archiving disabled - Clearing current DEPLOYED DB version...");
            await this.clearDBForVersion(deployedV.dbVersion, db);
          }
        }

        // create new TEMP version
        finalVersion = Date.now().toString();
        // eslint-disable-next-line max-len
        this.logger.info(`No version provided to MongoDBAdapter, using current timestamp as new TEMP version: ${finalVersion}`);
        await this.createUpdateTempVersion(finalVersion);
      } else {
        finalVersion = tempV.dbVersion;
        this.logger.info(`Using existing MongoDB TEMP version: ${finalVersion}`);
      }
    }

    this.curDbVersion = finalVersion;
    return this.curDbVersion;
  }

  async finalizeDeployedVersion (version ?: string) {
    const finalV = version || (await this.getTempVersion())?.dbVersion;

    if (!finalV) return;

    const deployedV = (await this.getDeployedVersion())?.dbVersion;
    if (finalV !== deployedV) {
      // archive the current DEPLOYED version
      await this.versions.updateOne(
        {
          type: VERSION_TYPES.deployed,
        },
        {
          $set: {
            type: VERSION_TYPES.archived,
          },
        });

      // create new DEPLOYED version
      await this.versions.insertOne({
        type: VERSION_TYPES.deployed,
        dbVersion: finalV,
        contractsVersion: this.contractsVersion,
      });

      // now remove the TEMP version
      await this.versions.deleteOne({
        type: VERSION_TYPES.temp,
        dbVersion: finalV,
      });
    }

    // archive the current TEMP version if any
    await this.versions.updateOne(
      {
        type: VERSION_TYPES.temp,
      },
      {
        $set: {
          type: VERSION_TYPES.archived,
        },
      });

    this.logger.info(`Successfully finalized DB version ${finalV} from TEMP to DEPLOYED.`);
  }

  async getCheckLatestVersion () {
    const v = await this.getLatestVersion();

    if (!v) throw new Error("No version found in DB!");

    return v;
  }

  async getTempVersion () : Promise<IDBVersion | null> {
    const v = await this.versions.findOne({
      type: VERSION_TYPES.temp,
    });

    if (!v) return null;

    return v;
  }

  async getDeployedVersion () : Promise<IDBVersion | null> {
    const v = await this.versions.findOne({
      type: VERSION_TYPES.deployed,
    });

    if (!v) return null;

    return v;
  }

  async getLatestVersion () : Promise<IDBVersion | null> {
    const v = await this.getTempVersion();

    if (v) return v;

    return this.getDeployedVersion();
  }

  async createUpdateTempVersion (version : string) {
    return this.versions.updateOne({
      type: VERSION_TYPES.temp,
    }, {
      $set: {
        dbVersion: version,
        contractsVersion: this.contractsVersion,
      },
    }, {
      upsert: true,
    });
  }

  async clearDBForVersion (version : string, db ?: Db) {
    if (db) {
      const contracts = db.collection(COLL_NAMES.contracts);

      await contracts.deleteMany({
        version,
      });
    }

    return this.versions.deleteMany({
      dbVersion: version,
    });
  }
}
