use near_sdk::serde::Serialize;
use near_sdk::json_types::{U128, U64};
use near_sdk::{env, log, near, AccountId, NearToken, Promise, PromiseError};

use crate::{Contract, ContractExt, NEAR_PER_STORAGE, NO_DEPOSIT, TGAS};

pub type TokenId = String;

#[derive(Serialize)]
#[serde(crate = "near_sdk::serde")]
struct AuctionInitArgs {
    end_time: U64,
    auctioneer: AccountId,
    ft_contract: AccountId,
    nft_contract: AccountId,
    token_id: TokenId,
    starting_price: U128,
}

#[near]
impl Contract {
    #[payable]
    pub fn deploy_new_auction(
        &mut self,
        name: String,
        end_time: U64,
        auctioneer: AccountId,
        ft_contract: AccountId,
        nft_contract: AccountId,
        token_id: TokenId,
        starting_price: U128,
    ) -> Promise {
        // Assert the sub-account is valid
        let current_account = env::current_account_id().to_string();
        let subaccount: AccountId = format!("{name}.{current_account}").parse().unwrap();
        assert!(
            env::is_valid_account_id(subaccount.as_bytes()),
            "Invalid subaccount"
        );

        // Assert enough tokens are attached to create the account and deploy the contract
        let attached = env::attached_deposit();

        let code = self.code.clone().unwrap();
        let contract_bytes = code.len() as u128;
        let minimum_needed = NEAR_PER_STORAGE.saturating_mul(contract_bytes);
        assert!(
            attached >= minimum_needed,
            "Attach at least {minimum_needed} yⓃ"
        );

        let args = &AuctionInitArgs {
            end_time,
            auctioneer,
            ft_contract,
            nft_contract,
            token_id,
            starting_price,
        };

        let init_args = near_sdk::serde_json::to_vec(args).unwrap();

        let promise = Promise::new(subaccount.clone())
            .create_account()
            .transfer(attached)
            .deploy_contract(code)
            .function_call(
                "init".to_owned(),
                init_args,
                NO_DEPOSIT,
                TGAS.saturating_mul(5),
            );

        // Add callback
        promise.then(
            Self::ext(env::current_account_id()).create_factory_subaccount_and_deploy_callback(
                subaccount,
                env::predecessor_account_id(),
                attached,
            ),
        )
    }

    #[private]
    pub fn create_factory_subaccount_and_deploy_callback(
        &mut self,
        account: AccountId,
        user: AccountId,
        attached: NearToken,
        #[callback_result] create_deploy_result: Result<(), PromiseError>,
    ) -> bool {
        if let Ok(_result) = create_deploy_result {
            log!("Correctly created and deployed to {}", account);
            return true;
        };

        log!(
            "Error creating {}, returning {}yⓃ to {}",
            account,
            attached,
            user
        );
        Promise::new(user).transfer(attached);
        false
    }
}
