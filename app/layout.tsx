import type { Metadata } from "next";
import "./globals.css";
import CustomCursor from "./CustomCursor";
import { CaseTransitionProvider } from "./CaseTransitionProvider";
import SiteFooter from "./SiteFooter";

export const metadata: Metadata = {
  title: "13:31 Studio",
  description: "Premium web design studio for modern companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <CaseTransitionProvider>
          {children}
          <SiteFooter />
        </CaseTransitionProvider>
        <CustomCursor />
      </body>
    </html>
  );
}
