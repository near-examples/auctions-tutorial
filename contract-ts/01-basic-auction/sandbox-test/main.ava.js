import anyTest from 'ava';
import { NEAR, Worker } from 'near-workspaces';
import { setDefaultResultOrder } from 'dns'; setDefaultResultOrder('ipv4first'); // temp fix for node >v17

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest;
test.beforeEach(async (t) => {
  console.log("Init the worker and start a Sandbox server")
  // Init the worker and start a Sandbox server
  const worker = t.context.worker = await Worker.init();

  // Create accounts
  console.log("Create accounts");
  const root = worker.rootAccount;

  const alice = await root.createSubAccount("alice", { initialBalance: NEAR.parse("50 N").toString() });
  const bob = await root.createSubAccount("bob", { initialBalance: NEAR.parse("50 N").toString() });
  const contract = await root.createSubAccount("contract", { initialBalance: NEAR.parse("50 N").toString() });

  // Deploy contract (input from package.json)
  console.log("Deploy contract (input from package.json)");
  await contract.deploy(process.argv[2]);

  // Initialize contract, finishes in 1 minute
  console.log("Initialize contract, finishes in 1 minute");
  await contract.call(contract, "init", {
    end_time: String((Date.now() + 60000) * 10 ** 6),
  });

  // Save state for test runs, it is unique for each test
  t.context.worker = worker;
  t.context.accounts = { alice, bob, contract};
});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test("Bids are placed", async (t) => {
  console.log("Bids are placed");
  const { alice, contract } = t.context.accounts;

  await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });

  const highest_bid = await contract.view("get_highest_bid", {});

  t.is(highest_bid.bidder, alice.accountId);
  t.is(highest_bid.bid, NEAR.parse("1 N").toString());
  console.log("Bids are placed finished");

});

test("Outbid returns previous bid", async (t) => {
  const { alice, bob, contract } = t.context.accounts;

  await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
  const aliceBalance = await alice.balance();

  await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
  const highest_bid = await contract.view("get_highest_bid", {});
  t.is(highest_bid.bidder, bob.accountId);
  t.is(highest_bid.bid, NEAR.parse("2 N").toString());

  // we returned the money to alice
  const aliceNewBalance = await alice.balance();
  t.deepEqual(aliceNewBalance.available, aliceBalance.available.add(NEAR.parse("1 N")));
});

test("Auction closes", async (t) => {
  const { alice, contract } = t.context.accounts;

  // alice can bid
  await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });

  // fast forward approx a minute
  await t.context.worker.provider.fastForward(60)

  // alice cannot bid anymore
  await t.throwsAsync(alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() }))
});

