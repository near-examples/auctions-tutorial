# NFT Auction Contract (Python)

This directory contains a Python smart contract that is part of the [Winning an NFT](https://docs.near.org/tutorials/auction/winning-an-nft) tutorial section. The contract implements an auction system where the highest bidder wins an NFT prize.

## Overview

The auction contract demonstrates:
- **Bidding mechanism**: Users can place bids in NEAR tokens
- **Automatic refunds**: Previous bidders are automatically refunded when outbid
- **NFT prize**: Winner receives an NFT at auction end
- **Cross-contract calls**: Integration with NEAR NFT standards

## Prerequisites

Before you begin, ensure you have the following installed:

```bash
# Check NEAR CLI version
near --version

# Login to your testnet account
near login
```

---

## Installation & Setup

### 1. Install Python

```bash
# Use your system's package manager or download from https://www.python.org/downloads/
# macOS with Homebrew:
brew install python

# Linux (Ubuntu/Debian):
sudo apt-get install python3 python3-pip
```

### 2. Install Emscripten

Emscripten is required for compiling Python contracts to WebAssembly.

**For Linux/macOS:**

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# Add to your shell profile for permanent installation:
echo 'source "/path/to/emsdk/emsdk_env.sh"' >> ~/.bashrc
# or for zsh:
echo 'source "/path/to/emsdk/emsdk_env.sh"' >> ~/.zshrc

cd ..
```

**For Windows:**

```cmd
# Download and extract: https://github.com/emscripten-core/emsdk
# Then in Command Prompt:
cd emsdk
emsdk install latest
emsdk activate latest
emsdk_env.bat
```

**Verify installation:**

```bash
emcc --version
```

### 3. Install UV Package Manager

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 4. Install NEAR CLI-RS

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh
```

---

## Building the Contract

Navigate to the contract directory and compile:

```bash
cd /path/to/auctions-tutorial/contract-py/02-winner-gets-nft
uvx nearc contract.py
```

This will generate `contract.wasm` file ready for deployment.

---

## Running Tests

Run the test suite to verify contract functionality:

```bash
uv run pytest
```

The tests cover:
- ✅ Bidding functionality
- ✅ Automatic refunds when outbid
- ✅ Auction timing enforcement
- ✅ NFT contract integration
- ✅ Claim mechanism

---

## Quick Deployment

For a quick deployment without detailed testing:

```bash
# Create a new testnet account (if needed)
near account create-account fund-myself <contractId>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  network-config testnet \
  send

# Deploy the contract
near deploy <contractId>.testnet ./contract.wasm

# Initialize the contract (2 minutes auction)
TWO_MINUTES_FROM_NOW=$(python3 -c "import time; print(int((time.time() + 120) * 1_000_000_000))")
near call <contractId>.testnet init \
  '{"end_time": "'$TWO_MINUTES_FROM_NOW'", "auctioneer": "<auctioneerAccountId>", "nft_contract": "<nftContractId>", "token_id": "<tokenId>"}' \
  --accountId <contractId>.testnet
```

---

## Complete CLI Testing Guide

This comprehensive guide walks you through testing the entire auction lifecycle with NFT integration.

### Step 1: Build the Contract

```bash
cd /path/to/auctions-tutorial/contract-py/02-winner-gets-nft

# Build the contract
uvx nearc contract.py
```

### Step 2: Deploy an NFT Contract

The auction needs an NFT to transfer to the winner. Deploy an NFT contract first:

```bash
# Create NFT contract account
near account create-account fund-myself nft-auction-test.<contractId>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <contractId>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Deploy the NFT contract
near deploy nft-auction-test.<contractId>.testnet \
  --wasmFile tests/non_fungible_token.wasm

# Initialize the NFT contract
near call nft-auction-test.<contractId>.testnet new_default_meta \
  '{"owner_id": "nft-auction-test.<contractId>.testnet"}' \
  --accountId nft-auction-test.<contractId>.testnet
```

### Step 3: Deploy the Auction Contract

```bash
# Create auction contract account
near account create-account fund-myself auction.<contractId>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <contractId>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Deploy the auction contract
near deploy auction.<contractId>.testnet \
  --wasmFile contract.wasm
```

### Step 4: Mint an NFT Prize

```bash
# Mint an NFT that will be awarded to the auction winner
near call nft-auction-test.<contractId>.testnet nft_mint \
  '{
    "token_id": "auction-prize-2",
    "receiver_id": "auction.<contractId>.testnet",
    "token_metadata": {
      "title": "Auction Prize NFT",
      "description": "Winner of the auction gets this NFT!",
      "media": "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif"
    }
  }' \
  --accountId nft-auction-test.<contractId>.testnet \
  --deposit 0.08
```

### Step 5: Initialize the Auction

```bash
# Set auction to end in 5 minutes (300 seconds)
END_TIME=$(($(date +%s + 300) * 1000000000))

near call auction.<contractId>.testnet init \
  "{
    \"end_time\": $END_TIME,
    \"auctioneer\": \"<contractId>.testnet\",
    \"nft_contract\": \"nft-auction-test.<contractId>.testnet\",
    \"token_id\": \"auction-prize-2\"
  }" \
  --accountId auction.<contractId>.testnet
```

### Step 6: Verify Initial State

```bash
# View complete auction information
near view auction.<contractId>.testnet get_auction_info

# View current highest bid
near view auction.<contractId>.testnet get_highest_bid

# Verify NFT ownership (should be auction contract)
near view nft-auction-test.<contractId>.testnet nft_token \
  '{"token_id": "auction-prize-2"}'
```

### Step 7: Create Bidder Accounts

```bash
# Create Alice's account
near account create-account fund-myself alice.<contractId>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <contractId>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Create Bob's account
near account create-account fund-myself bob.<contractId>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <contractId>.testnet \
  network-config testnet \
  sign-with-keychain \
  send
```

### Step 8: Place Bids

```bash
# Alice places first bid (1 NEAR)
near call auction.<contractId>.testnet bid \
  '{}' \
  --accountId alice.<contractId>.testnet \
  --deposit 1

# Check highest bid (should be Alice with 1 NEAR)
near view auction.<contractId>.testnet get_highest_bid

# Check Alice's balance before Bob bids
near state alice.<contractId>.testnet

# Bob places higher bid (2 NEAR)
near call auction.<contractId>.testnet bid \
  '{}' \
  --accountId bob.<contractId>.testnet \
  --deposit 2

# Check highest bid (should be Bob with 2 NEAR)
near view auction.<contractId>.testnet get_highest_bid

# Check Alice's balance again (should have received refund)
near state alice.<contractId>.testnet
```

### Step 9: Test Invalid Operations

```bash
# Try to bid lower than current highest (should fail)
near call auction.<contractId>.testnet bid \
  '{}' \
  --accountId alice.<contractId>.testnet \
  --deposit 1.5

# Try to claim before auction ends (should fail)
near call auction.<contractId>.testnet claim \
  '{}' \
  --accountId <contractId>.testnet \
  --gas 300000000000000
```

### Step 10: Wait for Auction to End

```bash
# Wait for the auction end time (5 minutes from initialization)
# Or you can re-initialize with a shorter time for testing

# Verify auction has ended by trying to bid (should fail)
near call auction.<contractId>.testnet bid \
  '{}' \
  --accountId alice.<contractId>.testnet \
  --deposit 3
```

### Step 11: Claim the Auction

```bash
# Check auctioneer balance before claim
near state <contractId>.testnet

# Claim the auction (transfers NFT to winner and funds to auctioneer)
near call auction.<contractId>.testnet claim \
  '{}' \
  --accountId <contractId>.testnet \
  --gas 300000000000000

# Check auctioneer balance after claim (should have received ~2 NEAR)
near state <contractId>.testnet
```

### Step 12: Verify NFT Transfer

```bash
# Check NFT ownership (should now be Bob!)
near view nft-auction-test.<contractId>.testnet nft_token \
  '{"token_id": "auction-prize-2"}'

# Output should show: "owner_id": "bob.<contractId>.testnet"
```

### Step 13: Test Double Claim Prevention

```bash
# Try to claim again (should fail with "already claimed" error)
near call auction.<contractId>.testnet claim \
  '{}' \
  --accountId <contractId>.testnet \
  --gas 300000000000000
```

---

## Important Notes

- **Replace `<contractId>`** with your actual NEAR testnet account ID
- **NEAR amounts**: Use `--deposit` in NEAR tokens (e.g., `1` for 1 NEAR, not yoctoNEAR)
- **Gas amounts**: Specified in Gas units (e.g., `300000000000000` = 300 TGas)
- **Timestamps**: Auction end times must be in nanoseconds
- **Testing**: Run `uv run pytest` before deployment to ensure contract integrity

---

## Useful Links

- [NEAR Python SDK Documentation](https://github.com/r-near/near-sdk-py) - Python SDK reference
- [NEAR CLI](https://near.cli.rs) - Command line interface documentation
- [NEAR Documentation](https://docs.near.org) - Complete NEAR protocol docs
- [Auction Tutorial](https://docs.near.org/tutorials/auction/winning-an-nft) - Original tutorial
- [NEAR StackOverflow](https://stackoverflow.com/questions/tagged/nearprotocol) - Get help from the community
- [NEAR Discord](https://near.chat) - Join the developer community
- [NEAR Telegram Developers Group](https://t.me/neardev) - Real-time developer support
- [NEAR DevHub](https://t.me/neardevhub) - Developer resources and updates
  - [Twitter](https://twitter.com/neardevhub)

