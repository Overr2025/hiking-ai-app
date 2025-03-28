import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#38bdf8" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
