// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, NearPromise, initialize, assert } from "near-sdk-js";

class Bid {
  bidder: AccountId;
  bid: bigint;
}

const TWENTY_TGAS = BigInt("20000000000000");
const NO_DEPOSIT = BigInt(0);

@NearBindgen({ requireInit: true })
class AuctionContract {
  highest_bid: Bid = { bidder: '', bid: BigInt(0) };
  auction_end_time: bigint = BigInt(0);
  auctioneer: AccountId = "";
  claimed: boolean = false;
  nft_contract: AccountId = "";
  token_id: string = "";

  @initialize({ privateFunction: true })
  init({ end_time, auctioneer, nft_contract, token_id }: { end_time: bigint, auctioneer: AccountId, nft_contract: AccountId, token_id: string }) {
    this.auction_end_time = end_time;
    this.highest_bid = { bidder: near.currentAccountId(), bid: BigInt(1) };
    this.auctioneer = auctioneer;
    this.nft_contract = nft_contract;
    this.token_id = token_id;
  }

  @call({ payableFunction: true })
  bid(): NearPromise {
    // Assert the auction is still ongoing
    assert(this.auction_end_time > near.blockTimestamp(), "Auction has ended");

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

  @view({})
  get_highest_bid(): Bid {
    return this.highest_bid;
  }

  @view({})
  get_auction_end_time(): BigInt {
    return this.auction_end_time;
  }
  
  @view({})
  get_auction_info(): AuctionContract {
    return this;
  }

  @call({})
  claim() {
    assert(this.auction_end_time <= near.blockTimestamp(), "Auction has not ended yet");
    assert(!this.claimed, "Auction has been claimed");
    this.claimed = true;

    return NearPromise.new(this.nft_contract)
      .functionCall("nft_transfer", JSON.stringify({ receiver_id: this.highest_bid.bidder, token_id: this.token_id }), BigInt(1), TWENTY_TGAS)
      .then(NearPromise.new(this.auctioneer).transfer(this.highest_bid.bid))
  }
}
