import anyTest from 'ava';
import { NEAR, Worker } from 'near-workspaces';
import { setDefaultResultOrder } from 'dns'; setDefaultResultOrder('ipv4first'); // temp fix for node >v17

/**
 *  @typedef {import('near-workspaces').NearAccount} NearAccount
 *  @type {import('ava').TestFn<{worker: Worker, accounts: Record<string, NearAccount>}>}
 */
const test = anyTest;
test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = t.context.worker = await Worker.init();

  // Create accounts
  const root = worker.rootAccount;

  const alice = await root.createSubAccount("alice", { initialBalance: NEAR.parse("50 N").toString() });
  const bob = await root.createSubAccount("bob", { initialBalance: NEAR.parse("50 N").toString() });
  const contract = await root.createSubAccount("contract", { initialBalance: NEAR.parse("50 N").toString() });

  // Deploy contract (input from package.json)
  await contract.deploy(process.argv[2]);

  // Initialize contract, finishes in 1 minute
  await contract.call(contract, "init", {
    end_time: String((Date.now() + 60000) * 10 ** 6),
  });

  // Save state for test runs, it is unique for each test
  t.context.worker = worker;
  t.context.accounts = { alice, bob, contract };
});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test("Test full contract", async (t) => {
  const { alice, bob, contract } = t.context.accounts;

  // Alice makes first bid
  await alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() });
  let highest_bid = await contract.view("get_highest_bid", {});
  t.is(highest_bid.bidder, alice.accountId);
  t.is(highest_bid.bid, NEAR.parse("1 N").toString());
  const aliceBalance = await alice.balance();

  // Bob makes a higher bid
  await bob.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("2 N").toString() });
  highest_bid = await contract.view("get_highest_bid", {});
  t.is(highest_bid.bidder, bob.accountId);
  t.is(highest_bid.bid, NEAR.parse("2 N").toString());

  // Check that alice was returned her bid
  const aliceNewBalance = await alice.balance();
  t.deepEqual(aliceNewBalance.available, aliceBalance.available.add(NEAR.parse("1 N")));

  // Alice tires to make a bid with less NEAR than the previous 
  await t.throwsAsync(alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() }))
  highest_bid = await contract.view("get_highest_bid", {});
  t.is(highest_bid.bidder, bob.accountId);
  t.is(highest_bid.bid, NEAR.parse("2 N").toString());

  // fast forward approx two minutes
  await t.context.worker.provider.fastForward(120)

  // Alice tries to make a bid when the auction is over
  await t.throwsAsync(alice.call(contract, "bid", {}, { attachedDeposit: NEAR.parse("1 N").toString() }))
  highest_bid = await contract.view("get_highest_bid", {});
  t.is(highest_bid.bidder, bob.accountId);
  t.is(highest_bid.bid, NEAR.parse("2 N").toString());
});