# Auctions Tutorial 🧑‍⚖️
[![](https://img.shields.io/badge/⋈%20Examples-Basics-green)](https://docs.near.org/tutorials/welcome)
[![](https://img.shields.io/badge/Contract-Rust-red)](contract-rs)

This repository contains examples that are used as part of the [Auction Tutorial](https://docs.near.org/tutorials/auction/basic-auction) in the documentation.

The repo contains three versions of an auction contract written in Rust. The first contract is a simple auction where you can place bids and claim the auction, the second introduces NFTs as a prize and the final contract uses fungible tokens to place bids.

- [Rust Contracts](./contract-rs)

This repo also has two different frontends, one for the simple auction and one for the final contract that uses FTs and NFTs.

- [Frontends](./frontends/)

Lastly, this repo contains a factory contract written in Rust that creates locked auction subaccounts using a published global contract.

- [Factory Contract](./factory)

## Development

Contracts use Rust 1.97.1 (selected by each `rust-toolchain.toml`) and NEAR SDK 5.29.1.
Install [cargo-near](https://github.com/near/cargo-near) (`cargo install cargo-near --version 0.21.1 --locked`).
From any contract directory, run `cargo near build non-reproducible-wasm` to build and `cargo test --locked` to run unit and integration tests.
Integration tests start a local `near-sandbox` node and use `near-api`; no testnet account is needed.
The first run downloads Rust dependencies and the sandbox binary. NFT/FT WASM files under `tests/` are token fixtures.
The factory tests build the auction from source and publish it globally inside the sandbox.

Frontends require Node.js 22.22.2+ (Node.js 24 is used in CI). From either frontend directory, run `npm ci`, `npm test`, and `npm run dev`.
They use `@hot-labs/near-connect` for wallet connections and `near-api-js` 7 for RPC calls.
See each frontend README for contract, network, RPC, and optional bid-history configuration.

The factory's state and initialization API have changed: deploy a new factory with `new({ global_contract_id })`.
Its [README](./factory/README.md) explains publishing auction code and creating auctions.

## What These Examples Show

- [Creating a simple smart contract](https://docs.near.org/tutorials/auction/basic-auction#the-contracts-state)
- [Writing tests for a contract](https://docs.near.org/tutorials/auction/sandbox-testing)
- [Deploying a contract to testnet](https://docs.near.org/tutorials/auction/deploy)
- [Locking a contract](https://docs.near.org/tutorials/auction/deploy#locking-the-contract)
- [Creating a frontend to interact with the contract](https://docs.near.org/tutorials/auction/creating-a-frontend)
- [Using an indexing API to view historical bids](https://docs.near.org/tutorials/auction/indexing-historical-data)
- [Making cross-contract calls](https://docs.near.org/tutorials/auction/winning-an-nft#transferring-the-nft-to-the-winner)
- [Using Non-Fungible Tokens](https://docs.near.org/tutorials/auction/winning-an-nft)
- [Using Fungible Tokens](https://docs.near.org/tutorials/auction/bidding-with-fts)
- [Modifying a factory contract to deploy your own contracts](https://docs.near.org/tutorials/auction/auction-factory)

