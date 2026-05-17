import { notFound } from "next/navigation";
import CaseBackLink from "../../CaseBackLink";
import CaseDetailLayout from "../../CaseDetailLayout";
import { caseStudies, getCaseBySlug, getNextCase, getPreviousCase } from "../../caseData";

export function generateStaticParams() {
  return caseStudies.map((caseStudy) => ({
    slug: caseStudy.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caseStudy = getCaseBySlug(slug);

  if (!caseStudy) {
    return {
      title: "Case not found | 13:31 Studio",
    };
  }

  return {
    title: `${caseStudy.title} | 13:31 Studio`,
    description: caseStudy.summary,
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caseStudy = getCaseBySlug(slug);

  if (!caseStudy) {
    notFound();
  }

  const nextCase = getNextCase(caseStudy.slug);
  const previousCase = getPreviousCase(caseStudy.slug);

  return (
    <CaseDetailLayout
      backSlot={<CaseBackLink caseStudy={caseStudy} />}
      caseStudy={caseStudy}
      nextCase={nextCase}
      previousCase={previousCase}
    />
  );
}
