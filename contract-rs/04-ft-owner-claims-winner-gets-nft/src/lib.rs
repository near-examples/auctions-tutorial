// Find all our documentation at https://docs.near.org
use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault};

pub mod ext;
pub use crate::ext::*;

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: U128,
}

pub type TokenId = String;

#[near(contract_state,serializers = [json, borsh])]
#[derive(PanicOnDefault)]
pub struct Contract {
    highest_bid: Bid,
    auction_end_time: U64,
    auctioneer: AccountId,
    claimed: bool,
    ft_contract: AccountId,
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
        ft_contract: AccountId,
        nft_contract: AccountId,
        token_id: TokenId,
    ) -> Self {
        Self {
            highest_bid: Bid {
                bidder: env::current_account_id(),
                bid: U128(0),
            },
            auction_end_time: end_time,
            auctioneer,
            claimed: false,
            ft_contract,
            nft_contract,
            token_id,
        }
    }

    pub fn get_highest_bid(&self) -> Bid {
        self.highest_bid.clone()
    }

    pub fn get_info(&self) -> &Contract {
        self
    }

    pub fn claim(&mut self) {
        assert!(
            env::block_timestamp() > self.auction_end_time.into(),
            "Auction has not ended yet"
        );

        assert!(!self.claimed, "Auction has been claimed");

        self.claimed = true;

        ft_contract::ext(self.ft_contract.clone())
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .with_static_gas(Gas::from_tgas(30))
            .ft_transfer(self.auctioneer.clone(), self.highest_bid.bid);

        nft_contract::ext(self.nft_contract.clone())
            .with_static_gas(Gas::from_tgas(30))
            .with_attached_deposit(NearToken::from_yoctonear(1))
            .nft_transfer(self.highest_bid.bidder.clone(), self.token_id.clone());
    }

    // Users bid by transferring FT tokens
    pub fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> U128 {
        require!(
            env::block_timestamp() < self.auction_end_time.into(),
            "Auction has ended"
        );

        let ft = env::predecessor_account_id();
        require!(ft == self.ft_contract, "The token is not supported");

        let Bid {
            bidder: last_bidder,
            bid: last_bid,
        } = self.highest_bid.clone();

        require!(amount >= last_bid, "You must place a higher bid");

        self.highest_bid = Bid {
            bidder: sender_id,
            bid: amount,
        };

        if last_bid > U128(0) {
            ft_contract::ext(self.ft_contract.clone())
                .with_attached_deposit(NearToken::from_yoctonear(1))
                .with_static_gas(Gas::from_tgas(30))
                .ft_transfer(last_bidder, last_bid);
        }

        U128(0)
    }
}
