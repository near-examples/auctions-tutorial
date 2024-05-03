# Auction NEAR Contract

The smart contract exposes a method to bid on an auction.

```ts
@NearBindgen({})
class AuctionContract {
  highest_bid: Bid = { bidder: '', bid: BigInt(1) };
  auctionEndTime: bigint = BigInt(0);

  @initialize({ privateFunction: true })
  init({ end_time }: { end_time: bigint }) {
    this.auctionEndTime = end_time;
    this.highest_bid = { bidder: near.currentAccountId(), bid: BigInt(1) };
  }

  @call({ payableFunction: true })
  bid(): NearPromise {
    // Assert the auction is still ongoing
    assert(this.auctionEndTime > near.blockTimestamp(), "Auction has ended");

    // Current bid
    const bid = near.attachedDeposit();
    const bidder = near.predecessorAccountId();

    // Last bid
    const { bidder: lastBidder, bid: lastBid } = this.highest_bid;

    // Check if the deposit is higher than the current bid
    assert(bid > lastBid, "You must place a higher bid");

    // Update the highest bid
    this.highest_bid = { bidder, bid }; // Save the new bid

    // Transfer tokens back to the last bidder
    return NearPromise.new(lastBidder).transfer(lastBid);
  }
}
```

<br />

# Quickstart

1. Make sure you have installed [node.js](https://nodejs.org/en/download/package-manager/) >= 18.
2. Install the [`NEAR CLI`](https://github.com/near/near-cli#setup)

<br />

## 1. Build and Test the Contract
You can automatically compile and test the contract by running:

```bash
npm run build
```

<br />

## 2. Create an Account and Deploy the Contract
You can create a new account and deploy the contract by running:

```bash
near create-account <your-account.testnet> --useFaucet
near deploy <your-account.testnet> build/release/hello_near.wasm
```

<br />

## 3. Interact with the Contract
You can call the contract by running:

```bash
near call <your-account.testnet> bid '{}' --accountId <your-account.testnet> --amount 1

near view <your-account.testnet> get_highest_bid
```


