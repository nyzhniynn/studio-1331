import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary } from "../../../../dictionaries";
import CaseBackLink from "../../../CaseBackLink";
import CaseDetailLayout from "../../../CaseDetailLayout";
import { publishedCaseStudies } from "../../../caseData";
import { getLocalizedNextCase, getLocalizedPreviousCase, getLocalizedPublishedCaseBySlug } from "../../../localizedCases";

const dictionary = getDictionary("ru");

export function generateStaticParams() {
  return publishedCaseStudies.map((caseStudy) => ({
    slug: caseStudy.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = getLocalizedPublishedCaseBySlug(slug, dictionary);

  if (!caseStudy) {
    return {
      title: dictionary.caseDetail.notFoundTitle,
    };
  }

  return {
    title: `${caseStudy.title} | 13:31 Studio`,
    description: caseStudy.summary,
    alternates: {
      canonical: `/ru/cases/${caseStudy.slug}`,
      languages: {
        en: `/cases/${caseStudy.slug}`,
        ru: `/ru/cases/${caseStudy.slug}`,
      },
    },
    openGraph: {
      title: `${caseStudy.title} | 13:31 Studio`,
      description: caseStudy.summary,
      url: `/ru/cases/${caseStudy.slug}`,
    },
  };
}

export default async function RussianCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caseStudy = getLocalizedPublishedCaseBySlug(slug, dictionary);

  if (!caseStudy) {
    notFound();
  }

  const nextCase = getLocalizedNextCase(caseStudy.slug, dictionary);
  const previousCase = getLocalizedPreviousCase(caseStudy.slug, dictionary);

  return (
    <CaseDetailLayout
      backSlot={<CaseBackLink caseStudy={caseStudy} />}
      caseStudy={caseStudy}
      dictionary={dictionary}
      nextCase={nextCase}
      previousCase={previousCase}
    />
  );
}
