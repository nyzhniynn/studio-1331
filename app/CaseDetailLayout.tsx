import type { ReactNode } from "react";
import CaseContactForm from "./CaseContactForm";
import CaseProjectNavLink from "./CaseProjectNavLink";
import CaseVisualGallery from "./CaseVisualGallery";
import type { CaseStudy } from "./caseData";
import type { Dictionary } from "../dictionaries";

type CaseNarrative = {
  overview: string;
  challenge: string[];
  solution: string[];
  result: string[];
};

type CaseDetailLayoutProps = {
  backSlot: ReactNode;
  caseStudy: CaseStudy;
  dictionary: Dictionary;
  nextCase: CaseStudy;
  previousCase: CaseStudy;
};

export function formatDisplayTitle(title: string) {
  return title
    .split(" ")
    .map((word) => (word === "KNGK" ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ");
}

export function buildCaseNarrative(caseStudy: CaseStudy, dictionary: Dictionary): CaseNarrative {
  const narrative = dictionary.caseDetail.narrative;

  return {
    overview: caseStudy.summary,
    challenge: [
      caseStudy.challenge,
      ...narrative.challengeExtra,
    ],
    solution: [
      caseStudy.solution,
      ...narrative.solutionExtra,
    ],
    result: [
      caseStudy.result,
      narrative.resultExtra,
    ],
  };
}

export default function CaseDetailLayout({
  backSlot,
  caseStudy,
  dictionary,
  nextCase,
  previousCase,
}: CaseDetailLayoutProps) {
  const displayTitle = formatDisplayTitle(caseStudy.title);
  const narrative = buildCaseNarrative(caseStudy, dictionary);
  const titleTone = displayTitle.length > 18 ? "wide" : "regular";
  const labels = dictionary.caseDetail;

  return (
    <main data-case-detail className="min-h-screen bg-[#f4f4ef] p-3 pb-8 text-[#141714] sm:p-5">
      <section data-case-detail-poster>
        <h1 data-case-detail-title data-title-tone={titleTone}>
          {displayTitle}
        </h1>
      </section>

      <section data-case-detail-sheet>
        <div data-case-detail-left-rail>
          <CaseProfileBlock caseStudy={caseStudy} label={labels.workProfile} />
          <CaseCopyBlock label={labels.aboutProject} lead={narrative.overview} />
          <CaseCopyBlock label={labels.task} paragraphs={narrative.challenge} />
          <CaseCopyBlock label={labels.process} paragraphs={narrative.solution} />
          <CaseCopyBlock label={labels.result} paragraphs={narrative.result} />
        </div>

        <div data-case-detail-divider aria-hidden="true" />

        <aside data-case-detail-visual-rail>
          <div data-case-detail-right-note>
            {backSlot}
            <p>{caseStudy.category} / {labels.fullCase}</p>
          </div>

          <VisualStack caseStudy={caseStudy} dictionary={dictionary} />
        </aside>
      </section>

      <CaseQuietFooter nextCase={nextCase} previousCase={previousCase} />
      <CaseContactForm dictionary={dictionary} />
    </main>
  );
}

function CaseProfileBlock({ caseStudy, label }: { caseStudy: CaseStudy; label: string }) {
  return (
    <section data-case-detail-copy-row data-row="profile">
      <p data-case-detail-copy-label>{label}</p>
      <div data-case-detail-copy-content>
        <p data-case-detail-profile-services>{caseStudy.services.join(", ")}</p>
        <p data-case-detail-profile-year>{caseStudy.year}</p>
        <p data-case-detail-profile-role>{caseStudy.role}</p>
      </div>
    </section>
  );
}

function CaseCopyBlock({
  label,
  lead,
  paragraphs,
}: {
  label: string;
  lead?: string;
  paragraphs?: string[];
}) {
  return (
    <section data-case-detail-copy-row>
      <p data-case-detail-copy-label>{label}</p>
      <div data-case-detail-copy-content>
        {lead ? <p data-case-detail-lead>{lead}</p> : null}
        {paragraphs?.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

function VisualStack({ caseStudy, dictionary }: { caseStudy: CaseStudy; dictionary: Dictionary }) {
  const caseVisuals = caseStudy.slides ?? [];

  if (!caseVisuals.length) {
    return null;
  }

  return <CaseVisualGallery dictionary={dictionary} images={caseVisuals} title={caseStudy.title} />;
}

function CaseQuietFooter({
  nextCase,
  previousCase,
}: {
  nextCase: CaseStudy;
  previousCase: CaseStudy;
}) {
  return (
    <footer data-case-detail-footer>
      <div data-case-detail-footer-line aria-hidden="true" />
      <CaseProjectNavCard direction="previous" caseStudy={previousCase} />
      <CaseProjectNavCard direction="next" caseStudy={nextCase} />
    </footer>
  );
}

function CaseProjectNavCard({
  caseStudy,
  direction,
}: {
  caseStudy: CaseStudy;
  direction: "previous" | "next";
}) {
  return <CaseProjectNavLink caseStudy={caseStudy} direction={direction} displayTitle={formatDisplayTitle(caseStudy.title)} />;
}
