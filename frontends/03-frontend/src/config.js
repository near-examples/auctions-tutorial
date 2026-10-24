export const NetworkId = process.env.NEXT_PUBLIC_NETWORK_ID || 'testnet';
export const AUCTION_CONTRACT = process.env.NEXT_PUBLIC_AUCTION_CONTRACT || 'auction-example.testnet';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ||
  (NetworkId === 'mainnet' ? 'https://free.rpc.fastnear.com' : 'https://test.rpc.fastnear.com');
