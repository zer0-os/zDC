import assert from "node:assert";
import { HardhatDeployer } from "../../src";
import { signerMock } from "../mocks/accounts";
import { HardhatMock } from "../mocks/hardhat";
import { assertIsContract } from "../helpers/isContractCheck";


describe("Hardhat Deployer", () => {
  let hardhatMock : HardhatMock;
  let hhDeployer : any;

  beforeEach(async () => {
    hardhatMock = new HardhatMock();
    hhDeployer = new HardhatDeployer({
      hre: hardhatMock,
      signer: signerMock,
      env: "prod",
    });
  });

  it("#getFactory() Should call getContractFactory with correct params", async () => {
    const contractName = "contractFactory";

    await hhDeployer.getFactory(contractName);

    const callStack = hardhatMock.called[0];

    assert.equal(
      callStack.methodName,
      "getContractFactory"
    );
    assert.equal(
      callStack.args.contractName,
      contractName
    );
    assert.equal(
      callStack.args.signerOrOptions.address,
      signerMock.address
    );
  });

  it("#getContractObject() Should return contract object with attached address", async () => {
    const contractName = "contractObject";
    const contractAddress = `0xcontractAddress_${contractName}`;

    const contractObject = await hhDeployer.getContractObject(
      contractName,
      signerMock.address
    );

    const callStack = hardhatMock.called;

    assert.equal(
      callStack[1].methodName,
      "attach"
    );
    assert.equal(
      contractObject.target,
      contractAddress
    );
    assert.equal(
      await contractObject.getAddress(),
      contractAddress
    );
    assert.equal(
      await contractObject.getAddress(),
      contractAddress
    );

    assert.equal(
      callStack[0].methodName,
      "getContractFactory"
    );
    // make sure it's contract
    assertIsContract(contractObject);
  });

  it("#deployProxy() Should call deployProxy with correct arguments and return the contract", async () => {
    const contractName = "deployProxy";
    const contractArgs = {
      contractName,
      args: [`arg_${contractName}_1`, `arg_${contractName}_2`],
      kind: "uups",
    };

    const contract = await hhDeployer.deployProxy(contractArgs);

    const callStack = hardhatMock.called;

    assert.equal(
      callStack[1].methodName,
      "deployProxy"
    );
    assert.deepEqual(
      callStack[1].args,
      contractArgs
    );

    // extra checks
    assert.equal(
      callStack[0].methodName,
      "getContractFactory"
    );
    assertIsContract(contract);
  });

  it("#deployContract() Should call deploy with correct arguments and return the contract", async () => {
    const contractName = "deployContract";
    const contractArgs = [`arg_${contractName}_1`, `arg_${contractName}_2`];

    const contract = await hhDeployer.deployContract(
      contractName,
      contractArgs
    );

    const callStack = hardhatMock.called;

    assert.equal(
      callStack[1].methodName,
      "deploy"
    );
    assert.deepEqual(
      callStack[1].args,
      contractArgs
    );

    // extra checks
    assert.equal(
      callStack[0].methodName,
      "getContractFactory"
    );
    assertIsContract(contract);
  });
});