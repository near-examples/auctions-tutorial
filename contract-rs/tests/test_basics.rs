use chrono::Utc;
use near_sdk::Gas;
use near_sdk::{json_types::U128, log, NearToken};
use serde_json::json;
use contract_rs::Bid;

const FIVE_NEAR: NearToken = NearToken::from_near(50);
const FT_WASM_FILEPATH: &str = "./tests/fungible_token.wasm";

#[tokio::test]
async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    // let subscriber = tracing_subscriber::fmt()
    // // Use a more compact, abbreviated log format
    // .compact()
    // // Display source code file paths
    // .with_file(true)
    // .with_line_number(true)
    // .finish();
    // // use that subscriber to process traces emitted after this point
    // tracing::subscriber::set_global_default(subscriber)?;

    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let ft_wasm = std::fs::read(FT_WASM_FILEPATH)?;
    let ft_contract = sandbox.dev_deploy(&ft_wasm).await?;

    let root = sandbox.root_account()?;

    // Initialize contracts
    let res = ft_contract
        .call("new_default_meta")
        .args_json(serde_json::json!({
            "owner_id": root.id(),
            "total_supply": U128(1_000_000),
        }))
        .transact()
        .await?;

    assert!(res.is_success());

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

    let auctioneer = root
        .create_subaccount("auctioneer")
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
        .args_json(
            json!({"end_time": a_minute_from_now.to_string(),"auctioneer": auctioneer.id(),"ft_contract": ft_contract.id() }),
        )
        .transact()
        .await?;

    assert!(init.is_success());

    let alice_register = alice
        .call(ft_contract.id(), "storage_deposit")
        .args_json(serde_json::json!({
            "account_id": alice.id()
        }))
        .deposit(NearToken::from_yoctonear(1250000000000000000000))
        .transact()
        .await?;

    assert!(alice_register.is_success());

    let bob_register = bob
        .call(ft_contract.id(), "storage_deposit")
        .args_json(serde_json::json!({
            "account_id": bob.id()
        }))
        .deposit(NearToken::from_yoctonear(1250000000000000000000))
        .transact()
        .await?;

    assert!(bob_register.is_success());

    let contract_account_register = contract_account
        .call(ft_contract.id(), "storage_deposit")
        .args_json(serde_json::json!({
            "account_id": contract_account.id()
        }))
        .deposit(NearToken::from_yoctonear(1250000000000000000000))
        .transact()
        .await?;

    assert!(contract_account_register.is_success());

    let auctioneer_register = auctioneer
        .call(ft_contract.id(), "storage_deposit")
        .args_json(serde_json::json!({
            "account_id": auctioneer.id()
        }))
        .deposit(NearToken::from_yoctonear(1250000000000000000000))
        .transact()
        .await?;

    assert!(auctioneer_register.is_success());

    let transfer_amount = U128(100_000);
    let root_transfer_alice = root.call(ft_contract.id(), "ft_transfer")
        .args_json(serde_json::json!({
            "receiver_id": alice.id(),
            "amount": transfer_amount
        }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;
    assert!(root_transfer_alice.is_success());

    let root_transfer_bob = root.call(ft_contract.id(), "ft_transfer")
        .args_json(serde_json::json!({
            "receiver_id": bob.id(),
            "amount": transfer_amount
        }))
        .deposit(NearToken::from_yoctonear(1))
        .transact()
        .await?;

        assert!(root_transfer_bob.is_success());

    let alice_bid = alice
        .call(ft_contract.id(), "ft_transfer_call")
        .args_json(serde_json::json!({
            "receiver_id": contract_account.id(), "amount": U128(50_000), "msg": "0" }))
        .deposit(NearToken::from_yoctonear(1))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?;

    assert!(alice_bid.is_success());

    let highest_bid_json = contract.view("get_highest_bid").await?;

    let highest_bid: Bid = highest_bid_json.json::<Bid>()?;

    assert_eq!(
        highest_bid.bid,
        U128(50_000)
    );
    assert_eq!(highest_bid.bidder, *alice.id());

    Ok(())
}
