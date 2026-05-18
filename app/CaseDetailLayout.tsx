import type { ReactNode } from "react";
import CaseContactForm from "./CaseContactForm";
import CaseProjectNavLink from "./CaseProjectNavLink";
import CaseVisualGallery from "./CaseVisualGallery";
import type { CaseStudy } from "./caseData";

type CaseNarrative = {
  overview: string;
  challenge: string[];
  solution: string[];
  result: string[];
};

type CaseDetailLayoutProps = {
  backSlot: ReactNode;
  caseStudy: CaseStudy;
  nextCase: CaseStudy;
  previousCase: CaseStudy;
};

export function formatDisplayTitle(title: string) {
  return title
    .split(" ")
    .map((word) => (word === "KNGK" ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ");
}

export function buildCaseNarrative(caseStudy: CaseStudy): CaseNarrative {
  return {
    overview: caseStudy.summary,
    challenge: [
      caseStudy.challenge,
      "The task was to keep the communication calm and precise, while giving the project enough visual scale to feel mature and memorable.",
      "The page had to work for people who scan quickly: stakeholders, partners, and teams who need the main idea without fighting the interface.",
    ],
    solution: [
      caseStudy.solution,
      "We used a restrained typographic system, strict spacing, and large visual blocks so the case reads like a designed document rather than a template page.",
      "The visual rhythm is intentionally quiet: fewer effects, more structure, clear image sequencing, and a consistent editorial grid.",
    ],
    result: [
      caseStudy.result,
      "The final presentation gives the project a clearer digital image and makes the work easier to evaluate through structure, hierarchy, and visual evidence.",
    ],
  };
}

export default function CaseDetailLayout({
  backSlot,
  caseStudy,
  nextCase,
  previousCase,
}: CaseDetailLayoutProps) {
  const displayTitle = formatDisplayTitle(caseStudy.title);
  const narrative = buildCaseNarrative(caseStudy);
  const titleTone = displayTitle.length > 18 ? "wide" : "regular";

  return (
    <main data-case-detail className="min-h-screen bg-[#f4f4ef] p-3 pb-8 text-[#141714] sm:p-5">
      <section data-case-detail-poster>
        <h1 data-case-detail-title data-title-tone={titleTone}>
          {displayTitle}
        </h1>
      </section>

      <section data-case-detail-sheet>
        <div data-case-detail-left-rail>
          <CaseProfileBlock caseStudy={caseStudy} />
          <CaseCopyBlock label="About project" lead={narrative.overview} />
          <CaseCopyBlock label="Task" paragraphs={narrative.challenge} />
          <CaseCopyBlock label="Process" paragraphs={narrative.solution} />
          <CaseCopyBlock label="Result" paragraphs={narrative.result} />
        </div>

        <div data-case-detail-divider aria-hidden="true" />

        <aside data-case-detail-visual-rail>
          <div data-case-detail-right-note>
            {backSlot}
            <p>{caseStudy.category} / Full case</p>
          </div>

          <VisualStack caseStudy={caseStudy} />
        </aside>
      </section>

      <CaseQuietFooter nextCase={nextCase} previousCase={previousCase} />
      <CaseContactForm />
    </main>
  );
}

function CaseProfileBlock({ caseStudy }: { caseStudy: CaseStudy }) {
  return (
    <section data-case-detail-copy-row data-row="profile">
      <p data-case-detail-copy-label>Work profile</p>
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

function VisualStack({ caseStudy }: { caseStudy: CaseStudy }) {
  const caseVisuals = caseStudy.slides ?? [];

  if (!caseVisuals.length) {
    return null;
  }

  return <CaseVisualGallery images={caseVisuals} title={caseStudy.title} />;
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
