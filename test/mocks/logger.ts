import { TLogger } from "../../src";

export let loggerMessages : Array<string>;
loggerMessages = [];

export const loggerMock = {
  info: (msg : string) => {
    loggerMessages.push(msg);
  },
  error: () => {},
  debug: () => {},
  log: () => {},
} as unknown as TLogger;