// Find all our documentation at https://docs.near.org
use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, AccountId, NearToken, PanicOnDefault, Promise};

#[near(serializers = [json])]
pub struct OutputBid {
    pub bidder: AccountId,
    pub bid: U128,
}

#[near(serializers = [borsh])]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: NearToken,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    highest_bid: Bid,
    auction_end_time: u64,
}

#[near]
impl Contract {
    #[init]
    #[private] // only callable by the contract's account
    pub fn init(end_time: U64) -> Self {
        Self {
            highest_bid: Bid {
                bidder: env::current_account_id(),
                bid: NearToken::from_yoctonear(1),
            },
            auction_end_time: u64::from(end_time),
        }
    }

    #[payable]
    pub fn bid(&mut self) -> Promise {
        // Assert the auction is still ongoing
        assert!(
            env::block_timestamp() < self.auction_end_time,
            "Auction has ended"
        );

        // current bid
        let bid = env::attached_deposit();
        let bidder = env::predecessor_account_id();

        // last bid
        let last_bidder = self.highest_bid.bidder.clone();
        let last_bid = self.highest_bid.bid;

        // Check if the deposit is higher than the current bid
        assert!(bid > last_bid, "You must place a higher bid");

        // Update the highest bid
        self.highest_bid = Bid { bidder, bid };

        // Transfer tokens back to the last bidder
        Promise::new(last_bidder).transfer(last_bid)
    }

    pub fn get_highest_bid(&self) -> OutputBid {
        let bidder = self.highest_bid.bidder.clone();
        let bid = self.highest_bid.bid;
        OutputBid {
            bidder,
            bid: U128::from(bid.as_yoctonear()),
        }
    }

    pub fn get_auction_end_time(&self) -> U64 {
        U64::from(self.auction_end_time)
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
        let contract = Contract::init(U64::from(1000));

        let default_bid = contract.get_highest_bid();
        assert_eq!(default_bid.bidder, env::current_account_id());
        assert_eq!(default_bid.bid, 1.into());

        let end_time = contract.get_auction_end_time();
        assert_eq!(end_time, U64::from(1000));
    }
}
