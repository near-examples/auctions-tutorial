use chrono::Utc;
use near_sdk::{json_types::U128, NearToken};
use near_sdk::{near, AccountId, Gas};
use near_workspaces::result::ExecutionFinalResult;
use near_workspaces::{Account, Contract};
use serde_json::json;

const TEN_NEAR: NearToken = NearToken::from_near(10);
const FT_WASM_FILEPATH: &str = "./tests/fungible_token.wasm";

#[near(serializers = [json])]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: U128,
}

#[tokio::test]

async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;

    let root: near_workspaces::Account = sandbox.root_account()?;

    // Create accounts
    let alice = create_subaccount(&root, "alice").await?;
    let auctioneer = create_subaccount(&root, "auctioneer").await?;
    let contract_account = create_subaccount(&root, "contract").await?;
    let nft_account = create_subaccount(&root, "nft").await?;

    let ft_wasm = std::fs::read(FT_WASM_FILEPATH)?;
    let ft_contract = sandbox.dev_deploy(&ft_wasm).await?;

    // Initialize FT contract
    let res = ft_contract
        .call("new_default_meta")
        .args_json(serde_json::json!({
            "owner_id": root.id(),
            "total_supply": U128(1_000_000),
        }))
        .transact()
        .await?;

    assert!(res.is_success());

    // Skip creating NFT contract as we are are only going to test making a bid to the auction

    // Deploy factory contract
    let contract_wasm = near_workspaces::compile_project("./").await?;
    let contract = contract_account.deploy(&contract_wasm).await?.unwrap();

    // Create auction by calling factory contract
    let now = Utc::now().timestamp();
    let a_minute_from_now = (now + 60) * 1000000000;
    let starting_price = U128(10_000);

    let deploy_new_auction: ExecutionFinalResult = alice
        .call(contract.id(), "deploy_new_auction")
        .args_json(
            json!({"name": "new-auction", "end_time": a_minute_from_now.to_string(),"auctioneer": auctioneer.id(),"ft_contract": ft_contract.id(),"nft_contract": nft_account.id(),"token_id":"1", "starting_price":starting_price }),
        )
        .max_gas()
        .deposit(NearToken::from_millinear(1600))
        .transact()
        .await?;

    assert!(deploy_new_auction.is_success());

    let auction_account_id: AccountId = format!("new-auction.{}", contract.id()).parse().unwrap();

    // Register accounts
    for account_id in [alice.id().clone(), auction_account_id.clone()].iter() {
        let register = ft_contract
            .call("storage_deposit")
            .args_json(serde_json::json!({ "account_id": account_id }))
            .deposit(NearToken::from_yoctonear(8000000000000000000000))
            .transact()
            .await?;

        assert!(register.is_success());
    }

    // Transfer FTs
    let transfer_amount = U128(150_000);

    let root_transfer_alice =
        ft_transfer(&root, alice.clone(), ft_contract.clone(), transfer_amount).await?;
    assert!(root_transfer_alice.is_success());

    // Alice makes a bid
    let alice_bid = ft_transfer_call(
        alice.clone(),
        ft_contract.id(),
        &auction_account_id,
        U128(50_000),
    )
    .await?;

    assert!(alice_bid.is_success());

    let highest_bid_alice: Bid = alice
        .view(&auction_account_id, "get_highest_bid")
        .args_json({})
        .await?
        .json()?;
    assert_eq!(highest_bid_alice.bid, U128(50_000));
    assert_eq!(highest_bid_alice.bidder, *alice.id());

    let contract_account_balance: U128 = ft_balance_of(&ft_contract, &auction_account_id).await?;
    assert_eq!(contract_account_balance, U128(50_000));
    let alice_balance_after_bid: U128 = ft_balance_of(&ft_contract, alice.id()).await?;
    assert_eq!(alice_balance_after_bid, U128(100_000));

    // Try to launch a new auction with insufficient deposit
    let deploy_new_auction: ExecutionFinalResult = alice
        .call(contract.id(), "deploy_new_auction")
        .args_json(
            json!({"name": "new-auction", "end_time": a_minute_from_now.to_string(),"auctioneer": auctioneer.id(),"ft_contract": ft_contract.id(),"nft_contract": nft_account.id(),"token_id":"1", "starting_price":starting_price }),
        )
        .max_gas()
        .deposit(NearToken::from_millinear(1400))
        .transact()
        .await?;

    assert!(deploy_new_auction.is_failure());

    Ok(())
}

async fn create_subaccount(
    root: &near_workspaces::Account,
    name: &str,
) -> Result<near_workspaces::Account, Box<dyn std::error::Error>> {
    let subaccount = root
        .create_subaccount(name)
        .initial_balance(TEN_NEAR)
        .transact()
        .await?
        .unwrap();

    Ok(subaccount)
}

async fn ft_transfer(
    root: &near_workspaces::Account,
    account: Account,
    ft_contract: Contract,
    transfer_amount: U128,
) -> Result<ExecutionFinalResult, Box<dyn std::error::Error>> {
    let transfer = root
        .call(ft_contract.id(), "ft_transfer")
        .args_json(serde_json::json!({
            "receiver_id": account.id(),
            "amount": transfer_amount
        }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    Ok(transfer)
}

async fn ft_balance_of(
    ft_contract: &Contract,
    account_id: &AccountId,
) -> Result<U128, Box<dyn std::error::Error>> {
    let result = ft_contract
        .view("ft_balance_of")
        .args_json(json!({"account_id": account_id}))
        .await?
        .json()?;

    Ok(result)
}

async fn ft_transfer_call(
    account: Account,
    ft_contract_id: &AccountId,
    receiver_id: &AccountId,
    amount: U128,
) -> Result<ExecutionFinalResult, Box<dyn std::error::Error>> {
    let transfer = account
        .call(ft_contract_id, "ft_transfer_call")
        .args_json(serde_json::json!({
            "receiver_id": receiver_id, "amount":amount, "msg": "0" }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?;
    Ok(transfer)
}
