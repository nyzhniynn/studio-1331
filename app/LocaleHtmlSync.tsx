"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { getLocaleFromPathname, stripLocaleFromPathname } from "./i18n";

const skipHomeIntroKey = "studio-1331:skip-home-intro";

export default function LocaleHtmlSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    document.documentElement.lang = getLocaleFromPathname(pathname);

    const isHomePath = stripLocaleFromPathname(pathname) === "/";
    const shouldSkipHomeIntro =
      isHomePath && window.sessionStorage.getItem(skipHomeIntroKey) === "true";

    if (!isHomePath || shouldSkipHomeIntro) {
      document.documentElement.dataset.siteReady = "true";
      delete document.documentElement.dataset.siteIntro;
    }
  }, [pathname]);

  return null;
}
