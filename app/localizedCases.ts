import type { CaseDictionaryEntry, Dictionary } from "../dictionaries";
import {
  caseStudies,
  getCaseBySlug,
  getNextPublishedCase,
  getPreviousPublishedCase,
  getPublishedCaseBySlug,
  publishedCaseStudies,
  type CaseStudy,
} from "./caseData";

function getCaseTranslation(dictionary: Dictionary, slug: string): CaseDictionaryEntry | undefined {
  return dictionary.cases[slug];
}

export function localizeCaseStudy(caseStudy: CaseStudy, dictionary: Dictionary): CaseStudy {
  return {
    ...caseStudy,
    ...getCaseTranslation(dictionary, caseStudy.slug),
  };
}

export function getLocalizedCaseStudies(dictionary: Dictionary) {
  return caseStudies.map((caseStudy) => localizeCaseStudy(caseStudy, dictionary));
}

export function getLocalizedPublishedCaseStudies(dictionary: Dictionary) {
  return publishedCaseStudies.map((caseStudy) => localizeCaseStudy(caseStudy, dictionary));
}

export function getLocalizedCaseBySlug(slug: string, dictionary: Dictionary) {
  const caseStudy = getCaseBySlug(slug);

  return caseStudy ? localizeCaseStudy(caseStudy, dictionary) : undefined;
}

export function getLocalizedPublishedCaseBySlug(slug: string, dictionary: Dictionary) {
  const caseStudy = getPublishedCaseBySlug(slug);

  return caseStudy ? localizeCaseStudy(caseStudy, dictionary) : undefined;
}

export function getLocalizedNextCase(slug: string, dictionary: Dictionary) {
  return localizeCaseStudy(getNextPublishedCase(slug), dictionary);
}

export function getLocalizedPreviousCase(slug: string, dictionary: Dictionary) {
  return localizeCaseStudy(getPreviousPublishedCase(slug), dictionary);
}
