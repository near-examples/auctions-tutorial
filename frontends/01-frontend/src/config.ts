const contractPerNetwork = {
  testnet: '889d3efcab5e7bd444ca6196557a059acd41e44fb3b7155ad5d22385198ea162', // <- your deployed contract account
};

export const NetworkId = 'testnet';
export const AUCTION_CONTRACT = contractPerNetwork[NetworkId];

// Chains for EVM Wallets
const evmWalletChains = {
  mainnet: {
    chainId: 397,
    name: 'Near Mainnet',
    explorer: 'https://eth-explorer.near.org',
    rpc: 'https://eth-rpc.mainnet.near.org',
  },
  testnet: {
    chainId: 398,
    name: 'Near Testnet',
    explorer: 'https://eth-explorer-testnet.near.org',
    rpc: 'https://eth-rpc.testnet.near.org',
  },
};

export const EVMWalletChain = evmWalletChains[NetworkId];
