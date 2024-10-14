# Auction Factory 

This directory contains a factory contract, written in Rust, that is used to deploy new auctions and initialize them. It follows the [Auction Factory](https://docs.near.org/tutorials/auction/auction-factory) section of the auction tutorial.

## How to Build Locally?

Install the [NEAR CLI](https://docs.near.org/tools/near-cli#installation) and run:

Install the dependencies:

```bash
npm install
```

Build the contract:

```bash
npm run build
```

## How to Test Locally?

```bash
npm run test
```

## How to Deploy?

Install the [NEAR CLI](https://docs.near.org/tools/near-cli#installation) and run:

```bash
# Create a new account
near create <contractId> --useFaucet

# Deploy the contract
near deploy <contractId> ./build/auction.wasm

# Create a new auction
TWO_MINUTES_FROM_NOW=$(date -v+2M +%s000000000)
near call <contractId> deploy_new_auction '{"name": "<auctionName>", "end_time": '$TWO_MINUTES_FROM_NOW', "auctioneer": "<auctioneerAccountId>>", "ft_contract": "<nftContractId>", "nft_contract": "<nftContractId>", "token_id": "tokenId", "starting_price": "<startingPrice>"}' --accountId <accountId> --deposit 1.6 --gas  100000000000000
```