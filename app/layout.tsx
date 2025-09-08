import "./globals.css";

import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import { QueryClientWrapper } from "./query-client-provider";
import {
  ClerkProvider

} from '@clerk/nextjs'

import { ptBR } from '@clerk/localizations'
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from "sonner";
const firaSans = Fira_Sans({ subsets: ["latin"], variable: "--font-fira-sans", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Painel Administrativo",
  description: "Painel administrativo para gestão de eventos e operadores.",
  icons: {
    icon: [
      { url: "/favicon_rg.png", type: "image/png" }
    ],
    shortcut: [
      { url: "/favicon_rg.png", type: "image/png" }
    ]
  }
};

const RootLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <ClerkProvider
      localization={ptBR}
      appearance={{
        // baseTheme: dark, // REMOVIDO
      }}
    >
      <html lang="pt-BR" >
        <head>
          <link rel="icon" href="/favicon_rg.png" sizes="any" />
        </head>
        <body className={`${firaSans.variable} antialiased`}>
          <QueryClientWrapper>
            <NextTopLoader color="purple"></NextTopLoader>
            {children}
            <Toaster></Toaster>
          </QueryClientWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
};

export default RootLayout;
