use near_api::{AccountId, NearGas, NearToken};
use near_sdk::json_types::U128;
use near_sdk::serde_json::json;

const FT_WASM_FILEPATH: &str = "./tests/fungible_token.wasm";

#[derive(near_sdk::serde::Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Bid {
    pub bidder: AccountId,
    pub bid: U128,
}

#[tokio::test]

async fn test_contract_is_operational() -> testresult::TestResult<()> {
    // Build the contract wasm file
    let contract_wasm_path = cargo_near_build::build_with_cli(Default::default())?;
    let contract_wasm = std::fs::read(contract_wasm_path)?;

    // Read the FT wasm file
    let ft_wasm = std::fs::read(FT_WASM_FILEPATH)?;

    // Initialize the sandbox
    let sandbox = near_sandbox::Sandbox::start_sandbox().await?;
    let sandbox_network =
        near_api::NetworkConfig::from_rpc_url("sandbox", sandbox.rpc_addr.parse()?);

    // Create accounts
    let alice = create_subaccount(&sandbox, "alice.sandbox").await?;
    let auctioneer = create_subaccount(&sandbox, "auctioneer.sandbox").await?;
    let nft_contract = create_subaccount(&sandbox, "nft-contract.sandbox")
        .await?
        .as_contract();
    let ft_contract = create_subaccount(&sandbox, "ft-contract.sandbox")
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

    // Deploy the FT contract
    near_api::Contract::deploy(ft_contract.account_id().clone())
        .use_code(ft_wasm)
        .with_init_call(
            "new_default_meta",
            json!({"owner_id": ft_contract.account_id(), "total_supply": U128(1_000_000)}),
        )?
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Skip creating NFT contract as we are are only going to test making a bid to the auction

    // Deploy factory contract
    near_api::Contract::deploy(contract.account_id().clone())
        .use_code(contract_wasm)
        .without_init_call()
        .with_signer(signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    // Create auction by calling factory contract
    let now = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)?
        .as_secs();
    let a_minute_from_now = (now + 60) * 1000000000;
    let starting_price = U128(10_000);

    contract
        .call_function("deploy_new_auction", json!({"name": "new-auction", "end_time": a_minute_from_now.to_string(),"auctioneer": auctioneer.account_id(),"ft_contract": ft_contract.account_id(),"nft_contract": nft_contract.account_id(),"token_id":"1", "starting_price":starting_price }),)
        .transaction()
        .deposit(NearToken::from_millinear(1600))
        .with_signer(alice.account_id().clone(), signer.clone())
        .send_to(&sandbox_network)
        .await?
        .assert_success();

    let auction_account_id: AccountId = format!("new-auction.{}", contract.account_id())
        .parse()
        .unwrap();
    sandbox
        .import_account(
            sandbox.rpc_addr.to_string(),
            format!("new-auction.{}", contract.account_id())
                .parse()
                .unwrap(),
        )
        .send()
        .await?;
    let auction_account = near_api::Account(auction_account_id.clone()).as_contract();

    // Register accounts
    for account_id in [alice.account_id().clone(), auction_account_id.clone()].iter() {
        ft_contract
            .call_function(
                "storage_deposit",
                serde_json::json!({ "account_id": account_id }),
            )
            .transaction()
            .deposit(NearToken::from_yoctonear(8000000000000000000000))
            .with_signer(alice.account_id().clone(), signer.clone())
            .send_to(&sandbox_network)
            .await?
            .assert_success();
    }

    // Transfer FTs to Alice and Bob to top up their balances
    let transfer_amount = U128(150_000);

    ft_transfer(
        &ft_contract,
        &ft_contract.account_id(),
        alice.account_id(),
        transfer_amount,
        &signer,
        &sandbox_network,
    )
    .await?;

    // Alice makes a bid
    ft_transfer_call(
        &ft_contract,
        &alice,
        &auction_account_id,
        U128(50_000),
        &signer,
        &sandbox_network,
    )
    .await?;

    let highest_bid: Bid = auction_account
        .call_function("get_highest_bid", ())
        .read_only()
        .fetch_from(&sandbox_network)
        .await?
        .data;
    assert_eq!(highest_bid.bid, U128(50_000));
    assert_eq!(&highest_bid.bidder, alice.account_id());

    // Contract balance has increased
    let auction_contract_balance: U128 =
        ft_balance_of(&ft_contract, auction_account.account_id(), &sandbox_network).await?;
    assert_eq!(auction_contract_balance, U128(50_000));

    // Alice balance has decreased
    let alice_balance: U128 =
        ft_balance_of(&ft_contract, alice.account_id(), &sandbox_network).await?;
    assert_eq!(alice_balance, U128(100_000));

    // Try to launch a new auction with insufficient deposit
    contract
        .call_function("deploy_new_auction", json!({"name": "new-auction", "end_time": a_minute_from_now.to_string(),"auctioneer": auctioneer.account_id(),"ft_contract": ft_contract.account_id(),"nft_contract": nft_contract.account_id(),"token_id":"1", "starting_price":starting_price }),)
        .transaction()
        .deposit(NearToken::from_millinear(1400))
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

async fn ft_transfer(
    ft_contract: &near_api::Contract,
    from: &AccountId,
    to: &AccountId,
    amount: U128,
    signer: &std::sync::Arc<near_api::Signer>,
    network: &near_api::NetworkConfig,
) -> testresult::TestResult<()> {
    ft_contract
        .call_function(
            "ft_transfer",
            serde_json::json!({"receiver_id": to, "amount": amount}),
        )
        .transaction()
        .deposit(NearToken::from_yoctonear(1))
        .with_signer(from.clone(), signer.clone())
        .send_to(network)
        .await?
        .assert_success();
    Ok(())
}

async fn ft_balance_of(
    ft_contract: &near_api::Contract,
    account_id: &AccountId,
    network: &near_api::NetworkConfig,
) -> testresult::TestResult<U128> {
    let result: U128 = ft_contract
        .call_function(
            "ft_balance_of",
            serde_json::json!({"account_id": account_id}),
        )
        .read_only()
        .fetch_from(network)
        .await?
        .data;
    Ok(result)
}

async fn ft_transfer_call(
    ft_contract: &near_api::Contract,
    account: &near_api::Account,
    receiver_id: &AccountId,
    amount: U128,
    signer: &std::sync::Arc<near_api::Signer>,
    network: &near_api::NetworkConfig,
) -> testresult::TestResult<()> {
    let _ = ft_contract
        .call_function(
            "ft_transfer_call",
            serde_json::json!({"receiver_id": receiver_id, "amount": amount, "msg": "0"}),
        )
        .transaction()
        .deposit(NearToken::from_yoctonear(1))
        .gas(NearGas::from_tgas(300))
        .with_signer(account.account_id().clone(), signer.clone())
        .send_to(network)
        .await?
        .assert_success();
    Ok(())
}
