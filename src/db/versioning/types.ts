import { TLogger } from "../../campaign/types";


export interface IDBVersionerArgs {
  dbVersion ?: string;
  contractsVersion ?: string;
  archive ?: boolean;
  logger : TLogger;
}
