import { JsonRpcProvider, getTransactionLastResult } from 'near-api-js';
import { RPC_URL } from '../config.js';

// Construct near-connect only in the browser. Views work before connecting a wallet.
export class Wallet {
  constructor({ networkId = 'testnet' }) {
    this.networkId = networkId;
    this.provider = new JsonRpcProvider({ url: RPC_URL });
  }

  async getConnector() {
    this.connectorPromise ??= import('@hot-labs/near-connect').then(({ NearConnector }) =>
      new NearConnector({ network: this.networkId, providers: { [this.networkId]: [RPC_URL] } }));
    return this.connectorPromise;
  }

  startUp = async (onAccountChange) => {
    const connector = await this.getConnector();
    let active = true;
    const signedIn = ({ accounts }) => {
      if (active) onAccountChange(accounts[0]?.accountId ?? '');
    };
    const signedOut = () => { if (active) onAccountChange(''); };
    connector.on('wallet:signIn', signedIn);
    connector.on('wallet:signOut', signedOut);
    const connected = await connector.getConnectedWallet().catch(() => null);
    if (active) onAccountChange(connected?.accounts[0]?.accountId ?? '');
    return () => {
      active = false;
      connector.off('wallet:signIn', signedIn);
      connector.off('wallet:signOut', signedOut);
    };
  };

  signIn = async () => (await this.getConnector()).connect();
  signOut = async () => {
    const connector = await this.getConnector();
    await connector.disconnect(await connector.wallet());
  };

  viewMethod = ({ contractId, method, args = {} }) =>
    this.provider.callFunction({ contractId, method, args });

  callMethod = async ({ contractId, method, args = {}, gas = '300000000000000', deposit = '0' }) => {
    const selectedWallet = await (await this.getConnector()).wallet();
    const outcome = await selectedWallet.signAndSendTransaction({
      receiverId: contractId,
      actions: [{ type: 'FunctionCall', params: { methodName: method, args, gas: String(gas), deposit: String(deposit) } }],
    });
    if (!outcome) throw new Error('Wallet returned no transaction result');
    if (typeof outcome.status === 'object' && 'Failure' in outcome.status) {
      throw new Error('Transaction failed');
    }
    return getTransactionLastResult(outcome);
  };
}
