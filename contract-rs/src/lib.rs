// Find all our documentation at https://docs.near.org
use near_sdk::json_types::U64;
use near_sdk::{env, near, AccountId, NearToken, PanicOnDefault, Promise};

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: NearToken,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    highest_bid: Bid,
    auction_end_time: U64,
    auctioneer: AccountId,
    auction_was_claimed: bool,
}

#[near]
impl Contract {
    #[init]
    #[private] // only callable by the contract's account
    pub fn init(end_time: U64,auctioneer: AccountId) -> Self {
        Self {
            highest_bid: Bid {
                bidder: env::current_account_id(),
                bid: NearToken::from_yoctonear(1),
            },
            auction_end_time: end_time,
            auctioneer: auctioneer,
            auction_was_claimed: false,
        }
    }

    #[payable]
    pub fn bid(&mut self) -> Promise {
        // Assert the auction is still ongoing
        assert!(
            env::block_timestamp() < self.auction_end_time.into(),
            "Auction has ended"
        );

        // current bid
        let bid = env::attached_deposit();
        let bidder = env::predecessor_account_id();

        // last bid
        let Bid {
            bidder: last_bidder,
            bid: last_bid,
        } = self.highest_bid.clone();

        // Check if the deposit is higher than the current bid
        assert!(bid > last_bid, "You must place a higher bid");

        // Update the highest bid
        self.highest_bid = Bid { bidder, bid };

        // Transfer tokens back to the last bidder
        Promise::new(last_bidder).transfer(last_bid)
    }

    pub fn get_highest_bid(&self) -> Bid {
        self.highest_bid.clone()
    }

    pub fn get_auction_end_time(&self) -> U64 {
        self.auction_end_time
    }

    pub fn auction_end(&mut self) -> Promise {
        assert!(env::predecessor_account_id() == self.auctioneer, "You must place a higher bid");
        assert!(env::block_timestamp() < self.auction_end_time.into(), "Auction has not ended yet");
        assert!(!self.auction_was_claimed, "Auction has been claimed");
        self.auction_was_claimed = true;
        let auctioneer = self.auctioneer.clone();
        Promise::new(auctioneer).transfer(self.highest_bid.bid)
    }
}

/*
 * The rest of this file holds the inline tests for the code above
 * Learn more about Rust tests: https://doc.rust-lang.org/book/ch11-01-writing-tests.html
 */
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_contract() {
        let auctioneer: AccountId = "auctioneer.testnet".parse().unwrap();
        let contract = Contract::init(U64::from(1000), auctioneer);

        let default_bid = contract.get_highest_bid();
        assert_eq!(default_bid.bidder, env::current_account_id());
        assert_eq!(default_bid.bid, NearToken::from_yoctonear(1));

        let end_time = contract.get_auction_end_time();
        assert_eq!(end_time, U64::from(1000));
    }
}
