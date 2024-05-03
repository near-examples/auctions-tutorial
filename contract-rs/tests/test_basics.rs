use chrono::Utc;
use contract_rs::OBid;
use near_sdk::{json_types::U128, log, NearToken};
use serde_json::json;

const FIVE_NEAR: NearToken = NearToken::from_near(5);

#[tokio::test]
async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let root = sandbox.root_account()?;

    let alice = root
        .create_subaccount("alice")
        .initial_balance(FIVE_NEAR)
        .transact()
        .await?
        .unwrap();

    let contract_account = root
        .create_subaccount("contract")
        .initial_balance(FIVE_NEAR)
        .transact()
        .await?
        .unwrap();

    let contract = contract_account.deploy(&contract_wasm).await?.unwrap();

    let now = Utc::now().timestamp();
    let a_minute_from_now = (now + 60000) * 1000000000;
    log!("a_minute_from_now: {}", a_minute_from_now);

    let init = contract
        .call("init")
        .args_json(json!({"end_time": a_minute_from_now.to_string()}))
        .transact()
        .await?;

    assert!(init.is_success());

    let alice_bid = alice
        .call(contract.id(), "bid")
        .deposit(NearToken::from_near(1))
        .transact()
        .await?;

    assert!(alice_bid.is_success());

    let highest_bid_json = contract.view("get_highest_bid").await?;

    let highest_bid: OBid = highest_bid_json.json::<OBid>()?;

    assert_eq!(
        highest_bid.bid,
        U128::from(NearToken::from_near(1).as_yoctonear())
    );
    assert_eq!(highest_bid.bidder, *alice.id());

    Ok(())
}
