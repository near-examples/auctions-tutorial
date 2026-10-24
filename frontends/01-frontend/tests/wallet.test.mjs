import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Wallet } from '../src/wallets/near.js';

function setup() {
  const wallet = new Wallet({ networkId: 'testnet' });
  const connector = new EventEmitter();
  const selected = { signAndSendTransaction: async () => ({ status: { SuccessValue: 'bnVsbA==' } }) };
  connector.getConnectedWallet = async () => ({ wallet: selected, accounts: [{ accountId: 'alice.testnet' }] });
  connector.connect = async () => {
    connector.emit('wallet:signIn', { wallet: selected, accounts: [{ accountId: 'bob.testnet' }] });
    return selected;
  };
  connector.wallet = async () => selected;
  connector.disconnect = async (current) => {
    assert.equal(current, selected);
    connector.emit('wallet:signOut');
  };
  wallet.connectorPromise = Promise.resolve(connector);
  return { wallet, connector, selected };
}

test('restores the session, handles sign-in/out, and removes event listeners', async () => {
  const { wallet, connector } = setup();
  const accounts = [];
  const dispose = await wallet.startUp((id) => accounts.push(id));
  assert.deepEqual(accounts, ['alice.testnet']);
  await wallet.signIn();
  await wallet.signOut();
  assert.deepEqual(accounts, ['alice.testnet', 'bob.testnet', '']);
  dispose();
  assert.equal(connector.listenerCount('wallet:signIn'), 0);
  assert.equal(connector.listenerCount('wallet:signOut'), 0);
});

test('reads do not initialize or connect a wallet', async () => {
  const wallet = new Wallet({ networkId: 'testnet' });
  wallet.provider = { callFunction: async (params) => {
    assert.deepEqual(params, { contractId: 'auction.testnet', method: 'get_highest_bid', args: {} });
    return { bid: '1000000000000000000000001' };
  } };
  assert.equal((await wallet.viewMethod({ contractId: 'auction.testnet', method: 'get_highest_bid' })).bid, '1000000000000000000000001');
  assert.equal(wallet.connectorPromise, undefined);
});

test('sends exact string amounts and surfaces failed transactions', async () => {
  const { wallet, selected } = setup();
  selected.signAndSendTransaction = async (tx) => {
    assert.equal(tx.receiverId, 'auction.testnet');
    assert.deepEqual(tx.actions[0], { type: 'FunctionCall', params: {
      methodName: 'bid', args: {}, gas: '300000000000000', deposit: '1000000000000000000000001',
    } });
    return { status: { SuccessValue: 'bnVsbA==' } };
  };
  assert.equal(await wallet.callMethod({ contractId: 'auction.testnet', method: 'bid', deposit: '1000000000000000000000001' }), null);
  selected.signAndSendTransaction = async () => ({ status: { Failure: {} } });
  await assert.rejects(wallet.callMethod({ contractId: 'auction.testnet', method: 'claim' }), /Transaction failed/);
  selected.signAndSendTransaction = async () => undefined;
  await assert.rejects(wallet.callMethod({ contractId: 'auction.testnet', method: 'claim' }), /no transaction result/);
});
