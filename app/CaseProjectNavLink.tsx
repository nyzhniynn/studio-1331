"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getDictionary } from "../dictionaries";
import type { CaseStudy } from "./caseData";
import { getImageDimensions } from "./imageMetadata";
import { useCaseTransition } from "./CaseTransitionProvider";
import { getCasePath, getLocaleFromPathname } from "./i18n";

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
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const dictionary = getDictionary(locale);
  const { prefetchCase, switchCase } = useCaseTransition();
  const imageDimensions = getImageDimensions(caseStudy.image);
  const label = direction === "previous"
    ? dictionary.caseDetail.previousProject
    : dictionary.caseDetail.nextProject;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    switchCase(event, caseStudy);
  };

  return (
    <a
      aria-label={`${label}: ${displayTitle}`}
      data-case-detail-project-nav
      data-direction={direction}
      href={getCasePath(caseStudy.slug, locale)}
      onClick={handleClick}
      onPointerEnter={() => prefetchCase(caseStudy)}
    >
      <figure data-case-detail-project-nav-media>
        <Image
          alt=""
          height={imageDimensions.height}
          loading="lazy"
          sizes="(max-width: 767px) 45vw, 13rem"
          src={caseStudy.image}
          width={imageDimensions.width}
        />
      </figure>
      <span data-case-detail-project-nav-meta>{label}</span>
      <span data-case-detail-project-nav-title>{displayTitle}</span>
      <span data-case-detail-project-nav-category>{caseStudy.category} / {caseStudy.year}</span>
    </a>
  );
}
