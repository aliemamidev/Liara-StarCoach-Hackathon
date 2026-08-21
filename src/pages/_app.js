import "@/styles/globals.css";
import "@/styles/fonts.css";
import "@fontsource-variable/vazirmatn/wght.css";
import "@/styles/asciinema.css";
import "@/styles/dark.css";
import "@/styles/theme.css";
import "highlight.js/styles/solarized-light.css";

import { MDXProvider } from "@mdx-js/react";
import { ThemeProvider } from "next-themes";
import { DirectionProvider } from "@/components/ui/direction";
import { useUiSound } from "@/hooks/use-ui-sound";
import Head from "next/head";
import Script from "next/script";

function SoundBridge() {
  useUiSound();
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="liara-theme">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Script id="gtm-init" strategy="afterInteractive">{"window.dataLayer = window.dataLayer || []; window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });"}</Script>
      <Script id="gtm-loader" strategy="afterInteractive" src="https://www.googletagmanager.com/gtm.js?id=GTM-5C8DVF39" />
      <DirectionProvider dir="rtl">
        <SoundBridge />
        <MDXProvider>
          <Component {...pageProps} />
        </MDXProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
