import anyTest from 'ava';
import { NEAR, Worker } from 'near-workspaces';
import { setDefaultResultOrder } from 'dns'; setDefaultResultOrder('ipv4first'); // temp fix for node >v17

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest;
const FT_WASM_FILEPATH = "./sandbox-test/fungible_token.wasm";
// const NFT_WASM_FILEPATH = "./tests/non_fungible_token.wasm";
test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = t.context.worker = await Worker.init();

  // const ft_wasm = std::fs::read(FT_WASM_FILEPATH)?;
  // let ft_contract = sandbox.dev_deploy(&ft_wasm).await?;

  // Create accounts
  const root = worker.rootAccount;

  const alice = await root.createSubAccount("alice",{initialBalance: NEAR.parse("50 N").toString()});
  const bob = await root.createSubAccount("bob",{initialBalance: NEAR.parse("50 N").toString()});
  const contract = await root.createSubAccount("contract",{initialBalance: NEAR.parse("50 N").toString()});
  const ft_contract = await root.createSubAccount("ft_contract");
  // const contract = await root.createSubAccount("contract");
  const auctioneer = await root.createSubAccount("auctioneer",{initialBalance: NEAR.parse("50 N").toString()});

 
  // Deploy contract ft 
  await ft_contract.deploy(FT_WASM_FILEPATH);
  let res =  await ft_contract.call(ft_contract,"new_default_meta",{"owner_id":ft_contract.accountId,"total_supply":BigInt(1_000_000).toString()});

  const contracts = [alice,bob,contract,auctioneer];

  for (const contract_to_register of contracts) {
    await contract_to_register.call(ft_contract, "storage_deposit",{ "account_id": contract_to_register.accountId },{ attachedDeposit: NEAR.from("8000000000000000000000").toString(),gas: "300000000000000" })
  }

  await ft_contract.call(ft_contract,"ft_transfer",{"receiver_id":alice.accountId,"amount":BigInt(150_000).toString()},{ attachedDeposit: NEAR.from("1").toString(),gas: "300000000000000" });

   await ft_contract.call(ft_contract,"ft_transfer",{"receiver_id":bob.accountId,"amount":BigInt(150_000).toString()},{ attachedDeposit: NEAR.from("1").toString(),gas: "300000000000000" });

   // Deploy contract (input from package.json)
   await contract.deploy(process.argv[2]);

  // Initialize contract, finishes in 1 minute
  await contract.call(contract, "init", {
    end_time: String((Date.now() + 60000) * 10 ** 6),
    auctioneer: auctioneer.accountId,
    ft_contract: ft_contract.accountId
  });

  // Save state for test runs, it is unique for each test
  t.context.worker = worker;
  t.context.accounts = { alice, bob, contract, auctioneer,ft_contract};
});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

// test("Bids are placed", async (t) => {
//   const { alice, contract } = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });

//   const highest_bid = await contract.view("get_highest_bid", {});

//   t.is(highest_bid.bidder, alice.accountId);
//   t.is(highest_bid.bid, NEAR.parse("1 N").toString());
// });

// test("Outbid returns previous bid", async (t) => {
//   const { alice, bob, contract } = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   const aliceBalance = await alice.balance();

//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
//   const highest_bid = await contract.view("get_highest_bid", {});
//   t.is(highest_bid.bidder, bob.accountId);
//   t.is(highest_bid.bid, NEAR.parse("2 N").toString());

//   // we returned the money to alice
//   const aliceNewBalance = await alice.balance();
//   t.deepEqual(aliceNewBalance.available, aliceBalance.available.add(NEAR.parse("1 N")));
// });

// test("Auction closes", async (t) => {
//   const { alice, bob, contract } = t.context.accounts;

//   // alice can bid
//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });

//   // fast forward approx a minute
//   await t.context.worker.provider.fastForward(60)

//   // alice cannot bid anymore
//   await t.throwsAsync(alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() }))
// });

// test("Claim auction", async (t) => {
//   const { alice, bob, contract, auctioneer} = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
//   const auctioneerBalance = await auctioneer.balance();
//   const available = parseFloat(auctioneerBalance.available.toHuman());
  
//   // fast forward approx a minute
//   await t.context.worker.provider.fastForward(60)

//   await auctioneer.call(contract, "claim",{});

//   const contractNewBalance = await auctioneer.balance();
//   const new_available = parseFloat(contractNewBalance.available.toHuman());

//   t.is(new_available.toFixed(2), (available + 2).toFixed(2));
// });

// test("Auction open", async (t) => {
//   const { alice, bob, contract, auctioneer} = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });

//   await t.throwsAsync(auctioneer.call(contract, "claim",{}))
// });

// test("Auction has been claimed", async (t) => {
//   const { alice, bob, contract, auctioneer} = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
  
//   // fast forward approx a minute
//   await t.context.worker.provider.fastForward(60)

//   await auctioneer.call(contract, "claim",{});

//   await t.throwsAsync(auctioneer.call(contract, "claim",{}))
// });

test("Bids are placed", async (t) => {
  const { alice, contract, ft_contract } = t.context.accounts;
  const transfer_amount = BigInt(50_000).toString()
  
  await alice.call(ft_contract, "ft_transfer_call", { "receiver_id": contract.accountId,"amount": transfer_amount,"msg":""}, { attachedDeposit: NEAR.from("1").toString(),gas: "300000000000000" });

  const highest_bid = await contract.view("get_highest_bid", {});

  t.is(highest_bid.bidder, alice.accountId);
  t.is(highest_bid.bid, transfer_amount);

  const aliceBalance = await ft_contract.view("ft_balance_of",{"account_id": alice.accountId})
  t.is(aliceBalance, BigInt(100_000).toString());

  const contract_balance = await ft_contract.view("ft_balance_of",{"account_id": contract.accountId})
  t.is(contract_balance, transfer_amount);

});

test("Outbid returns previous bid", async (t) => {
  const { alice, bob, contract,ft_contract } = t.context.accounts;
  
  const aliceBalance = await ft_contract.view("ft_balance_of",{"account_id": alice.accountId})
  t.is(aliceBalance, BigInt(150_000).toString());
  await alice.call(ft_contract, "ft_transfer_call", { "receiver_id": contract.accountId,"amount": BigInt(50_000).toString(),"msg":""}, { attachedDeposit: NEAR.from("1").toString(),gas: "300000000000000" });
  const aliceBalance1 = await ft_contract.view("ft_balance_of",{"account_id": alice.accountId})
  t.is(aliceBalance1, BigInt(100_000).toString());

  await bob.call(ft_contract, "ft_transfer_call", { "receiver_id": contract.accountId,"amount": BigInt(60_000).toString(),"msg":""}, { attachedDeposit: NEAR.from("1").toString(),gas: "300000000000000" });
  const highest_bid = await contract.view("get_highest_bid", {});
  // t.is(highest_bid.bidder, bob.accountId);
  // t.is(highest_bid.bid,  BigInt(60_000).toString());

  // we returned the money to alice
  const aliceNewBalance = await ft_contract.view("ft_balance_of",{"account_id": alice.accountId});
  t.deepEqual(BigInt(150_000).toString(),aliceNewBalance);
});

// test("Auction closes", async (t) => {
//   const { alice, bob, contract } = t.context.accounts;

//   // alice can bid
//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });

//   // fast forward approx a minute
//   await t.context.worker.provider.fastForward(60)

//   // alice cannot bid anymore
//   await t.throwsAsync(alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() }))
// });

// test("Claim auction", async (t) => {
//   const { alice, bob, contract, auctioneer} = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
//   const auctioneerBalance = await auctioneer.balance();
//   const available = parseFloat(auctioneerBalance.available.toHuman());
  
//   // fast forward approx a minute
//   await t.context.worker.provider.fastForward(60)

//   await auctioneer.call(contract, "claim",{});

//   const contractNewBalance = await auctioneer.balance();
//   const new_available = parseFloat(contractNewBalance.available.toHuman());

//   t.is(new_available.toFixed(2), (available + 2).toFixed(2));
// });

// test("Auction open", async (t) => {
//   const { alice, bob, contract, auctioneer} = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });

//   await t.throwsAsync(auctioneer.call(contract, "claim",{}))
// });

// test("Auction has been claimed", async (t) => {
//   const { alice, bob, contract, auctioneer} = t.context.accounts;

//   await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
//   await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
  
//   // fast forward approx a minute
//   await t.context.worker.provider.fastForward(60)

//   await auctioneer.call(contract, "claim",{});

//   await t.throwsAsync(auctioneer.call(contract, "claim",{}))
// });