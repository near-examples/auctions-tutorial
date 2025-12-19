# FT Auction Contract (Python)

This directory contains a Python smart contract that is part of the [Bidding with FTs](https://docs.near.org/tutorials/auction/bidding-with-fts) tutorial section. The contract implements an auction system where users bid using fungible tokens (FTs) instead of NEAR tokens, and the highest bidder wins an NFT prize.

## Overview

The auction contract demonstrates:
- **FT bidding mechanism**: Users bid by transferring fungible tokens
- **NEP-141 integration**: Implements `ft_on_transfer` callback standard
- **Automatic FT refunds**: Previous bidders automatically receive their FT back when outbid
- **NFT prize**: Winner receives an NFT at auction end
- **Cross-contract calls**: Integration with both FT and NFT standards

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
cd /path/to/auctions-tutorial/contract-py/03-bid-with-fts
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
- ✅ FT bidding functionality via `ft_on_transfer`
- ✅ Automatic FT refunds when outbid
- ✅ Auction timing enforcement
- ✅ FT and NFT contract integration
- ✅ Claim mechanism

---

## Quick Deployment

For a quick deployment without detailed testing:

```bash
# Create a new testnet account (if needed)
near account create-account fund-myself <your-account-id>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  network-config testnet \
  send

# Deploy the contract
near deploy <your-account-id>.testnet ./contract.wasm

# Initialize the contract (5 minutes auction with 10000 FT starting price)
FIVE_MINUTES_FROM_NOW=$(python3 -c "import time; print(int((time.time() + 400) * 1_000_000_000))")
near call <your-account-id>.testnet init \
  '{"end_time": "'$FIVE_MINUTES_FROM_NOW'", "auctioneer": "<auctioneerAccountId>", "ft_contract": "<ftContractId>", "nft_contract": "<nftContractId>", "token_id": "<tokenId>", "starting_price": "10000"}' \
  --accountId <your-account-id>.testnet
```

---

## Complete CLI Testing Guide

This comprehensive guide walks you through testing the entire FT-based auction lifecycle with NFT integration.

### Step 1: Build the Contract

```bash
cd /path/to/auctions-tutorial/contract-py/03-bid-with-fts

# Build the contract
uvx nearc contract.py
```

### Step 2: Deploy a Fungible Token Contract

The auction requires an FT contract for bidding. We'll deploy a standard FT contract:

```bash
# Create FT contract account
near account create-account fund-myself ft-auction-test.<your-account-id>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <your-account-id>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Deploy the FT contract (using a standard NEP-141 implementation)
# You'll need an FT wasm file. For testing, you can use:
# https://github.com/near-examples/FT/releases/latest/download/fungible_token.wasm
wget https://github.com/near-examples/FT/releases/latest/download/fungible_token.wasm

near deploy ft-auction-test.<your-account-id>.testnet \
  --wasmFile tests/fungible_token.wasm

# Initialize the FT contract
near call ft-auction-test.<your-account-id>.testnet new \
  '{
    "owner_id": "<your-account-id>.testnet",
    "total_supply": "1000000000",
    "metadata": {
      "spec": "ft-1.0.0",
      "name": "Auction Token",
      "symbol": "AUCT",
      "decimals": 0
    }
  }' \
  --accountId ft-auction-test.<your-account-id>.testnet
```

### Step 3: Deploy an NFT Contract

The auction needs an NFT to transfer to the winner:

```bash
# Create NFT contract account
near account create-account fund-myself nft-auction-test.<your-account-id>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <your-account-id>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Deploy the NFT contract
# You can get the NFT wasm from the 02-winner-gets-nft tests directory
near deploy nft-auction-test.<your-account-id>.testnet \
  --wasmFile ../02-winner-gets-nft/tests/non_fungible_token.wasm

# Initialize the NFT contract
near call nft-auction-test.<your-account-id>.testnet new_default_meta \
  '{"owner_id": "nft-auction-test.<your-account-id>.testnet"}' \
  --accountId nft-auction-test.<your-account-id>.testnet
```

### Step 4: Deploy the Auction Contract

```bash
# Create auction contract account
near account create-account fund-myself auction-ft.<your-account-id>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <your-account-id>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Deploy the auction contract
near deploy auction-ft.<your-account-id>.testnet \
  --wasmFile contract.wasm
```

### Step 5: Mint an NFT Prize

```bash
# Mint an NFT that will be awarded to the auction winner
near call nft-auction-test.<your-account-id>.testnet nft_mint \
  '{
    "token_id": "ft-auction-prize-2",
    "receiver_id": "auction-ft.<your-account-id>.testnet",
    "token_metadata": {
      "title": "FT Auction Prize NFT",
      "description": "Winner of the FT auction gets this NFT!",
      "media": "https://bafybeiftczwrtyr3k7a2k4vutd3amkwsmaqyhrdzlhvpt33dyjivufqusq.ipfs.dweb.link/goteam-gif.gif"
    }
  }' \
  --accountId nft-auction-test.<your-account-id>.testnet \
  --deposit 0.08
```

### Step 6: Register the Auction Contract with FT Contract

Before the auction can receive FTs, it must be registered with the FT contract:

```bash
# Register the auction contract (required for NEP-141)
near call ft-auction-test.<your-account-id>.testnet storage_deposit \
  '{"account_id": "auction-ft.<your-account-id>.testnet"}' \
  --accountId <your-account-id>.testnet \
  --deposit 0.00125
```

### Step 7: Initialize the Auction

```bash
# Set auction to end in 5 minutes (300 seconds) with starting price of 10000 FTs
END_TIME=$(python3 -c "import time; print(int((time.time() + 300) * 1_000_000_000))")

near call auction-ft.<your-account-id>.testnet init \
  "{
    \"end_time\": $END_TIME,
    \"auctioneer\": \"<your-account-id>.testnet\",
    \"ft_contract\": \"ft-auction-test.<your-account-id>.testnet\",
    \"nft_contract\": \"nft-auction-test.<your-account-id>.testnet\",
    \"token_id\": \"ft-auction-prize-3\",
    \"starting_price\": \"10000\"
  }" \
  --accountId auction-ft.<your-account-id>.testnet
```

### Step 8: Transfer Initial FTs to Auction Contract

The auction contract needs the starting price in FTs to refund to itself when first bid comes:

```bash
# Transfer starting price to auction contract
near call ft-auction-test.<your-account-id>.testnet ft_transfer \
  '{
    "receiver_id": "auction-ft.<your-account-id>.testnet",
    "amount": "10000"
  }' \
  --accountId <your-account-id>.testnet \
  --depositYocto 1
```

### Step 9: Verify Initial State

```bash
# View complete auction information
near view auction-ft.<your-account-id>.testnet get_auction_info

# View current highest bid
near view auction-ft.<your-account-id>.testnet get_highest_bid

# Verify NFT ownership (should be auction contract)
near view nft-auction-test.<your-account-id>.testnet nft_token \
  '{"token_id": "ft-auction-prize-1"}'

# Check FT balance of auction contract
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "auction-ft.<your-account-id>.testnet"}'
```

### Step 10: Create Bidder Accounts and Distribute FTs

```bash
# Create Alice's account
near account create-account fund-myself alice.<your-account-id>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <your-account-id>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Create Bob's account
near account create-account fund-myself bob.<your-account-id>.testnet '5 NEAR' \
  autogenerate-new-keypair \
  save-to-keychain \
  sign-as <your-account-id>.testnet \
  network-config testnet \
  sign-with-keychain \
  send

# Register Alice with FT contract
near call ft-auction-test.<your-account-id>.testnet storage_deposit \
  '{"account_id": "alice.<your-account-id>.testnet"}' \
  --accountId <your-account-id>.testnet \
  --deposit 0.00125

# Register Bob with FT contract
near call ft-auction-test.<your-account-id>.testnet storage_deposit \
  '{"account_id": "bob.<your-account-id>.testnet"}' \
  --accountId <your-account-id>.testnet \
  --deposit 0.00125

# Transfer FTs to Alice (50000 tokens)
near call ft-auction-test.<your-account-id>.testnet ft_transfer \
  '{"receiver_id": "alice.<your-account-id>.testnet", "amount": "50000"}' \
  --accountId <your-account-id>.testnet \
  --depositYocto 1

# Transfer FTs to Bob (100000 tokens)
near call ft-auction-test.<your-account-id>.testnet ft_transfer \
  '{"receiver_id": "bob.<your-account-id>.testnet", "amount": "100000"}' \
  --accountId <your-account-id>.testnet \
  --depositYocto 1

# Verify balances
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "alice.<your-account-id>.testnet"}'

  ####

near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "bob.<your-account-id>.testnet"}'
```

### Step 11: Place Bids Using FT Transfer

```bash
# Alice places first bid (15000 FTs) using ft_transfer_call
near call ft-auction-test.<your-account-id>.testnet ft_transfer_call \
  '{
    "receiver_id": "auction-ft.<your-account-id>.testnet",
    "amount": 15000,
    "msg": ""
  }' \
  --accountId alice.<your-account-id>.testnet \
  --depositYocto 1 \
  --gas 300000000000000

# Check highest bid (should be Alice with 25000 FTs)
near view auction-ft.<your-account-id>.testnet get_highest_bid

# Check Alice's FT balance (should have 25000 left)
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "alice.<your-account-id>.testnet"}'

# Bob places higher bid (25000 FTs)
near call ft-auction-test.<your-account-id>.testnet ft_transfer_call \
  '{
    "receiver_id": "auction-ft.<your-account-id>.testnet",
    "amount": "25000",
    "msg": ""
  }' \
  --accountId bob.<your-account-id>.testnet \
  --depositYocto 1 \
  --gas 300000000000000

# Check highest bid (should be Bob with 25000 FTs)
near view auction-ft.<your-account-id>.testnet get_highest_bid

# Check Alice's FT balance again (should have received refund: 50000)
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "alice.<your-account-id>.testnet"}'

# Check Bob's FT balance (should have 75000 left)
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "bob.<your-account-id>.testnet"}'
```

### Step 12: Test Invalid Operations

```bash
# Try to bid lower than current highest (should fail)
near call ft-auction-test.<your-account-id>.testnet ft_transfer_call \
  '{
    "receiver_id": "auction-ft.<your-account-id>.testnet",
    "amount": "20000",
    "msg": ""
  }' \
  --accountId alice.<your-account-id>.testnet \
  --depositYocto 1 \
  --gas 300000000000000

# Try to claim before auction ends (should fail)
near call auction-ft.<your-account-id>.testnet claim \
  '{}' \
  --accountId <your-account-id>.testnet \
  --gas 300000000000000
```

### Step 13: Wait for Auction to End

```bash
# Wait for the auction end time (5 minutes from initialization)
# Or you can re-initialize with a shorter time for testing

# Verify auction has ended by trying to bid (should fail)
near call ft-auction-test.<your-account-id>.testnet ft_transfer_call \
  '{
    "receiver_id": "auction-ft.<your-account-id>.testnet",
    "amount": "30000",
    "msg": ""
  }' \
  --accountId alice.<your-account-id>.testnet \
  --depositYocto 1 \
  --gas 300000000000000
```

### Step 14: Register Auctioneer with FT Contract

Before claiming, ensure the auctioneer is registered with the FT contract to receive tokens:

```bash
# Register auctioneer
near call ft-auction-test.<your-account-id>.testnet storage_deposit \
  '{"account_id": "<your-account-id>.testnet"}' \
  --accountId <your-account-id>.testnet \
  --deposit 0.00125
```

### Step 15: Claim the Auction

```bash
# Check auctioneer FT balance before claim
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "<your-account-id>.testnet"}'

# Claim the auction (transfers NFT to winner and FTs to auctioneer)
near call auction-ft.<your-account-id>.testnet claim \
  '{}' \
  --accountId <your-account-id>.testnet \
  --gas 300000000000000

# Check auctioneer FT balance after claim (should have received 25000 FTs)
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "<your-account-id>.testnet"}'
```

### Step 16: Verify NFT Transfer

```bash
# Check NFT ownership (should now be Bob!)
near view nft-auction-test.<your-account-id>.testnet nft_token \
  '{"token_id": "ft-auction-prize-1"}'

# Output should show: "owner_id": "bob.<your-account-id>.testnet"
```

### Step 17: Test Double Claim Prevention

```bash
# Try to claim again (should fail with "already claimed" error)
near call auction-ft.<your-account-id>.testnet claim \
  '{}' \
  --accountId <your-account-id>.testnet \
  --gas 300000000000000
```

### Step 18: Verify Final FT Balances

```bash
# Check all balances
near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "alice.<your-account-id>.testnet"}'  # Should be 50000

near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "bob.<your-account-id>.testnet"}'  # Should be 75000

near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "<your-account-id>.testnet"}'  # Should have 25000 from auction

near view ft-auction-test.<your-account-id>.testnet ft_balance_of \
  '{"account_id": "auction-ft.<your-account-id>.testnet"}'  # Should be 0 or 10000
```

---

## Important Notes

- **Replace `<your-account-id>`** with your actual NEAR testnet account ID
- **FT bidding**: Users bid by calling `ft_transfer_call` on the FT contract, not directly on the auction
- **Storage deposits**: All accounts must be registered with the FT contract before receiving tokens
- **Gas amounts**: FT operations require significant gas (~300 TGas recommended)
- **Timestamps**: Auction end times must be in nanoseconds
- **Starting price**: The auction contract needs to hold the starting price amount to refund itself
- **Testing**: Run `uv run pytest` before deployment to ensure contract integrity

---
## Useful Links

- [cargo-near](https://github.com/near/cargo-near) - NEAR smart contract development toolkit for Rust
- [near CLI](https://near.cli.rs) - Iteract with NEAR blockchain from command line
- [NEAR Python SDK Documentation](https://github.com/r-near/near-sdk-py)
- [NEAR Documentation](https://docs.near.org)
- [NEAR StackOverflow](https://stackoverflow.com/questions/tagged/nearprotocol)
- [NEAR Discord](https://near.chat)
- [NEAR Telegram Developers Community Group](https://t.me/neardev)
- NEAR DevHub: [Telegram](https://t.me/neardevhub), [Twitter](https://twitter.com/neardevhub)
