import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import CustomCursor from "./CustomCursor";
import { CaseTransitionProvider } from "./CaseTransitionProvider";
import LocaleHtmlSync from "./LocaleHtmlSync";
import SiteFooter from "./SiteFooter";
import { defaultLocale, isLocale, type Locale } from "./i18n";
import { GA_MEASUREMENT_ID } from "../lib/analytics";

const siteChromeBootScript = `
(() => {
  try {
    const path = window.location.pathname;
    const isHome = path === "/" || path === "/ru";
    const skipIntro = window.sessionStorage?.getItem("studio-1331:skip-home-intro") === "true";

    if (isHome && !skipIntro) {
      document.documentElement.dataset.siteIntro = "true";
      delete document.documentElement.dataset.siteReady;
      return;
    }

    document.documentElement.dataset.siteReady = "true";
    delete document.documentElement.dataset.siteIntro;
  } catch {
    document.documentElement.dataset.siteReady = "true";
    delete document.documentElement.dataset.siteIntro;
  }
})();
`;

const googleAnalyticsInitScript = `
window.dataLayer = window.dataLayer || [];

if (typeof window.gtag !== "function") {
  window.gtag = function gtag(){window.dataLayer.push(arguments);};
}

if (!window.__studio1331GaInitialized) {
  window.__studio1331GaInitialized = true;
  window.gtag("js", new Date());
  window.gtag("config", ${JSON.stringify(GA_MEASUREMENT_ID)});
}
`;

export const metadata: Metadata = {
  title: "13:31 Studio",
  description: "Premium web design studio for modern companies.",
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ru: "/ru",
    },
  },
  openGraph: {
    title: "13:31 Studio",
    description: "Premium web design studio for modern companies.",
    siteName: "13:31 Studio",
    type: "website",
  },
};

async function getRequestLocale(): Promise<Locale> {
  const locale = (await headers()).get("x-site-locale") ?? defaultLocale;

  return isLocale(locale) ? locale : defaultLocale;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className="h-full antialiased" data-site-intro="true" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script
          dangerouslySetInnerHTML={{ __html: siteChromeBootScript }}
          id="site-chrome-boot"
          strategy="beforeInteractive"
        />
        <Script
          id="google-analytics-src"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script
          dangerouslySetInnerHTML={{ __html: googleAnalyticsInitScript }}
          id="google-analytics-init"
          strategy="afterInteractive"
        />
        <LocaleHtmlSync />
        <CaseTransitionProvider>
          {children}
          <SiteFooter />
        </CaseTransitionProvider>
        <CustomCursor />
      </body>
    </html>
  );
}
