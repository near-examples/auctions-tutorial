import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';

import { Navigation } from '@/components/Navigation';
import { ToastContainer } from 'react-toastify';
import type { AppProps } from 'next/app';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navigation />
      <Component {...pageProps} />
      <ToastContainer />
    </>
  );
}
