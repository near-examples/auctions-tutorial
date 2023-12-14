import { Worker, NearAccount, NEAR } from "near-workspaces";
import anyTest, { TestFn } from "ava";
import { ONE_YOCTO } from "near-sdk-js";

const test = anyTest as TestFn<{
  worker: Worker;
  accounts: Record<string, NearAccount>;
}>;

const ONE_NEAR = NEAR.parse("1 N").toString();

test.beforeEach(async (t) => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy contract
  const root = worker.rootAccount;

  const auctioneer = await root.createSubAccount("auctioneer", {
    initialBalance: NEAR.parse("30 N").toJSON(),
  });

  const alice = await root.createSubAccount("alice", {
    initialBalance: NEAR.parse("30 N").toJSON(),
  });

  const bob = await root.createSubAccount("bob", {
    initialBalance: NEAR.parse("30 N").toJSON(),
  });

  const george = await root.createSubAccount("george", {
    initialBalance: NEAR.parse("30 N").toJSON(),
  });

  const contract = await root.createSubAccount("test-account", {
    initialBalance: NEAR.parse("10 N").toJSON(),
  });

  // Get wasm file path from package.json test script in folder above
  await contract.deploy(process.argv[2]);

  // Initialize beneficiary
  await contract.call(contract, "init", {
    auctioneer: auctioneer.accountId,
    auctionEndTime: Date.now() * 1_000_000_000,
  });

  // Save state for test runs, it is unique for each test
  t.context.worker = worker;
  t.context.accounts = { root, contract, auctioneer, alice, bob, george };
});

test.afterEach.always(async (t) => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch((error) => {
    console.log("Failed to stop the Sandbox:", error);
  });
});

test("Alice makes his first bet ", async (t) => {
  const { alice, contract } = t.context.accounts;

  const balance = await contract.balance();
  const available = balance.available.toBigInt();
  console.log(balance.available.toHuman());

  const new_balance_alice = await alice.balance();
  const new_available_alice = parseFloat(new_balance_alice.available.toHuman());

  await alice.call(contract, "placebid", {},{attachedDeposit:NEAR.parse("1 N").toString()});

  const new_balance = await contract.balance();
  const new_available = new_balance.available.toBigInt();
  

  console.log(new_balance.available.toHuman());

  t.is(new_available, available + BigInt(ONE_NEAR) );
});

// test("Bob makes his first bet after Alice", async (t) => {
//   const { alice, bob, contract } = t.context.accounts;

//   const balance = await contract.balance();
//   const available = parseFloat(balance.available.toHuman());

//   await alice.call(contract, "placebid", {},{attachedDeposit:"1 N"});
//   await bob.call(contract, "placebid", {},{attachedDeposit:"1.1 N"});

//   const new_balance = await contract.balance();
//   const new_available = parseFloat(new_balance.available.toHuman());

//   t.is(new_available, available + 2.1 );
// });

// test("Alice makes his second bet", async (t) => {
//   const { alice, bob, contract } = t.context.accounts;

//   const balance = await contract.balance();
//   const available = parseFloat(balance.available.toHuman());

//   await alice.call(contract, "placebid", {},{attachedDeposit:"1 N"});
//   await bob.call(contract, "placebid", {},{attachedDeposit:"1.1 N"});
//   await alice.call(contract, "placebid", {},{attachedDeposit:"0.2 N"});

//   const new_balance = await contract.balance();
//   const new_available = parseFloat(new_balance.available.toHuman());

//   t.is(new_available, available + 2.3 );
// });

// test("Bob makes his first bet but it's not enough", async (t) => {
//   const { alice, bob, contract } = t.context.accounts;

//   const error = await t.throwsAsync(async () =>{
//     await alice.call(contract, "placebid", {},{attachedDeposit:"1 N"});
//     await bob.call(contract, "placebid", {},{attachedDeposit:"0.9 N"});
//   });

//   // t.is(error.message, "You must place a higher bid");
// });

// test("The auctioneer finishes the auction", async (t) => {
//   const { auctioneer, contract, alice, bob, george } = t.context.accounts;

//   const balance_alice = await alice.balance();
//   const available_alice = parseFloat(balance_alice.available.toHuman());

//   const balance_bob = await bob.balance();
//   const available_bob = parseFloat(balance_bob.available.toHuman());

//   const balance_george = await george.balance();
//   const available_george = parseFloat(balance_george.available.toHuman());

//   const balance_auctioneer = await auctioneer.balance();
//   const available_auctioneer = parseFloat(
//     balance_auctioneer.available.toHuman()
//   );

//   await alice.call(contract, "placebid", {}, { attachedDeposit: "1 N" });
//   await bob.call(contract, "placebid", {}, { attachedDeposit: "1.1 N" });
//   await george.call(contract, "placebid", {}, { attachedDeposit: "1.2 N" });
//   await auctioneer.call(contract, "endAuction", {});

//   const new_balance_alice = await alice.balance();
//   const new_available_alice = parseFloat(new_balance_alice.available.toHuman());

//   const new_balance_bob = await bob.balance();
//   const new_available_bob = parseFloat(new_balance_bob.available.toHuman());

//   const new_balance_george = await george.balance();
//   const new_available_george = parseFloat(
//     new_balance_george.available.toHuman()
//   );

//   const new_balance_auctioneer = await auctioneer.balance();
//   const new_available_auctioneer = parseFloat(
//     new_balance_auctioneer.available.toHuman()
//   );

//   t.is(new_available_alice, available_alice );
//   t.is(new_available_bob, available_bob);
//   t.is(new_available_george, available_george - 1.2);
//   t.is(available_auctioneer, new_available_auctioneer + 1.2);

//   // t.is(error.message, "You must place a higher bid");
// });
