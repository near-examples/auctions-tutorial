// Find all our documentation at https://docs.near.org
use near_sdk::json_types::U64;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};

pub mod ext;
pub use crate::ext::*;

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: NearToken,
}

pub type TokenId = String;

#[near(contract_state, serializers = [json, borsh])]
#[derive(PanicOnDefault)]
pub struct Contract {
    highest_bid: Bid,
    auction_end_time: U64,
    auctioneer: AccountId,
    claimed: bool,
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
                bid: NearToken::from_yoctonear(1),
            },
            auction_end_time: end_time,
            auctioneer,
            claimed: false,
            nft_contract,
            token_id,
        }
    }

    #[payable]
    pub fn bid(&mut self) -> Promise {
        // Assert the auction is still ongoing
        require!(
            env::block_timestamp() < self.auction_end_time.into(),
            "Auction has ended"
        );

        // Current bid
        let bid = env::attached_deposit();
        let bidder = env::predecessor_account_id();

        // Last bid
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

        assert!(!self.claimed, "Auction has already been claimed");

        self.claimed = true;

        // Transfer tokens to the auctioneer
        Promise::new(self.auctioneer.clone()).transfer(self.highest_bid.bid);

        // Transfer the NFT to the highest bidder
        nft_contract::ext(self.nft_contract.clone())
            .with_static_gas(Gas::from_tgas(30))
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .nft_transfer(self.highest_bid.bidder.clone(), self.token_id.clone());
    }

    pub fn get_highest_bid(&self) -> Bid {
        self.highest_bid.clone()
    }

    pub fn get_auction_end_time(&self) -> U64 {
        self.auction_end_time
    }

    pub fn get_auction_info(&self) -> &Contract {
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_contract() {
        let end_time: U64 = U64::from(1000);
        let alice: AccountId = "alice.near".parse().unwrap();
        let nft_contract: AccountId = "nft.near".parse().unwrap();
        let token_id: TokenId = "1".to_string();
        let contract = Contract::init(
            end_time.clone(),
            alice.clone(),
            nft_contract.clone(),
            token_id.clone(),
        );

        let default_bid = contract.get_highest_bid();
        assert_eq!(default_bid.bidder, env::current_account_id());
        assert_eq!(default_bid.bid, NearToken::from_yoctonear(1));

        let auction_info = contract.get_auction_info();
        assert_eq!(auction_info.auction_end_time, end_time);
        assert_eq!(auction_info.auctioneer, alice);
        assert_eq!(auction_info.nft_contract, nft_contract);
        assert_eq!(auction_info.token_id, token_id);
        assert_eq!(auction_info.claimed, false);
    }
}
