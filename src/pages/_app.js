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

function SoundBridge() {
  useUiSound();
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="liara-theme">
      <DirectionProvider dir="rtl">
        <SoundBridge />
        <MDXProvider>
          <Component {...pageProps} />
        </MDXProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}

