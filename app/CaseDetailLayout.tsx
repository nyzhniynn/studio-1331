import type { ReactNode } from "react";
import CaseContactForm from "./CaseContactForm";
import CaseProjectNavLink from "./CaseProjectNavLink";
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
  primaryVisual?: "image" | "slot";
  transition?: boolean;
};

function transitionAttr(name: string, enabled: boolean) {
  return enabled ? { [name]: "" } : {};
}

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
  primaryVisual = "image",
  transition = false,
}: CaseDetailLayoutProps) {
  const displayTitle = formatDisplayTitle(caseStudy.title);
  const narrative = buildCaseNarrative(caseStudy);
  const titleTone = displayTitle.length > 18 ? "wide" : "regular";

  return (
    <main data-case-detail className="min-h-screen bg-[#f4f4ef] p-3 pb-8 text-[#141714] sm:p-5">
      <section data-case-detail-poster>
        <h1
          data-case-detail-title
          data-title-tone={titleTone}
          {...transitionAttr("data-case-transition-title", transition)}
        >
          {displayTitle}
        </h1>
      </section>

      <section data-case-detail-sheet>
        <div data-case-detail-left-rail {...transitionAttr("data-case-transition-left-rail", transition)}>
          <CaseProfileBlock caseStudy={caseStudy} transition={transition} />
          <CaseCopyBlock label="About project" lead={narrative.overview} transition={transition} />
          <CaseCopyBlock label="Task" paragraphs={narrative.challenge} transition={transition} />
          <CaseCopyBlock label="Process" paragraphs={narrative.solution} transition={transition} />
          <CaseCopyBlock label="Result" paragraphs={narrative.result} transition={transition} />
        </div>

        <div
          data-case-detail-divider
          aria-hidden="true"
          {...transitionAttr("data-case-transition-divider", transition)}
        />

        <aside data-case-detail-visual-rail>
          <div data-case-detail-right-note {...transitionAttr("data-case-transition-right-note", transition)}>
            {backSlot}
            <p>{caseStudy.category} / Full case</p>
          </div>

          <VisualStack caseStudy={caseStudy} primaryVisual={primaryVisual} transition={transition} />
        </aside>
      </section>

      <CaseQuietFooter nextCase={nextCase} previousCase={previousCase} transition={transition} />
      <CaseContactForm />
    </main>
  );
}

function CaseProfileBlock({
  caseStudy,
  transition,
}: {
  caseStudy: CaseStudy;
  transition: boolean;
}) {
  return (
    <section
      data-case-detail-copy-row
      data-row="profile"
      {...transitionAttr("data-case-transition-copy-row", transition)}
    >
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
  transition,
}: {
  label: string;
  lead?: string;
  paragraphs?: string[];
  transition: boolean;
}) {
  return (
    <section data-case-detail-copy-row {...transitionAttr("data-case-transition-copy-row", transition)}>
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

function VisualStack({
  caseStudy,
  primaryVisual,
  transition,
}: {
  caseStudy: CaseStudy;
  primaryVisual: "image" | "slot";
  transition: boolean;
}) {
  const followupVisuals = [1, 2];

  return (
    <div data-case-detail-visual-stack>
      <figure data-case-detail-media {...transitionAttr("data-case-transition-target-media", transition)}>
        <img
          aria-hidden={primaryVisual === "slot" ? "true" : undefined}
          className="case-media-image"
          src={caseStudy.image}
          alt={primaryVisual === "image" ? caseStudy.imageAlt : ""}
        />
      </figure>
      {followupVisuals.map((index) => (
        <figure
          data-case-detail-visual
          {...transitionAttr("data-case-transition-followup-visual", transition)}
          key={index}
        >
          <img className="case-media-image" src={caseStudy.image} alt="" />
        </figure>
      ))}
    </div>
  );
}

function CaseQuietFooter({
  nextCase,
  previousCase,
  transition,
}: {
  nextCase: CaseStudy;
  previousCase: CaseStudy;
  transition: boolean;
}) {
  return (
    <footer data-case-detail-footer {...transitionAttr("data-case-transition-footer", transition)}>
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
