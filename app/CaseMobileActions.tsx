"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import type { CaseStudy } from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";
import { getLocaleFromPathname, getLocalizedHashHref } from "./i18n";

export default function CaseMobileActions({ caseStudy }: { caseStudy: CaseStudy }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const { closeCase } = useCaseTransition();

  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    closeCase(caseStudy);
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const homeLabel = locale === "ru" ? "← НА ГЛАВНУЮ" : "← HOME";
  const topLabel = locale === "ru" ? "НАВЕРХ ↑" : "TOP ↑";

  return (
    <nav data-case-mobile-actions aria-label="Mobile case actions">
      <Link data-case-mobile-action href={getLocalizedHashHref("/#work", locale)} onClick={handleHomeClick}>
        {homeLabel}
      </Link>
      <button data-case-mobile-action type="button" onClick={handleScrollTop}>
        {topLabel}
      </button>
    </nav>
  );
}
