# Basic Auction Frontend

A Next.js frontend for [`01-basic-auction`](../../contract-rs/01-basic-auction).
Connect a wallet with `@hot-labs/near-connect`, read contracts with `near-api-js` 7, bid, and claim after expiry. Amounts are converted with exact integer arithmetic.

## Run locally

Use Node.js 22.22.2+ (CI uses Node.js 24):

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Set `NEXT_PUBLIC_AUCTION_CONTRACT` to your deployed, initialized auction. Set `NEXT_PUBLIC_NETWORK_ID` to `testnet` or `mainnet`; optionally override `NEXT_PUBLIC_RPC_URL`. Public variables are included at build time, so rebuild after changing them.

To show historical bids, set the server-only `API_KEY` to your [NearBlocks API key](https://docs.near.org/tutorials/auction/indexing-historical-data#near-blocks-api-key). Without it the history panel displays an unavailable message; wallet connections, reads, bids, and claims still work. Never prefix this key with `NEXT_PUBLIC_`.

```bash
npm test
npm run build
npm start
```

The tests cover precise NEAR/FT conversions, fractional amounts, invalid input, u128 overflow, session restoration, wallet events and cleanup, reads before sign-in, and exact transaction amounts. Wallet approval requires a browser and a funded account on the configured network.
