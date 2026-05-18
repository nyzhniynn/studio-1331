"use client";

import type { MouseEvent } from "react";
import type { CaseStudy } from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";

type CaseProjectNavLinkProps = {
  caseStudy: CaseStudy;
  direction: "previous" | "next";
  displayTitle: string;
};

export default function CaseProjectNavLink({
  caseStudy,
  direction,
  displayTitle,
}: CaseProjectNavLinkProps) {
  const { prefetchCase, switchCase } = useCaseTransition();
  const label = direction === "previous" ? "Previous project" : "Next project";

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    switchCase(event, caseStudy);
  };

  return (
    <a
      aria-label={`${label}: ${displayTitle}`}
      data-case-detail-project-nav
      data-direction={direction}
      href={`/cases/${caseStudy.slug}`}
      onClick={handleClick}
      onPointerEnter={() => prefetchCase(caseStudy)}
    >
      <figure data-case-detail-project-nav-media>
        <img src={caseStudy.image} alt="" />
      </figure>
      <span data-case-detail-project-nav-meta>{label}</span>
      <span data-case-detail-project-nav-title>{displayTitle}</span>
      <span data-case-detail-project-nav-category>{caseStudy.category} / {caseStudy.year}</span>
    </a>
  );
}
