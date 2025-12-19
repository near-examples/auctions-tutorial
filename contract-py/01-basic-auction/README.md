# Basic Auction Contract (Python)

> A production-ready auction smart contract built with Python for NEAR Protocol. Place bids, get automatic refunds, and let the highest bidder win!

[![Python](https://img.shields.io/badge/Python-3.13+-blue.svg)](https://www.python.org/)
[![NEAR](https://img.shields.io/badge/NEAR-Protocol-green.svg)](https://near.org/)
---

## ✨ Features

- 🎯 **Smart Bidding System** - Place bids with NEAR tokens
- 💸 **Automatic Refunds** - Previous bidder gets instantly refunded when outbid
- ⏰ **Time-Based Auction** - Set custom auction end time
- 🎁 **Secure Claiming** - Auctioneer claims proceeds after auction ends
- 🔒 **Security First** - Prevents double claiming and post-auction bidding
- ✅ **Full Test Coverage** - Comprehensive test suite included

---

## 📋 Contract Methods

### Initialization
```python
init(end_time: int, auctioneer: str)
```
Initialize auction with end time (nanoseconds) and auctioneer account

### Call Methods (State-Changing)
| Method | Description | Payable |
|--------|-------------|---------|
| `bid()` | Place a bid (must be higher than current) | ✅ Yes |
| `claim()` | Claim auction proceeds (auctioneer only) | ❌ No |

### View Methods (Read-Only)
| Method | Returns | Description |
|--------|---------|-------------|
| `get_highest_bid()` | `{bidder, bid}` | Current highest bid info |
| `get_auction_end_time()` | `int` | Auction end time (nanoseconds) |
| `get_auctioneer()` | `string` | Auctioneer account ID |
| `get_claimed()` | `bool` | Whether auction has been claimed |

---

## 🛠 Development Setup

### Prerequisites

<details>
<summary>📦 Install Python & Emscripten (Click to expand)</summary>

```bash
# Install Python (if not already installed)
# Use your system's package manager or download from https://www.python.org/downloads/

# Install Emscripten (required for compiling Python contracts to WebAssembly)
# For Linux/macOS:
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
# Add to your .bashrc or .zshrc for permanent installation:
# echo 'source "/path/to/emsdk/emsdk_env.sh"' >> ~/.bashrc
cd ..

# For Windows:
# Download and extract: https://github.com/emscripten-core/emsdk
# Then in Command Prompt:
# cd emsdk
# emsdk install latest
# emsdk activate latest
# emsdk_env.bat

# Verify installation with:
emcc --version
```
</details>

<details>
<summary>🔧 Install Development Tools (Click to expand)</summary>

```bash
# Install uv for Python package management
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install NEAR CLI-RS to deploy and interact with the contract
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh
```
</details>

### Build the Contract

```bash
uvx nearc contract.py
```

---

## 🧪 Testing

### Run All Tests

```bash
uv run pytest
```

### Test Coverage

Our comprehensive test suite covers:
- ✅ **Initialization** - Contract setup and state
- ✅ **First Bid** - Initial bidding functionality
- ✅ **Multiple Bids** - Bid updates with automatic refunds
- ✅ **Lower Bid Rejection** - Security validation
- ✅ **Early Claim Prevention** - Time-lock enforcement
- ✅ **Post-Auction Bidding** - Prevents bids after end time

---

## 📦 Deployment Guide

### Step 1: Create Subaccounts (One-Time Setup)

```bash
# Create contract subaccount (needs 5 NEAR for storage)
near account create-account fund-myself auction.<your-account-id>.testnet '5 NEAR' autogenerate-new-keypair save-to-keychain sign-as <your-account-id>.testnet network-config testnet sign-with-keychain send

# Optional: Create test bidder accounts
near account create-account fund-myself bidder1.<your-account-id>.testnet '5 NEAR' autogenerate-new-keypair save-to-keychain sign-as <your-account-id>.testnet network-config testnet sign-with-keychain send

near account create-account fund-myself bidder2.<your-account-id>.testnet '5 NEAR' autogenerate-new-keypair save-to-keychain sign-as <your-account-id>.testnet network-config testnet sign-with-keychain send
```

### Step 2: Build & Deploy

```bash
# Build the contract
uvx nearc contract.py

# Deploy to testnet
near contract deploy auction.<your-account-id>.testnet use-file ./contract.wasm without-init-call network-config testnet sign-with-keychain send
```

### Step 3: Initialize Auction

```bash
# Set auction to end in 5 minutes
END_TIME=$(echo "($(date +%s) + 300) * 1000000000" | bc)
near contract call-function as-transaction auction.<your-account-id>.testnet init json-args "{\"end_time\": $END_TIME, \"auctioneer\": \"<your-account-id>.testnet\"}" prepaid-gas '30 Tgas' attached-deposit '0 NEAR' sign-as auction.<your-account-id>.testnet network-config testnet sign-with-keychain send
```

### Step 4: Place Bids

```bash
# Bidder1 places 1 NEAR bid
near call auction.<your-account-id>.testnet bid '{}' \
  --accountId bidder1.<your-account-id>.testnet \
  --deposit 1 \
  --gas 30000000000000 \
  --networkId testnet

# Bidder2 places 2.5 NEAR bid (bidder1 gets refunded automatically)
near call auction.<your-account-id>.testnet bid '{}' \
  --accountId bidder2.<your-account-id>.testnet \
  --deposit 2.5 \
  --gas 30000000000000 \
  --networkId testnet

# Check current highest bid
near contract call-function as-read-only auction.<your-account-id>.testnet get_highest_bid json-args {} network-config testnet now
```

### Step 5: Check Balances

```bash
near account view-account-summary <your-account-id>.testnet network-config testnet now
near account view-account-summary bidder1.<your-account-id>.testnet network-config testnet now
near account view-account-summary bidder2.<your-account-id>.testnet network-config testnet now
```

### Step 6: Claim Proceeds (After Auction Ends)

```bash
# Wait for auction to end, then claim as auctioneer
near call auction.<your-account-id>.testnet claim '{}' \
  --accountId <your-account-id>.testnet \
  --gas 100000000000000 \
  --networkId testnet
```

---

## 🔍 View Commands (No Gas Required)

```bash
# Get highest bid
near contract call-function as-read-only auction.<your-account-id>.testnet get_highest_bid json-args {} network-config testnet now

# Get auction end time
near contract call-function as-read-only auction.<your-account-id>.testnet get_auction_end_time json-args {} network-config testnet now

# Check if claimed
near contract call-function as-read-only auction.<your-account-id>.testnet get_claimed json-args {} network-config testnet now

# Check auctioneer
near contract call-function as-read-only auction.<your-account-id>.testnet get_auctioneer json-args {} network-config testnet now
```

---

### Documentation
- 📖 [NEAR Python SDK](https://github.com/r-near/near-sdk-py) - Python SDK documentation
- 🌐 [NEAR Documentation](https://docs.near.org) - Official NEAR docs
- 🔧 [NEAR CLI](https://near.cli.rs) - Command-line interface docs

### Development Tools
- 🦀 [cargo-near](https://github.com/near/cargo-near) - Rust contract toolkit
- 🔍 [NEAR Explorer](https://explorer.testnet.near.org) - Blockchain explorer
- 📊 [NEAR Blocks](https://nearblocks.io) - Block explorer


