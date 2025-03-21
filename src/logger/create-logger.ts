import winston from "winston";
import { TLogger } from "../campaign/types";

let logger : TLogger | null = null;


export const createLogger = (logLevel ?: string, silent ?: boolean) => winston.createLogger({
  levels: winston.config.npm.levels,
  level: logLevel,
  format: winston.format.combine(
    winston.format.json(),
    winston.format.timestamp(),
    winston.format.prettyPrint(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
  exitOnError: false,
  silent,
});

export const getLogger = ({
  logLevel = "debug",
  silence = true,
  makeLogFile = false,
} : {
  logLevel ?: string;
  silence ?: boolean;
  makeLogFile ?: boolean;
} = {}) : TLogger => {
  if (logger) return logger;

  logger = createLogger(logLevel, silence);

  if (makeLogFile) {
    const logFileName = `deploy-${Date.now()}.log`;

    logger.add(
      new winston.transports.File({ filename: logFileName }),
    );

    logger.debug(`Logs will be saved in ${ logFileName } file`);
  }

  return logger;
};
