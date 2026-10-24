import { useEffect, useState } from 'react';

import '@/styles/globals.css';
import { NearContext } from '@/context';
import { Navigation } from '@/components/Navigation';

import { Wallet } from '@/wallets/near';
import { NetworkId } from '@/config';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const wallet = new Wallet({ networkId: NetworkId });

export default function MyApp({ Component, pageProps }) {
  const [signedAccountId, setSignedAccountId] = useState('');

  useEffect(() => {
    let cancelled = false;
    let cleanup;
    wallet.startUp((accountId) => { if (!cancelled) setSignedAccountId(accountId); })
      .then((dispose) => { if (cancelled) dispose(); else cleanup = dispose; })
      .catch((error) => { if (!cancelled) toast.error(error.message); });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  return (
    <NearContext.Provider value={{ wallet, signedAccountId }}>
      <Navigation />
      <Component {...pageProps} />
      <ToastContainer />
    </NearContext.Provider>
  );
}
