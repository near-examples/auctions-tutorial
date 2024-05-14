// Find all our documentation at https://docs.near.org
use near_sdk::{env, near, AccountId, Gas, NearToken, PanicOnDefault, Promise};
use near_sdk::json_types::U64;
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: U128,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    highest_bid: Bid,
    auction_end_time: U64,
    auctioneer: AccountId,
    auction_was_claimed: bool,
    ft_account_id: AccountId,
}

const NO_DEPOSIT: NearToken = NearToken::from_near(0);
// const CALL_GAS: Gas = Gas(5_000_000_000_000);
// const CALL_GAS: Gas = Gas(5_000_000_000_000);
const CALL_GAS: Gas = Gas::from_tgas(200); // 200 TGAS
#[near]
impl Contract {

    #[init]
    #[private] // only callable by the contract's account
    pub fn init(end_time: U64,auctioneer: AccountId,ft_account_id: AccountId) -> Self {
        Self {
            highest_bid: Bid {
                bidder: env::current_account_id(),
                bid: U128(0),
            },
            auction_end_time: end_time,
            auctioneer: auctioneer,
            auction_was_claimed: false,
            ft_account_id:ft_account_id
        }
    }

    pub fn get_highest_bid(&self) -> Bid {
        self.highest_bid.clone()
    }

    pub fn get_auction_end_time(&self) -> U64 {
        self.auction_end_time
    }

    // pub fn auction_end(&mut self) -> Promise {
    //     assert!(env::predecessor_account_id() == self.auctioneer, "You must place a higher bid");
    //     assert!(env::block_timestamp() < self.auction_end_time.into(), "Auction has not ended yet");
    //     assert!(!self.auction_was_claimed, "Auction has been claimed");
    //     self.auction_was_claimed = true;
    //     let auctioneer = self.auctioneer.clone();
    //     Promise::new(auctioneer).transfer(self.highest_bid.bid)
    // }

    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
      ) -> Promise {
        
        assert!(
            env::block_timestamp() < self.auction_end_time.into(),
            "Auction has ended"
        );

        let token_in = env::predecessor_account_id();
        assert!(token_in == self.ft_account_id, "{}", "The token is not supported");

        let Bid {
            bidder: last_bidder,
            bid: last_bid,
        } = self.highest_bid.clone();

        assert!(amount >= last_bid, "{}", "You must place a higher bid");
    
       

        let args = json!({ "receiver_id": last_bidder, "amount":last_bid })
                .to_string().into_bytes().to_vec();

        let promise = Promise::new(self.ft_account_id.clone())
        .function_call("ft_transfer".to_string(), args, NO_DEPOSIT, CALL_GAS)
        .then(
            Promise::new(env::current_account_id()).function_call("ft_transfer".to_string(), args, NO_DEPOSIT, CALL_GAS)
        );

        self.highest_bid = Bid { 
            bidder:sender_id, 
            bid:amount 
        };
        return  promise;
  
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
