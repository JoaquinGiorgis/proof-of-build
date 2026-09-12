import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ShaderBackdrop } from "@/components/shader-backdrop";
import { SiteNav } from "@/components/site-nav";
import { WalletModal } from "@/components/wallet/wallet-modal";
import { WalletProvider } from "@/components/wallet/wallet-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Proof of Build",
    template: "%s · Proof of Build",
  },
  description: "A verifiable record of what you actually shipped.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "Proof of Build",
    description: "Ship something. Prove you built it.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* No background on <body>: it would paint over the shader layer below. */}
      <body className="flex min-h-full flex-col">
        {/* One shader layer for the whole site, so the material is identical
            on every screen and at every scroll position. */}
        <ShaderBackdrop />
        <WalletProvider>
          <SiteNav />
          <main className="flex flex-1 flex-col">{children}</main>
          <WalletModal />
        </WalletProvider>
      </body>
    </html>
  );
}
