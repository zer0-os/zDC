export const signerMock = {
  address: "0xsignerAddress",
};

export const providerMock = {
  waitForTransaction: async (
    txHash : string,
    confirmations ?: number | undefined,
    timeout ?: number | undefined
  ) => Promise.resolve({
    contractAddress: "0xcontractAddress",
  }),
};