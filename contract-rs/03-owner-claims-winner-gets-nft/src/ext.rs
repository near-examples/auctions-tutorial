// Find all our documentation at https://docs.near.org
use near_sdk::{ext_contract, AccountId};

use crate::TokenId;

// Validator interface, for cross-contract calls
#[ext_contract(nft_contract)]
trait NFT {
    fn nft_transfer(&self, receiver_id: AccountId, token_id: TokenId) -> String;
}
