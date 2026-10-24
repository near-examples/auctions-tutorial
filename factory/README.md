# Auction Factory

Creates locked subaccounts using the FT/NFT auction in [`contract-rs/03-bid-with-fts`](../contract-rs/03-bid-with-fts).
The factory stores a global contract account ID instead of embedding or storing auction WASM. Every child references that published implementation.

## Build and test

Install Rust through rustup and [cargo-near](https://github.com/near/cargo-near):

```bash
cargo install cargo-near --version 0.21.1 --locked
cargo near build non-reproducible-wasm
cargo test --locked
```

Tests build both the factory and auction from source, start `near-sandbox`, publish the auction as global code, create an auction, verify its global reference and absence of access keys, and exercise FT bids. They also check insufficient deposits, invalid names, and refunds on duplicate account creation or a missing global implementation. No public network or credentials are needed; the first run downloads dependencies and the sandbox binary.

## Publish the auction implementation

Build the FT auction from its directory:

```bash
cd ../contract-rs/03-bid-with-fts
cargo near build non-reproducible-wasm
near contract deploy-as-global use-file target/near/auction_contract.wasm as-global-account-id <global-auction.testnet>
```

Use an existing funded publisher account and choose testnet and its signing credentials when prompted by [NEAR CLI](https://near.cli.rs).
Publishing global code has a one-time cost; children pay for their state and reference instead of storing copies of the WASM.
Account-ID global contracts follow future code updates published by that account. Use a publisher you control and trust: updating it updates the implementation used by existing auctions too.

## Deploy the factory

Create a funded factory account using `near account create-account`, then from this directory deploy and initialize atomically:

```bash
near contract deploy <factory.testnet> use-file target/near/contract.wasm with-init-call new json-args '{"global_contract_id":"<global-auction.testnet>"}'
```

Choose zero initialization deposit, testnet, and the factory account as signer when prompted. The old embedded-code state and `update_auction_contract`/`get_code` APIs are removed; use a new factory account for this version.

## Create an auction

Compute an end time in nanoseconds, for example two minutes from now:

```bash
node -e 'console.log((BigInt(Date.now() + 120000) * 1000000n).toString())'
```

Replace placeholders in this JSON:

```json
{
  "name": "my-auction",
  "end_time": "<nanosecond timestamp>",
  "auctioneer": "<seller.testnet>",
  "ft_contract": "<ft.testnet>",
  "nft_contract": "<nft.testnet>",
  "token_id": "1",
  "starting_price": "10000"
}
```

Query `get_required` with `{ "args": { ... } }`, using the same fields except `name`. It returns the required deposit in yoctoNEAR as a string. This funds a conservative state-storage estimate plus 0.1 NEAR for FT/NFT calls; long token IDs increase the requirement. All attached funds go to the child. Ordinary short arguments fit within a 0.2 NEAR deposit.

```bash
near contract call-function as-transaction <factory.testnet> deploy_new_auction json-args '<JSON above>' prepaid-gas '300 Tgas' attached-deposit '0.2 NEAR'
```

Continue with your signer and testnet when prompted. Names must be valid single subaccount labels, without dots; the full child ID must fit NEAR's 64-character limit. The contract rejects expired deadlines and insufficient deposits. Failed creation returns `false` and refunds the attached deposit through a callback; successful creation returns `true`.

The factory creates `<name>.<factory.testnet>`, references global code, and calls `init` in one atomic batch. Initialization is public so the factory can call it; a successfully created child is already initialized and has no access keys.

Before accepting bids, transfer the NFT to the child and register the child, bidders, and seller with the FT contract's `storage_deposit`. Bidders use `ft_transfer_call` on that FT contract with the child as receiver and exactly 1 yoctoNEAR attached. See the [auction README](../contract-rs/03-bid-with-fts/README.md).
