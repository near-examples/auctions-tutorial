// Find all our documentation at https://docs.near.org
import { NearBindgen, near, call, view, AccountId, NearPromise, initialize, assert, PromiseIndex } from "near-sdk-js";
import { predecessorAccountId } from "near-sdk-js/lib/api";

class Bid {
  bidder: AccountId;
  bid: bigint;
}

const FIVE_TGAS = BigInt("5000000000000");
const NO_DEPOSIT = BigInt(0);
const NO_ARGS = JSON.stringify({});

@NearBindgen({ requireInit: true })
class AuctionContract {
  highest_bid: Bid = { bidder: '', bid: BigInt(1) };
  auction_end_time: bigint = BigInt(0);
  auctioneer: string = "";
  auction_was_claimed: boolean = false;
  ft_contract: AccountId = "";

  @initialize({ privateFunction: true })
  init({ end_time, auctioneer, ft_contract }: { end_time: bigint, auctioneer: string, ft_contract: AccountId }) {
    this.auction_end_time = end_time;
    this.highest_bid = { bidder: near.currentAccountId(), bid: BigInt(0) };
    this.auctioneer = auctioneer;
    this.ft_contract = ft_contract;
  }

  // @call({ payableFunction: true })
  // bid(): NearPromise {
  //   // Assert the auction is still ongoing
  //   assert(this.auction_end_time > near.blockTimestamp(), "Auction has ended");

  //   // Current bid
  //   const bid = near.attachedDeposit();
  //   const bidder = near.predecessorAccountId();

  //   // Last bid
  //   const { bidder: lastBidder, bid: lastBid } = this.highest_bid;

  //   // Check if the deposit is higher than the current bid
  //   assert(bid > lastBid, "You must place a higher bid");

  //   // Update the highest bid
  //   this.highest_bid = { bidder, bid }; // Save the new bid

  //   // Transfer tokens back to the last bidder
  //   return NearPromise.new(lastBidder).transfer(lastBid);
  // }

  @view({})
  get_highest_bid(): Bid {
    return this.highest_bid;
  }

  @view({})
  get_auction_end_time(): BigInt {
    return this.auction_end_time;
  }

  @call({})
  claim() {
    // assert(near.predecessorAccountId() == this.auctioneer, "Only auctioneer can end the auction");
    assert(this.auction_end_time <= near.blockTimestamp(), "Auction has not ended yet");
    assert(!this.auction_was_claimed, "Auction has been claimed");

    this.auction_was_claimed = true;
    return NearPromise.new(this.auctioneer).transfer(this.highest_bid.bid);
  }

  @call({})
  ft_on_transfer({ sender_id, amount, msg }: { sender_id: AccountId, amount: bigint, msg: String }) {

    const previous = { ...this.highest_bid };

    assert(this.auction_end_time > near.blockTimestamp(), "Auction has ended");
    assert(near.predecessorAccountId() == this.ft_contract, "The token is not supported");
    assert(amount >= previous.bid, "You must place a higher bid");

    this.highest_bid = {
      bidder: sender_id,
      bid: amount,
    };

    if (previous.bid > 0) {
      near.log("inside bid");
      // this.ft_transfer(this.highest_bid.bidder, this.highest_bid.bid)
      return NearPromise.new(this.ft_contract)
        .functionCall("ft_transfer", JSON.stringify({ receiver_id: previous.bidder, amount: previous.bid }), BigInt(1), BigInt("30000000000000"))
        .then(
          NearPromise.new(near.currentAccountId())
            .functionCall("ft_transfer_callback", JSON.stringify({}), NO_DEPOSIT, BigInt("30000000000000"))
        )
        .asReturn()
    } else {
      return BigInt(0);
    }
  }

  @call({ privateFunction: true })
  ft_transfer_callback({ }): BigInt {
    return BigInt(0);
  }
}

function promiseResult(i: PromiseIndex): { result: string; success: boolean } {
  near.log("promiseResult");
  let result, success;

  try {
    result = near.promiseResult(i);
    success = true;
  } catch {
    result = undefined;
    success = false;
  }

  return { result, success };
}