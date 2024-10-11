import { useEffect, useState } from 'react';

import '@/styles/globals.css';
import { NearContext } from '@/context';
import { Navigation } from '@/components/Navigation';

import { Wallet } from '@/wallets/near';
import { NetworkId } from '@/config';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const wallet = new Wallet({ networkId: NetworkId });

export default function MyApp({ Component, pageProps }) {
  const [signedAccountId, setSignedAccountId] = useState('');

  useEffect(() => { wallet.startUp(setSignedAccountId) }, []);

  return (
    <NearContext.Provider value={{ wallet, signedAccountId }}>
      <Navigation />
      <Component {...pageProps} />
      <ToastContainer />
    </NearContext.Provider>
  );
}
