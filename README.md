# zDC - Zero Deploy Campaign
___
A library for controlled Smart Contract System deployment and setup on EVM chains.

## About
zDC is a library of modular entities that can help with deploying smart contracts on any EVM chain.
Each entity needs to be used together with the Campaign or can be used separately based on your needs
for its individual functionality.

## Main Features
- Controlled configurable deployment of smart contracts on EVM chains with logging of every step.
- Support for extensions for every entity in the module. Possible to use your own deployers, DB adapters, loggers, etc.
- Built-in support for Hardhat, Ethers and OZ Defender to deploy and access contracts on-chain.
- Built-in support for MongoDB to store data about deployed contracts for easy access by any application.
- Built-in support for Etherscan contract verification to verify deployed contracts on Etherscan (optional).
- Built-in support for Tenderly to push deployed contracts to Tenderly projects for monitoring and easy debugging (optional).

## Entities
### Deploy Campaign
[Source](./src/campaign/deploy-campaign.ts)

An umbrella class that encompasses all other entities in its state and is the entry point of the module
for all deployments.
The Campaign is responsible for several things:
1. Launching individual missions and their deployment execution logic one by one while providing functionality of other entities to individual Missions.
2. Providing a way to track the state of the deployment and the state of individual missions by gathering all data in its state.
3. Executing Etherscan verification logic for the deployed contracts (optional).
4. Executing Tenderly integration logic to push deployed and verified contracts to Tenderly projects (optional).
5. Encompassing the full module in its state and providing access to every piece of data and entity in the module.

### Base Deploy Mission
[Source](./src/missions/base-deploy-mission.ts)

As any campaign in the world, this one is broken into individual missions that are executed one after the other.
`BaseDeployMission` class outlines general deployment logic for a single smart contract that is shared between all.
> This class should not be instantiated by itself, but rather extended by a child class that implements the abstract methods
and overrides other methods to provide a more specific and detailed deployment flow for a specific contract.

Base Deploy Mission is responsible for several things:
1. Implement the common logic required to deploy any smart contract on an EVM chain.
2. Outline base methods that need to be overriden by a child class to provide data and flows related to a specific contract.
3. Provide connection to the Campaign and other entities in the module to allow for data sharing and access to their functionality.
4. Serve as a compatibility tool and a stencil for modules that use this library on how to implement their own deployment logic.

### Hardhat Deployer
[Source](./src/deployer/hardhat-deployer.ts)

> Supports only ethers.js v6.x.x !

A deployer class that is responsible for deploying smart contracts on an EVM chain using Hardhat.
It is essentially a wrapper around Hardhat and its internal modules (e.g., ethers) to pull data necessary for the Campaign and call the respective methods.
It also allows for any deployed contract saved to Campaign state to be accessible as a callable Contract object.
> Please note that this module does NOT include Hardhat or ethers.js as a dependency to be more agnostic and not overload
> the user with additional modules, assuming that a module where smart contracts exist already has Hardhat installed.

A Hardhat Runtime Environment with included ethers.js v6 module should be passed when instantiating this class.

### Mongo DB Adapter and DB Versioner
[Source Adapter](./src/db/mongo-adapter/mongo-adapter.ts)

[Source Versioner](./src/db/versioning/db-versioner.ts)

This module comes with access code for MongoDB that will be used to store data of each deployed contract for easy access of any application that uses them.
`MongoDBAdapter` and `DBVersioner` classes are responsible for providing access to the database and versioning the data stored in it respectively.
Campaign uses data from DB to determine several things, one of which is if a contract should be deployed.
It stores two different versions:
- `dbVersion` - a timestamp-based version of the DB instance (if not provided, a timestamp at initialization is used)
- `contractsVersion` - a git-based version of the smart contracts module (`<git tag>:<git commit hash>`), if not provided, a default value of "0" is used

Types for DB docs can be found [here](./src/db/types.ts).

### Logger
[Source](./src/logger/create-logger.ts)

A simple logger that is used to log data to the console and to a file. Based on Winston logger.
Uses ENV variables to detemine levels and silencing.

## Usage

### Environment Variables
Set these in the module where you imported this library.
```dotenv
ENV_LEVEL= # "dev", "test" or "prod"
# DB
MONGO_DB_URI=
MONGO_DB_NAME=
MONGO_DB_CLIENT_OPTS= # options for MongoClient class from mongo package (optional)
ARCHIVE_PREVIOUS_DB_VERSION= # if "true" - save all the data from previous `dbVersion`, if "false" - delete it (optional, default: false)
# Logger
LOG_LEVEL= # winston log level (optional, default: info)
SILENT_LOGGER= # if "true" - silence the logger (optional, default: false)
# Integrations
TENDERLY_ACCESS_KEY= # if integrating with Tenderly, provide an access key (optional)
TENDERLY_ACCOUNT_ID= # if integrating with Tenderly, provide an account ID (optional)
TENDERLY_PROJECT_SLUG= # if integrating with Tenderly, provide a project slug (optional)
```

Below is an example of how to fully utilize zDC with all its functionality
by creating and executing a Campaign with all its entities.
1. Create individual DeployMissions for every contract you have by inheriting the `BaseDeployMission` class
and overriding required properties and possibly some methods related to your contract.
```typescript
export class CoolContractDM extends BaseDeployMission<
  HardhatRuntimeEnvironment,
  YourSignerType,
  YourProviderType,
  // an interface of all your contract instance names mapped
  // to their Typechain classes
  // the Campaign's `state.contracts` will represent an object
  // where each of your deployed contracts is returned as a callable
  // Contract with methods from Typechain
  {
    coolContract: CoolContract,
    anotherContract: AnotherContract,
    oneMoreContract: OneMoreContract,
  }
> {
  proxyData = { // required to be implemented !
    isProxy: true,
    kind: ProxyKinds.uups,
  };

  contractName = "CoolContract"; // as in .sol file, required to be implemented !
  instanceName = "coolContract"; // to access it from campaign state, required to be implemented !

  // which args are required to deploy (for CoolContract.init()
  // or CoolContract.constructor())
  // required to be overriden if any !
  async deployArgs () : Promise<TDeployArgs> {
    const {
      alreadyDeployedContract, // as callable Contract object
    } = this.campaign;

    return [ await alreadyDeployedContract.getAddress() ];
  }

  // after a contract is deployed, determine if something
  // needs to be done with it before deploying the next contract
  // override only if needed, returns "false" by default !
  async needsPostDeploy () {
    const {
      alreadyDeployedContract,
      coolContract,
      config: {
        deployAdmin,
      },
    } = this.campaign;

    const address = await alreadyDeployedContract
      .connect(deployAdmin)
      .coolContractStateVar();

    const isLinked = address === await coolContract.getAddress;

    const msg = !isLinked ? "needs" : "doesn't need";

    this.logger.debug(`${this.contractName} ${msg} post deploy sequence`);

    return !isLinked;
  }

  // what to do if `needsPostDeploy` returns `true`
  // override only if needed, is not run by default !
  async postDeploy () {
    const {
      alreadyDeployedContract,
      coolContract,
      config: {
        deployAdmin,
      },
    } = this.campaign;

    await alreadyDeployedContract
      .connect(deployAdmin)
      .setCoolContractStateVar(await coolContract.getAddress());

    this.logger.debug(`${this.contractName} post deploy sequence completed`);
  }

  // other potential overrides ...
}
```
2. Instantiate/initialize all other entities and pass them to the Campaign constructor.
```typescript
// your own code to get the config with all the data
// that a Campaign or any individual Missions may need during the deploy run
const config = getConfig();

const logger = getLogger();

deployer = new HardhatDeployer({
    hre,
    signer: config.deployAdmin,
    env: config.env,
    provider,
});

// initialize MongoDBAdapter class based on your local ENV vars
const dbAdapter = await getMongoAdapter();

const campaign = new DeployCampaign<
  HardhatRuntimeEnvironment,
  YourSignerType,
  YourProviderType,
  // an interface of all your contract instance names mapped
  // to their Typechain classes
  // the Campaign's `state.contracts` will represent an object
  // where each of your deployed contracts is returned as a callable
  // Contract with methods from Typechain
  {
    coolContract: CoolContract,
    anotherContract: AnotherContract,
    oneMoreContract: OneMoreContract,
  }
>({
  // all the Deploy Mission classes for every contract you are deploying
  // the Campaign will instantiate and call them when required
  missions: [
    CoolContractDM,
    AnotherContractDM,
    OneMoreContractDM,
  ],
  deployer,
  dbAdapter,
  logger,
  config,
});
```
3. Execute the Campaign.
```typescript
await campaign.execute();
```
4. Finalize the DB version by switching its type from `TEMP` to `DEPLOYED`.
```typescript
// passing a specific version is optional, it is recommended to leave it out
// then DBVersioner will use the version that was used during the Campaign execution
await dbAdapter.finalize(dbVersion);
```

After the Campaign is done, but while its instance still exists, you can access any of the deployed contracts
and call them right away.
```typescript
const {
  coolContract,
} = campaign;

await coolContract.doSomething();
```
After the Campaign is done and its instance is destroyed, you can access any of the deployed contracts
through the MondoDBAdapter instance, which will return a specific document that needs to be parsed to be callable.


## Developers
### Setup
1. Clone the repo.
2. Install dependencies.
```bash
yarn
```
3. Build the project.
```bash
yarn build
```

> All code should be submitted through Pull Request only! No non-PR branches should exist!