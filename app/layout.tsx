import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryClientWrapper } from "./query-client-provider";
import {
  ClerkProvider

} from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { ptBR } from '@clerk/localizations'
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from "sonner";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Painel Administrativo",
  description: "Painel administrativo para gestão de eventos e operadores.",
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
        baseTheme: dark,
      }}
    >
      <html lang="pt-BR" className="dark">
        <body className={`${inter.variable} antialiased`}>
          <QueryClientWrapper>
            <NextTopLoader color="blue"></NextTopLoader>
            {children}
            <Toaster></Toaster>
          </QueryClientWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
};

export default RootLayout;
