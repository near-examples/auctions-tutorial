# NFT Auction contract

This directory contains a Rust contract that is used as part of the [Winning an NFT](https://docs.near.org/tutorials/auction/winning-an-nft) part of the auction tutorial.

In this part the contract is adapted so the auction is initialized with an NFT and the winner of the auction is sent the NFT. It is a great way to learn how to work with NFTs in NEAR.

## How to Build Locally?

Install [`cargo-near`](https://github.com/near/cargo-near) and run:

```bash
cargo near build
```

## How to Test Locally?

```bash
cargo test
```

## How to Deploy?

To deploy manually, install [NEAR CLI](https://docs.near.org/tools/near-cli#installation) and run:

```bash
# Create a new account
near create <contractId> --useFaucet

# Deploy the contract on it
MINUTE_FROM_NOW=$(date -v+2M +%s000000000)
cargo near deploy <contractId> 

# Initialize the contract
TWO_MINUTES_FROM_NOW=$(date -v+2M +%s000000000)
near call <contractId> init '{"end_time": "'$TWO_MINUTES_FROM_NOW'", "auctioneer": "<auctioneerAccountId>", "nft_contract": "<nftContractId>", "token_id": "<tokenId>"}' --accountId <contractId>
```