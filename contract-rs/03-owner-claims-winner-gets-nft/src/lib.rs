// Find all our documentation at https://docs.near.org
use near_sdk::json_types::{U64};
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault,Promise};

pub mod ext;
pub use crate::ext::*;

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: NearToken,
}

pub type TokenId = String;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    highest_bid: Bid,
    auction_end_time: U64,
    auctioneer: AccountId,
    auction_was_claimed: bool,
    nft_contract: AccountId,
    token_id: TokenId,
}

#[near]
impl Contract {
    #[init]
    #[private] // only callable by the contract's account
    pub fn init(
        end_time: U64,
        auctioneer: AccountId,
        nft_contract: AccountId,
        token_id: TokenId,
    ) -> Self {
        Self {
            highest_bid: Bid {
                bidder: env::current_account_id(),
                bid: NearToken::from_yoctonear(0),
            },
            auction_end_time: end_time,
            auctioneer,
            auction_was_claimed: false,
            nft_contract,
            token_id,
        }
    }

    pub fn get_highest_bid(&self) -> Bid {
        self.highest_bid.clone()
    }

    #[payable]
    pub fn bid(&mut self) -> Promise {
        // Assert the auction is still ongoing
        require!(
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
        require!(bid > last_bid, "You must place a higher bid");

        // Update the highest bid
        self.highest_bid = Bid { bidder, bid };

        // Transfer tokens back to the last bidder
        Promise::new(last_bidder).transfer(last_bid)
    }

    pub fn claim(&mut self) {
        assert!(
            env::block_timestamp() > self.auction_end_time.into(),
            "Auction has not ended yet"
        );

        assert!(!self.auction_was_claimed, "Auction has been claimed");

        self.auction_was_claimed = true;
        let auctioneer = self.auctioneer.clone();

        Promise::new(auctioneer).transfer(self.highest_bid.bid);

        nft_contract::ext(self.nft_contract.clone())
            .with_static_gas(Gas::from_tgas(30))
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .nft_transfer(self.highest_bid.bidder.clone(), self.token_id.clone());
    }
}
