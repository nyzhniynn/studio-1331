"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent } from "react";
import { useCaseTransition } from "./CaseTransitionProvider";
import { getLocaleFromPathname, stripLocaleFromPathname, switchLocalePathname, type Locale } from "./i18n";

type LanguageSwitcherProps = {
  className?: string;
  onNavigate?: () => void;
};

const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const skipHomeIntroKey = "studio-1331:skip-home-intro";
const homeReturnSlugKey = "studio-1331:home-return-slug";

export default function LanguageSwitcher({ className, onNavigate }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const { switchLocale } = useCaseTransition();
  const currentLocale = getLocaleFromPathname(pathname);

  const getHref = (locale: Locale) => switchLocalePathname(pathname, locale);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, locale: Locale) => {
    if (locale !== currentLocale && stripLocaleFromPathname(pathname) === "/" && typeof window !== "undefined") {
      window.sessionStorage.setItem(skipHomeIntroKey, "true");
      window.sessionStorage.removeItem(restoreHomeScrollKey);
      window.sessionStorage.removeItem(homeReturnSlugKey);
    }

    onNavigate?.();
    switchLocale(event, getHref(locale), locale);
  };

  return (
    <div className={className} data-language-switcher aria-label="Language switcher">
      <Link data-active={currentLocale === "en"} href={getHref("en")} onClick={(event) => handleClick(event, "en")} scroll={false}>
        EN
      </Link>
      <span aria-hidden="true">/</span>
      <Link data-active={currentLocale === "ru"} href={getHref("ru")} onClick={(event) => handleClick(event, "ru")} scroll={false}>
        RU
      </Link>
    </div>
  );
}
