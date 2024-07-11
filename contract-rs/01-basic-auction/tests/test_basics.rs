use chrono::Utc;
use contract_rs::Bid;
use near_sdk::{log, NearToken};
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

    let bob = root
        .create_subaccount("bob")
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

    // Deploy and initialize contract
    let contract = contract_account.deploy(&contract_wasm).await?.unwrap();

    let now = Utc::now().timestamp();
    let a_minute_from_now = (now + 60) * 1000000000;
    log!("a_minute_from_now: {}", a_minute_from_now);

    let init = contract
        .call("init")
        .args_json(json!({"end_time": a_minute_from_now.to_string()}))
        .transact()
        .await?;

    assert!(init.is_success());

    // Alice makes first bid
    let alice_bid = alice
        .call(contract.id(), "bid")
        .deposit(NearToken::from_near(1))
        .transact()
        .await?;

    assert!(alice_bid.is_success());

    let highest_bid_json = contract.view("get_highest_bid").await?;
    let highest_bid: Bid = highest_bid_json.json::<Bid>()?;

    assert_eq!(highest_bid.bid, NearToken::from_near(1));
    assert_eq!(highest_bid.bidder, *alice.id());

    // Bob makes second bid
    let bob_bid = bob
        .call(contract.id(), "bid")
        .deposit(NearToken::from_near(2))
        .transact()
        .await?;

    assert!(bob_bid.is_success());

    let highest_bid_json = contract.view("get_highest_bid").await?;
    let highest_bid: Bid = highest_bid_json.json::<Bid>()?;

    assert_eq!(highest_bid.bid, NearToken::from_near(2));
    assert_eq!(highest_bid.bidder, *bob.id());

    // Alice makes the third bid but fails
    let alice_bid = alice
        .call(contract.id(), "bid")
        .deposit(NearToken::from_near(1))
        .transact()
        .await?;

    assert!(alice_bid.is_failure());

    let highest_bid_json = contract.view("get_highest_bid").await?;
    let highest_bid: Bid = highest_bid_json.json::<Bid>()?;

    assert_eq!(highest_bid.bid, NearToken::from_near(2));
    assert_eq!(highest_bid.bidder, *bob.id());

    Ok(())
}
