"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { getDictionary } from "../dictionaries";
import type { CaseStudy } from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";
import { getLocaleFromPathname, getLocalizedHashHref } from "./i18n";

export default function CaseBackLink({ caseStudy }: { caseStudy: CaseStudy }) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const dictionary = getDictionary(locale);
  const { closeCase } = useCaseTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
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

  return (
    <Link data-case-back href={getLocalizedHashHref("/#work", locale)} onClick={handleClick}>
      {dictionary.caseDetail.backToCases}
    </Link>
  );
}
