use chrono::Utc;
use contract_rs::Bid;
use near_sdk::{Gas, NearToken};
use near_workspaces::result::ExecutionFinalResult;
use serde_json::json;

const FIVE_NEAR: NearToken = NearToken::from_near(5);
const NFT_WASM_FILEPATH: &str = "./tests/non_fungible_token.wasm";

#[tokio::test]

async fn test_contract_is_operational() -> Result<(), Box<dyn std::error::Error>> {
    let sandbox = near_workspaces::sandbox().await?;
    let contract_wasm = near_workspaces::compile_project("./").await?;

    let nft_wasm = std::fs::read(NFT_WASM_FILEPATH)?;
    let nft_contract = sandbox.dev_deploy(&nft_wasm).await?;

    let root: near_workspaces::Account = sandbox.root_account()?;

    // Initialize NFT contract
    let res = nft_contract
        .call("new_default_meta")
        .args_json(serde_json::json!({"owner_id": root.id()}))
        .transact()
        .await?;

    assert!(res.is_success());

    // Create accounts
    let alice = create_subaccount(&root, "alice").await?;
    let auctioneer = create_subaccount(&root, "auctioneer").await?;
    let bob = create_subaccount(&root, "bob").await?;
    let contract_account = create_subaccount(&root, "contract").await?;

    // Mint NFT
    let request_payload = json!({
        "token_id": "1",
        "receiver_id": contract_account.id(),
        "metadata": {
            "title": "LEEROYYYMMMJENKINSSS",
            "description": "Alright time's up, let's do this.",
            "media": "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1"
        },
    });

    let res = contract_account
        .call(nft_contract.id(), "nft_mint")
        .args_json(request_payload)
        .deposit(NearToken::from_millinear(80))
        .transact()
        .await?;

    assert!(res.is_success());

    // Deploy and initialize auction contract
    let contract = contract_account.deploy(&contract_wasm).await?.unwrap();

    let now = Utc::now().timestamp();
    let a_minute_from_now = (now + 60) * 1000000000;

    let init: ExecutionFinalResult = contract
        .call("init")
        .args_json(
            json!({"end_time": a_minute_from_now.to_string(),"auctioneer": auctioneer.id(),"nft_contract":nft_contract.id(),"token_id":"1" }),
        )
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

    // Bob makes a higher bid
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

    // Alice tries to make a bid with less NEAR than the previous
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

    // Auctioneer claims auction but did not finish
    let auctioneer_claim = auctioneer
        .call(contract_account.id(), "claim")
        .args_json(json!({}))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?;

    assert!(auctioneer_claim.is_failure());

    // Fast forward
    // ~0.3 seconds * 400 = 120 seconds = 2 minutes
    let blocks_to_advance = 400;
    sandbox.fast_forward(blocks_to_advance).await?;

    let auctioneer_claim = auctioneer
        .call(contract_account.id(), "claim")
        .args_json(json!({}))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?;

    assert!(auctioneer_claim.is_success());

    let auctioneer_balance = auctioneer.view_account().await?.balance;
    assert!(auctioneer_balance <= NearToken::from_near(7));
    assert!(auctioneer_balance > NearToken::from_millinear(6990));

    // Check auctioneer received the NFT
    let token_info: serde_json::Value = nft_contract
        .call("nft_token")
        .args_json(json!({"token_id": "1"}))
        .transact()
        .await?
        .json()
        .unwrap();
    let owner_id: String = token_info["owner_id"].as_str().unwrap().to_string();

    assert_eq!(
        owner_id,
        bob.id().to_string(),
        "token owner is not the highest bidder"
    );

    // Auctioneer tries to claim the auction again
    let auctioneer_claim = auctioneer
        .call(contract_account.id(), "claim")
        .args_json(json!({}))
        .gas(Gas::from_tgas(300))
        .transact()
        .await?;

    assert!(auctioneer_claim.is_failure());

    // Alice tries to make a bid when the auction is over
    let alice_bid = alice
        .call(contract.id(), "bid")
        .deposit(NearToken::from_near(3))
        .transact()
        .await?;

    assert!(alice_bid.is_failure());

    Ok(())
}

async fn create_subaccount(
    root: &near_workspaces::Account,
    name: &str,
) -> Result<near_workspaces::Account, Box<dyn std::error::Error>> {
    let subaccount = root
        .create_subaccount(name)
        .initial_balance(FIVE_NEAR)
        .transact()
        .await?
        .unwrap();

    Ok(subaccount)
}