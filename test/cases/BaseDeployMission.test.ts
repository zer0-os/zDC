import { DBVersioner, DeployCampaign, HardhatDeployer, IContractState, IDeployCampaignConfig, IHardhatBase, ISignerBase, MongoDBAdapter } from "../../src";
import { HardhatMock } from "../mocks/hardhat";
import { loggerMock } from "../mocks/logger";
import { testMissions } from "../mocks/missions";
import { MongoClientMock } from "../mocks/mongo";

describe("Base deploy mission", () => {
    let campaign : DeployCampaign<IHardhatBase, ISignerBase, IDeployCampaignConfig<ISignerBase>, IContractState>;
    let hardhatMock : HardhatMock;
    let missionIdentifiers : Array<string>;
    let config : any;

    before(async () => {
        hardhatMock = new HardhatMock();

        config = {
            env: "prod",
            deployAdmin: {
              address: "0xdeployAdminAddress",
              getAddress: async () => Promise.resolve("0xdeployAdminAddress"),
            },
            postDeploy: {
              tenderlyProjectSlug: "tenderlyProject",
              monitorContracts: true,
              verifyContracts: true,
            },
        };
        
        const signerMock = {
            getAddress: async () => Promise.resolve("0xsignerAddress"),
            address: "0xsignerAddress",
        };
    
        const deployer = new HardhatDeployer({
            hre: hardhatMock,
            signer: signerMock,
            env: "prod",
        });
    
        const contractsVersion = "1.7.9";
        const dbVersion = "109381236293746234";
    
        const mongoAdapterMock = new MongoDBAdapter({
            logger: loggerMock,
            dbUri: "mongodb://mockedMongo",
            dbName: "TestDatabase",
            mongoClientClass: MongoClientMock,
            versionerClass: DBVersioner,
            dbVersion,
            contractsVersion,
        });
    
        await mongoAdapterMock.initialize(dbVersion);
    
        missionIdentifiers = [
            "needsDeploy",
            "noNeedsDeploy",
            "proxyPost",
        ];

        const postDeployRun = [
            false,
            false,
            false,
        ];

        campaign = new DeployCampaign({
            logger: loggerMock,
            missions: testMissions(
                missionIdentifiers,
                postDeployRun
              ),
            deployer,
            dbAdapter: mongoAdapterMock,
            config,
        });

        await campaign.execute();
    });
})