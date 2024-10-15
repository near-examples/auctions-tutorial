# Auctions Tutorial 🧑‍⚖️ 
[![](https://img.shields.io/badge/⋈%20Examples-Basics-green)](https://docs.near.org/tutorials/welcome)
[![](https://img.shields.io/badge/Contract-JS-yellow)](contract-ts)
[![](https://img.shields.io/badge/Contract-Rust-red)](contract-rs)

This repository contains examples that are used as part of the [Auction Tutorial](https://docs.near.org/vi/tutorials/auction/basic-auction) in the documentation.

The repo contains three versions of an auction contract written in both Rust and JavaScript. The first contract is a simple auction where you can place bids and claim the auction, the second introduces NFTs as a prize and the final contract uses fungible tokens to place bids.
- [JavaScript Contracts](./contract-ts)
- [Rust Contracts](./contract-rs)

This repo also has two different frontends, one for the simple auction and one for the final contract that uses FTs and NFTs.
- [Frontends](./frontends/)

Lastly, this repo contains a factory contract written in rust that is used to deploy new auctions and initialize them.
- [Factory Contract](./factory)

---

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

