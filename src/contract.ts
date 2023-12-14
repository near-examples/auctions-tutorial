// Find all our documentation at https://docs.near.org
import {
  NearBindgen,
  near,
  call,
  view,
  AccountId,
  UnorderedMap,
  initialize,
  assert,
} from "near-sdk-js";

class Bid {
  bidder: AccountId;
  bid: bigint;
}

@NearBindgen({})
class AuctionContract {
  auctioneer: AccountId = "";
  highest_bid: Bid = { bidder: "", bid: BigInt(0) };
  bids: UnorderedMap<bigint> = new UnorderedMap<bigint>("b");
  auctionEndTime: bigint = BigInt(0);

  @initialize({ privateFunction: true })
  init({ auctioneer, auctionEndTime }:{ auctioneer:AccountId, auctionEndTime:bigint }) {
    this.auctioneer = auctioneer;
    this.auctionEndTime = auctionEndTime;
  }

  @call({ payableFunction: true })
  placebid(): void {
    // assert(this.auctionEndTime > near.blockTimestamp(), "Auction has ended");

    const deposit = near.attachedDeposit();
    const bidder = near.predecessorAccountId();
    // near.log(deposit);
    near.log(this.auctionEndTime);
    near.log(near.blockTimestamp());

    const pastDeposit = this.bids.get(bidder, { defaultValue: BigInt(0) });
    const totalDeposit = deposit + pastDeposit;

    assert(this.highest_bid.bid < totalDeposit, "You must place a higher bid");

    this.bids.set(bidder, totalDeposit);
    this.highest_bid = { bidder, bid: totalDeposit };
  }

  @view({})
  get_highest_bid(): Bid {
    return this.highest_bid;
  }

  @call({})
  endAuction(){
    assert(near.predecessorAccountId() == this.auctioneer, "Only auctioneer can end the auction");
    assert(this.auctionEndTime <= near.blockTimestamp(), "Auction has not ended yet");
    
    this.bids.toArray().forEach(register =>{
      const [bidder , bid] = register;
      if(bidder !== this.highest_bid.bidder){
        near.log(bidder);
        const promise = near.promiseBatchCreate(bidder);
        near.promiseBatchActionTransfer(promise, bid);
      }
    })

    const promise = near.promiseBatchCreate(this.auctioneer)
    near.promiseBatchActionTransfer(promise, this.highest_bid.bid)
    near.log("finished");

  }

}
