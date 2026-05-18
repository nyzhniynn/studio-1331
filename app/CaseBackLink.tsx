"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { CaseStudy } from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";

export default function CaseBackLink({ caseStudy }: { caseStudy: CaseStudy }) {
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
    <Link data-case-back href="/#work" onClick={handleClick}>
      Back to cases
    </Link>
  );
}
