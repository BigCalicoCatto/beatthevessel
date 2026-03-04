'use client';

import "./globals.css";
import { WalletProviderWrapper } from "@/components/WalletProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Beat the Vessel</title>
        <meta name="description" content="On-chain Battleship. Wager SOL. Sink or be sunk." />
      </head>
      <body>
        <WalletProviderWrapper>
          {children}
        </WalletProviderWrapper>
      </body>
    </html>
  );
}
