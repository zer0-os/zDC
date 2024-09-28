export const signerMock = {
    getAddress: async () => Promise.resolve("0xsignerAddress"),
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