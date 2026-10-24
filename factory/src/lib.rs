// Find all our documentation at https://docs.near.org
use near_sdk::{near, AccountId, PanicOnDefault};

mod deploy;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    global_contract_id: AccountId,
}

#[near]
impl Contract {
    /// The auction implementation must already be published as a global contract.
    #[init]
    pub fn new(global_contract_id: AccountId) -> Self {
        Self { global_contract_id }
    }

    pub fn get_global_contract_id(&self) -> AccountId {
        self.global_contract_id.clone()
    }
}
