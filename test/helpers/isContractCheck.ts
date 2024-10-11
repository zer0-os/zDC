import assert from "node:assert";

export const assertIsContract = (contract : any) => {
  assert.strictEqual(
    typeof contract.deploymentTransaction,
    "function",
    "Not a contract. Method 'deploymentTransaction' should exist"
  );

  assert.strictEqual(
    typeof contract.getAddress,
    "function",
    "Not a contract. Method 'getAddress' should exist"
  );

  assert.strictEqual(
    typeof contract.interface,
    "object",
    "Not a contract. Property 'interface' should exist"
  );

  assert.strictEqual(
    typeof contract.target,
    "string",
    "Not a contract. Property 'target' should exist and be an address"
  );

  assert.strictEqual(
    typeof contract.waitForDeployment,
    "function",
    "Not a contract. Function 'waitForDeployment' should exist"
  );
};
