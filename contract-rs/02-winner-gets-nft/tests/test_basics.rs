use near_api::{AccountId, NearGas, NearToken};
use near_sdk::serde_json::json;

#[derive(near_sdk::serde::Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: NearToken,
}

const NFT_WASM_FILEPATH: &str = "./tests/non_fungible_token.wasm";

#[tokio::test]
async fn test_contract_is_operational() -> testresult::TestResult<()> {
    // Build the contract wasm file
    let contract_wasm_path = cargo_near_build::build_with_cli(Default::default())?;
    let contract_wasm = std::fs::read(contract_wasm_path)?;

    // Read the NFT wasm file
    let nft_wasm = std::fs::read(NFT_WASM_FILEPATH)?;

    // Initialize the sandbox
    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let sandbox_network =
        near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);

    // Create accounts
    let alice = create_subaccount(&sandbox, "alice.sandbox").await?;
    let bob = create_subaccount(&sandbox, "bob.sandbox").await?;
    let auctioneer = create_subaccount(&sandbox, "auctioneer.sandbox").await?;
    let nft_contract = create_subaccount(&sandbox, "nft-contract.sandbox")
        .await?
        .as_contract();
    let contract = create_subaccount(&sandbox, "contract.sandbox")
        .await?
        .as_contract();

    // Initialize signer for the contract deployment
    let signer = near_api::Signer::from_secret_key(
        near_sandbox::config::DEFAULT_GENESIS_ACCOUNT_PRIVATE_KEY
            .parse()
            .unwrap(),
    )?;

    // Deploy the NFT contract
    near_api::Contract::deploy(nft_contract.account_id().clone())
        .use_code(nft_wasm)
        .with_init_call(
            "new_default_meta",
            json!({"owner_id": nft_contract.account_id()}),
        )?
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Mint NFT
    const TOKEN_ID: &str = "1";
    let request_payload = json!({
        "token_id": TOKEN_ID,
        "receiver_id": contract.account_id(),
        "token_metadata": {
            "title": "LEEROYYYMMMJENKINSSS",
            "description": "Alright time's up, let's do this.",
            "media": "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse3.mm.bing.net%2Fth%3Fid%3DOIP.Fhp4lHufCdTzTeGCAblOdgHaF7%26pid%3DApi&f=1"
        },
    });

    nft_contract
        .call_function("nft_mint", request_payload)
        .transaction()
        .deposit(NearToken::from_millinear(80))
        .with_signer(nft_contract.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Deploy the contract with the init call
    let now = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)?
        .as_secs();
    let a_minute_from_now = (now + 60) * 1000000000;
    near_api::Contract::deploy(contract.account_id().clone())
        .use_code(contract_wasm)
        .with_init_call(
            "init",
            json!({"end_time": a_minute_from_now.to_string(), "auctioneer": auctioneer.account_id(), "nft_contract": nft_contract.account_id(), "token_id": TOKEN_ID}),
        )?
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Alice makes first bid
    contract
        .call_function("bid", ())
        .transaction()
        .deposit(NearToken::from_near(1))
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // For now, the highest bid is the Alice's bid
    let highest_bid: Bid = contract
        .call_function("get_highest_bid", ())
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(highest_bid.bid, NearToken::from_near(1));
    assert_eq!(&highest_bid.bidder, alice.account_id());

    let alice_balance = alice
        .tokens()
        .near_balance()
        .fetch_from(&sandbox_network)
        .await?
        .total;

    // Now, Bob makes a higher bid
    contract
        .call_function("bid", ())
        .transaction()
        .deposit(NearToken::from_near(2))
        .with_signer(bob.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Now, the highest bid is the Bob's bid
    let highest_bid: Bid = contract
        .call_function("get_highest_bid", ())
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(highest_bid.bid, NearToken::from_near(2));
    assert_eq!(&highest_bid.bidder, bob.account_id());

    // Check that Alice was refunded her bid
    let new_alice_balance = alice
        .tokens()
        .near_balance()
        .fetch_from(&sandbox_network)
        .await?
        .total;
    assert!(new_alice_balance == alice_balance.saturating_add(NearToken::from_near(1)));

    // Alice tries to make a bid with less NEAR than the previous
    contract
        .call_function("bid", ())
        .transaction()
        .deposit(NearToken::from_near(1))
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    // Auctioneer claims auction but did not finish
    contract
        .call_function("claim", ())
        .transaction()
        .gas(NearGas::from_tgas(30))
        .with_signer(auctioneer.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    // Fast forward 200 blocks
    let blocks_to_advance = 200;
    sandbox.fast_forward(blocks_to_advance).await?;

    // Auctioneer claims the auction
    contract
        .call_function("claim", ())
        .transaction()
        .gas(NearGas::from_tgas(40))
        .with_signer(auctioneer.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Checks the auctioneer has the correct balance
    let auctioneer_balance = auctioneer
        .tokens()
        .near_balance()
        .fetch_from(&sandbox_network)
        .await?
        .total;
    assert!(auctioneer_balance <= NearToken::from_near(12));
    assert!(auctioneer_balance > NearToken::from_millinear(11990));

    // Check highest bidder received the NFT
    let token_info: serde_json::Value = nft_contract
        .call_function("nft_token", json!({"token_id": TOKEN_ID}))
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    let owner_id: String = token_info["owner_id"].as_str().unwrap().to_string();

    assert_eq!(
        owner_id,
        bob.account_id().to_string(),
        "token owner is not the highest bidder"
    );

    // Auctioneer tries to claim the auction again
    contract
        .call_function("claim", ())
        .transaction()
        .gas(NearGas::from_tgas(30))
        .with_signer(auctioneer.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    // Alice tries to make a bid when the auction is over
    contract
        .call_function("bid", ())
        .transaction()
        .deposit(NearToken::from_near(1))
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_failure();

    Ok(())
}

async fn create_subaccount(
    sandbox: &near_sandbox::Sandbox,
    name: &str,
) -> testresult::TestResult<near_api::Account> {
    let account_id: AccountId = name.parse().unwrap();
    sandbox
        .create_account(account_id.clone())
        .initial_balance(NearToken::from_near(10))
        .send()
        .await?;
    Ok(near_api::Account(account_id))
}
