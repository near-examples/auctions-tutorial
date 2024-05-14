// Find all our documentation at https://docs.near.org
use near_sdk::json_types::U128;
use near_sdk::{ext_contract, AccountId};

pub const NO_DEPOSIT: u128 = 0;
pub const XCC_SUCCESS: u64 = 1;

// Validator interface, for cross-contract calls
#[ext_contract(ft_contract)]
trait FT {
    fn ft_transfer(&self, receiver_id: AccountId, amount: U128) -> String;
}
