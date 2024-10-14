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

- [Creating a simple smart contract](./1.1-basic.md#the-contracts-state)
- [Writing tests for a contract](./1.2-testing.md)
- [Deploying a contract to testnet](./1.3-deploy.md)
- [Locking a contract](./1.3-deploy.md#locking-the-contract)
- [Creating a frontend to interact with the contract](./2.1-frontend.md)
- [Using an indexing API to view historical bids](./2.2-indexing.md)
- [Making cross-contract calls](./3.1-nft.md#transferring-the-nft-to-the-winner)
- [Using Non-Fungible Tokens](./3.1-nft.md)
- [Using Fungible Tokens](./3.2-ft.md) 
- [Modifying a factory contract to deploy your own contracts](./4-factory.md)

