import '@/styles/globals.css';
import { Navigation } from '@/components/Navigation';

import type { AppProps } from "next/app";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function App({ Component, pageProps }: AppProps) {


  return (
    <>
      <Navigation />
      <Component {...pageProps} />
      <ToastContainer />
    </>
  );
}
