use near_sdk::json_types::{U128, U64};
use near_sdk::{env, log, near, require, AccountId, Gas, NearToken, Promise, PromiseError};

use crate::{Contract, ContractExt};

#[near(serializers = [json, borsh])]
pub struct AuctionInitArgs {
    end_time: U64,
    auctioneer: AccountId,
    ft_contract: AccountId,
    nft_contract: AccountId,
    token_id: String,
    starting_price: U128,
}

#[near]
impl Contract {
    /// Fund state storage and leave 0.1 NEAR for outgoing FT/NFT calls.
    /// This conservative bound includes the account, global reference, STATE
    /// record, and highest bidder (whose ID is at most 64 bytes).
    pub fn get_required(&self, args: AuctionInitArgs) -> NearToken {
        let bytes = 512
            + self.global_contract_id.as_str().len()
            + near_sdk::borsh::to_vec(&args).unwrap().len();
        env::storage_byte_cost()
            .saturating_mul(bytes as u128)
            .saturating_add(NearToken::from_millinear(100))
    }

    #[payable]
    pub fn deploy_new_auction(
        &mut self,
        name: String,
        end_time: U64,
        auctioneer: AccountId,
        ft_contract: AccountId,
        nft_contract: AccountId,
        token_id: String,
        starting_price: U128,
    ) -> Promise {
        // Require a single direct subaccount label; dots would create descendants.
        require!(
            !name.is_empty() && !name.contains('.'),
            "Invalid auction name"
        );
        let account: AccountId = format!("{name}.{}", env::current_account_id())
            .parse()
            .expect("Invalid auction account ID");
        require!(
            end_time.0 > env::block_timestamp(),
            "Auction must end in the future"
        );

        let args = AuctionInitArgs {
            end_time,
            auctioneer,
            ft_contract,
            nft_contract,
            token_id,
            starting_price,
        };
        let init_args = near_sdk::serde_json::to_vec(&args).unwrap();
        let required = self.get_required(args);
        let attached = env::attached_deposit();
        require!(attached >= required, format!("Attach at least {required}"));

        // The entire batch is atomic, including initialization. No access key
        // is installed, so the newly created auction account is locked.
        Promise::new(account.clone())
            .create_account()
            .transfer(attached)
            .use_global_contract_by_account_id(self.global_contract_id.clone())
            .function_call(
                "init".to_owned(),
                init_args,
                NearToken::from_near(0),
                Gas::from_tgas(50),
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(Gas::from_tgas(30))
                    .deploy_new_auction_callback(account, env::predecessor_account_id(), attached),
            )
    }

    #[private]
    pub fn deploy_new_auction_callback(
        &mut self,
        account: AccountId,
        user: AccountId,
        attached: NearToken,
        #[callback_result] create_deploy_result: Result<(), PromiseError>,
    ) -> bool {
        if create_deploy_result.is_ok() {
            log!("Created auction {}", account);
            true
        } else {
            log!(
                "Failed to create {}, refunding {} to {}",
                account,
                attached,
                user
            );
            Promise::new(user).transfer(attached).detach();
            false
        }
    }
}
