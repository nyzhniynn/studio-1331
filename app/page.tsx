"use client";

import { type MouseEvent, useCallback, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MotionOrchestrator from "./MotionOrchestrator";
import FormChoiceRow from "./FormChoiceRow";
import {
  caseStudies,
  getVisibleHomeCaseCountForSlug,
  homeCaseRevealStep,
  homeVisibleCaseCountKey,
  type CaseStudy,
} from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";

gsap.registerPlugin(ScrollTrigger);

const skipHomeIntroKey = "studio-1331:skip-home-intro";
const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const smallCaseMediaClass = "motion-media";
const largeCaseMediaClass = "motion-media";

function getHomeCaseLayout(index: number) {
  const batch = Math.floor(index / homeCaseRevealStep);
  const position = index % homeCaseRevealStep;
  const largeOnRight = batch % 2 === 0;

  if (position === 0) {
    return largeOnRight
      ? {
          articleClass: "motion-case col-span-12 md:col-span-4 lg:col-span-4",
          mediaClass: smallCaseMediaClass,
        }
      : {
          articleClass: "motion-case col-span-12 md:col-start-1 md:col-end-8 lg:col-start-1 lg:col-end-8",
          mediaClass: largeCaseMediaClass,
        };
  }

  if (position === 1) {
    return largeOnRight
      ? {
          articleClass: "motion-case col-span-12 md:col-start-6 md:col-end-13 lg:col-start-6 lg:col-end-13",
          mediaClass: largeCaseMediaClass,
        }
      : {
          articleClass: "motion-case col-span-12 md:col-start-9 md:col-end-13 lg:col-start-9 lg:col-end-13",
          mediaClass: smallCaseMediaClass,
        };
  }

  return {
    articleClass: "motion-case col-span-12 md:col-span-4 lg:col-span-4",
    mediaClass: smallCaseMediaClass,
  };
}

function shouldSkipHomeIntro() {
  return typeof window !== "undefined" && window.sessionStorage.getItem(skipHomeIntroKey) === "true";
}

function normalizeVisibleCaseCount(count: number) {
  if (!Number.isFinite(count)) {
    return Math.min(homeCaseRevealStep, caseStudies.length);
  }

  const steppedCount = Math.ceil(Math.max(homeCaseRevealStep, count) / homeCaseRevealStep) * homeCaseRevealStep;

  return Math.min(steppedCount, caseStudies.length);
}

function readSavedVisibleCaseCount() {
  if (typeof window === "undefined") {
    return Math.min(homeCaseRevealStep, caseStudies.length);
  }

  if (window.sessionStorage.getItem(restoreHomeScrollKey) !== "true") {
    return Math.min(homeCaseRevealStep, caseStudies.length);
  }

  return normalizeVisibleCaseCount(Number(window.sessionStorage.getItem(homeVisibleCaseCountKey)));
}

function saveVisibleCaseCount(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(homeVisibleCaseCountKey, String(normalizeVisibleCaseCount(count)));
}

export default function Home() {
  const contentMountedRef = useRef(false);
  const contentReadyPromiseRef = useRef<Promise<void> | null>(null);
  const contentReadyResolverRef = useRef<(() => void) | null>(null);
  const [contentMounted, setContentMounted] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const prepareContent = useCallback(() => {
    if (contentMountedRef.current) {
      return contentReadyPromiseRef.current ?? Promise.resolve();
    }

    contentMountedRef.current = true;
    setContentMounted(true);

    contentReadyPromiseRef.current = new Promise<void>((resolve) => {
      contentReadyResolverRef.current = resolve;
    });

    return contentReadyPromiseRef.current;
  }, []);

  const finishIntro = useCallback(() => {
    contentMountedRef.current = true;
    setContentMounted(true);
    setIntroFinished(true);
  }, []);

  useLayoutEffect(() => {
    if (shouldSkipHomeIntro()) {
      window.sessionStorage.removeItem(skipHomeIntroKey);
      contentMountedRef.current = true;

      // This must happen in layout effect so case-return hydration stays stable
      // while the restored home page is ready before the first visible frame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContentMounted(true);
      setIntroFinished(true);
    }
  }, []);

  useLayoutEffect(() => {
    if (!contentMounted || !contentReadyResolverRef.current) {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    let cancelled = false;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const heroBrandFontReady =
          "fonts" in document
            ? document.fonts.load('64px "Instrument Serif"').catch(() => undefined)
            : Promise.resolve();

        heroBrandFontReady.then(() => {
          if (cancelled) {
            return;
          }

          contentReadyResolverRef.current?.();
          contentReadyResolverRef.current = null;
          contentReadyPromiseRef.current = null;
        });
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [contentMounted]);

  useLayoutEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <main className="min-h-screen overflow-x-clip bg-[#f4f4ef] p-3 pb-8 sm:p-5">
      <MobileMenu
        introActive={!introFinished}
        isOpen={mobileMenuOpen}
        onNavigate={() => setMobileMenuOpen(false)}
        onToggle={() => setMobileMenuOpen((isOpen) => !isOpen)}
      />
      {contentMounted ? <MainPageContent introActive={!introFinished} /> : null}
      {!introFinished ? (
        <IntroOverlay onPrepareContent={prepareContent} onComplete={finishIntro} />
      ) : null}
    </main>
  );
}

function MainPageContent({ introActive }: { introActive: boolean }) {
  const caseGridRef = useRef<HTMLDivElement>(null);
  const [initialVisibleCaseCount] = useState(readSavedVisibleCaseCount);
  const previousVisibleCaseCountRef = useRef(initialVisibleCaseCount);
  const teamCarouselRef = useRef<HTMLDivElement>(null);
  const [activeTeamSlide, setActiveTeamSlide] = useState(0);
  const [visibleCaseCount, setVisibleCaseCount] = useState(initialVisibleCaseCount);
  const { openCase, prefetchCase } = useCaseTransition();
  const visibleCases = caseStudies.slice(0, visibleCaseCount);
  const hasMoreCases = visibleCaseCount < caseStudies.length;

  const updateActiveTeamSlide = useCallback(() => {
    const carousel = teamCarouselRef.current;

    if (!carousel) {
      return;
    }

    const cards = Array.from(carousel.querySelectorAll<HTMLElement>("[data-motion-team-card]"));

    if (!cards.length) {
      return;
    }

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    const closestIndex = cards.reduce((closest, card, index) => {
      const currentDistance = Math.abs(cards[closest].offsetLeft + cards[closest].offsetWidth / 2 - carouselCenter);
      const nextDistance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - carouselCenter);

      return nextDistance < currentDistance ? index : closest;
    }, 0);

    setActiveTeamSlide((current) => (current === closestIndex ? current : closestIndex));
  }, []);

  const scrollToTeamSlide = useCallback((index: number) => {
    const carousel = teamCarouselRef.current;
    const card = carousel?.querySelectorAll<HTMLElement>("[data-motion-team-card]")[index];

    if (!carousel || !card) {
      return;
    }

    carousel.scrollTo({
      left: card.offsetLeft,
      behavior: "smooth",
    });
    setActiveTeamSlide(index);
  }, []);

  const showMoreCases = useCallback(() => {
    setVisibleCaseCount((currentCount) => {
      const nextCount = Math.min(currentCount + homeCaseRevealStep, caseStudies.length);

      saveVisibleCaseCount(nextCount);

      return nextCount;
    });
  }, []);

  const handleOpenCase = useCallback((
    event: MouseEvent<HTMLAnchorElement>,
    caseStudy: CaseStudy,
    card: HTMLElement | null,
  ) => {
    const requiredVisibleCount = getVisibleHomeCaseCountForSlug(caseStudy.slug);

    saveVisibleCaseCount(Math.max(visibleCaseCount, requiredVisibleCount));
    openCase(event, caseStudy, card);
  }, [openCase, visibleCaseCount]);

  useLayoutEffect(() => {
    updateActiveTeamSlide();
    window.addEventListener("resize", updateActiveTeamSlide);

    return () => {
      window.removeEventListener("resize", updateActiveTeamSlide);
    };
  }, [updateActiveTeamSlide]);

  useLayoutEffect(() => {
    const previousVisibleCaseCount = previousVisibleCaseCountRef.current;

    if (visibleCaseCount <= previousVisibleCaseCount) {
      previousVisibleCaseCountRef.current = visibleCaseCount;
      return;
    }

    const grid = caseGridRef.current;

    if (!grid) {
      previousVisibleCaseCountRef.current = visibleCaseCount;
      return;
    }

    const newCards = Array.from(grid.querySelectorAll<HTMLElement>("[data-case-visible-index]"))
      .filter((card) => Number(card.dataset.caseVisibleIndex) >= previousVisibleCaseCount);
    const newMedia = newCards
      .map((card) => card.querySelector<HTMLElement>("[data-motion-case-media]"))
      .filter(Boolean) as HTMLElement[];
    const newCaptions = newCards.flatMap((card) =>
      Array.from(card.querySelectorAll<HTMLElement>("[data-case-caption]")),
    );

    if (!newCards.length) {
      previousVisibleCaseCountRef.current = visibleCaseCount;
      ScrollTrigger.refresh();
      return;
    }

    const timeline = gsap.timeline({
      defaults: {
        ease: "power3.out",
      },
      onComplete: () => {
        gsap.set([...newCards, ...newMedia, ...newCaptions], {
          clearProps: "visibility,opacity,transform,filter,clipPath,scale",
        });
        ScrollTrigger.refresh();
      },
    });

    timeline
      .fromTo(
        newCards,
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.78, stagger: 0.06 },
        0,
      )
      .fromTo(
        newMedia,
        { clipPath: "inset(0% 0% 100% 0%)", scale: 1.025 },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          scale: 1,
          duration: 0.9,
          stagger: 0.06,
        },
        0.08,
      )
      .fromTo(
        newCaptions,
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.62, stagger: 0.035 },
        0.28,
      );

    previousVisibleCaseCountRef.current = visibleCaseCount;

    return () => {
      timeline.kill();
    };
  }, [visibleCaseCount]);

  return (
    <div data-motion-main-state={introActive ? "intro" : "ready"} className="contents">
      {!introActive ? <MotionOrchestrator /> : null}
      <DesktopMenu />
      <section id="top" data-motion-hero className="relative h-[calc(220vh-2.75rem)] w-full overflow-visible bg-[#f4f4ef] text-[#1E1E1E] sm:h-[calc(220vh-2.5rem)]">
        <div data-motion-hero-stage className="hero-panel sticky top-3 z-20 h-[calc(100vh-2.75rem)] w-full overflow-hidden sm:top-5 sm:h-[calc(100vh-2.5rem)]">
          <div data-motion-yellow-layer className="absolute inset-0 z-10 overflow-hidden bg-[#FFFB12]">
            <HeroFlowers />

            <div className="relative z-10 flex h-full flex-col px-8 pt-7 pb-9">
              <p data-motion-hero-brand className="hero-brand font-serif text-[64px] leading-[90%] tracking-[-0.02em]">
                13:31 Studio
              </p>

              <div data-motion-hero-copy className="mt-auto pb-[clamp(0rem,1.5vh,1.5rem)]">
                <h1 data-motion-hero-title className="hero-title font-serif text-[clamp(72px,15vh,136px)] leading-[90%] tracking-[-0.02em]">
                  <span data-motion-hero-line className="block italic">
                    Modern websites
                  </span>
                  <span data-motion-hero-line className="block">
                    for companies that have 
                  </span>
                  <span data-motion-hero-line className="block">
                    outgrown templates
                  </span>
                </h1>
                <p
                  className="hero-caption mt-[clamp(1.25rem,1.5vw,2rem)] uppercase leading-[120%] tracking-[-0.02em] text-[#0D0D0D]"
                  style={{ fontFamily: 'var(--font-inter-black)', fontSize: "clamp(16px, 2.7vh, 24px)" }}
                >
                  <span className="hero-caption-line whitespace-nowrap">
                    Custom design aligned with your
                  </span>
                  <span className="hero-caption-line whitespace-nowrap">
                    strategy and scale
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" data-motion-section data-motion-stack className="relative -mt-[calc(120vh-2.75rem)] bg-[#f4f4ef] px-2 pt-[clamp(8rem,12vh,9rem)] pb-0 text-[#1E1E1E] sm:-mt-[calc(120vh-2.5rem)]">
        <div className="mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8">
          <p className="col-span-12 self-start pt-[0.22em] font-sans text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold uppercase leading-none tracking-[-0.035em] lg:col-span-3">
            Who are we helping
          </p>

          <h2 className="who-help-mobile-title col-span-12 mt-10 font-serif text-[64px] leading-[70px] tracking-[-0.025em] text-[#141714] md:hidden">
            <span className="block">We work with mature</span>
            <span className="block">companies, technology</span>
            <span className="block">businesses, and professional</span>
            <span className="block">service providers that have</span>
            <span className="block">complex products or require</span>
            <span className="block">a long decision-making</span>
            <span className="block">process.</span>
          </h2>

          <h2 className="hidden col-span-12 mt-10 max-w-[1420px] font-serif text-[64px] leading-[70px] tracking-[-0.025em] text-[#141714] md:block lg:col-start-3 lg:col-end-12 lg:mt-0">
            <span className="block pl-[330px] whitespace-nowrap">
              We work with mature companies, technology businesses,
            </span>
            <span className="block whitespace-nowrap">
              and professional service providers that have complex products or require a
            </span>
            <span className="block whitespace-nowrap">
              long decision-making process.
            </span>
          </h2>

          <div className="col-span-12 mt-[60px] grid grid-cols-12 gap-x-8 gap-y-14">
            <p className="col-span-12 max-w-[35rem] font-sans text-[clamp(1.25rem,1.25vw,1.55rem)] leading-[1.25] tracking-[-0.035em] lg:col-start-3 lg:col-end-6">
              <span className="block md:hidden">
                Clarity, trust, and a sense
              </span>
              <span className="block md:hidden">
                of trustworthiness are important
              </span>
              <span className="block md:hidden">
                to their audience&mdash;not visual noise.
              </span>
              <span className="hidden whitespace-nowrap md:block">
                Clarity, trust, and a sense of trustworthiness are
              </span>
              <span className="hidden whitespace-nowrap md:block">
                important to their audience&mdash;not visual noise.
              </span>
            </p>

            <p className="col-span-12 w-full max-w-full font-sans text-[clamp(1.25rem,1.25vw,1.55rem)] leading-[1.25] tracking-[-0.035em] indent-[11rem] lg:col-start-7 lg:col-end-13">
              Most often, projects involve redesigning outdated websites, structuring
              a large amount of information, or adapting a digital image to the current scale of the
              business. Budgets, the number of stakeholders, and requirements are usually high &mdash; this is 
              where a thoughtful strategic approach is especially important.
            
            </p>
          </div>

          <div data-motion="media" className="who-help-media motion-media col-span-12 mt-[clamp(4rem,6vw,5rem)] h-[clamp(22rem,25vw,31rem)] bg-[#141714] lg:col-start-7 lg:col-end-13">
            <LockedAutoplayVideo
              className="who-help-video"
              src="/videos/intro2.mp4"
            />
          </div>
        </div>
      </section>

      <section id="work" data-motion-section data-motion-stack data-motion-preset="cases" className="bg-[#f4f4ef] px-2 pt-[150px] pb-[clamp(5rem,8vw,8rem)] text-[#1E1E1E]">
        <div className="mx-auto max-w-[1824px]">
            <header className="max-w-[1120px]">
              <h2 data-motion="reveal" className="w-fit font-serif text-[135px] leading-[1] tracking-[-0.030em] text-[#141714]">
                Featured cases
              </h2>
              <p data-motion="reveal" className="mt-6 max-w-[540px] font-sans text-[20px] font-bold leading-[24px] tracking-[0em] text-[#141714] md:hidden">
                <span className="block">WORKS CREATED AT MOMENTS</span>
                <span className="block">OF GROWTH, CHANGE, AND</span>
                <span className="block">BUSINESS REINVENTION</span>
              </p>
              <p data-motion="reveal" className="mt-6 hidden max-w-[540px] font-sans text-[20px] font-bold leading-[24px] tracking-[0em] text-[#141714] md:block">
                <span className="block whitespace-nowrap">
                  WORKS CREATED AT MOMENTS OF GROWTH, CHANGE,
                </span>
                <span className="block whitespace-nowrap">
                  AND BUSINESS REINVENTION
                </span>
              </p>
          </header>

          <div
            className="mt-[clamp(10rem,15vw,14rem)] grid grid-cols-12 gap-x-8 gap-y-[clamp(4.5rem,6vw,6rem)]"
            ref={caseGridRef}
          >
            {visibleCases.map((caseStudy, index) => {
              const layout = getHomeCaseLayout(index);

              return (
                <article
                  data-case-card-slug={caseStudy.slug}
                  data-case-visible-index={index}
                  data-motion-case-card
                  className={layout.articleClass}
                  key={caseStudy.slug}
                >
                  <a
                    data-case-card-link
                    href={`/cases/${caseStudy.slug}`}
                    onClick={(event) => handleOpenCase(event, caseStudy, event.currentTarget.closest("[data-motion-case-card]") as HTMLElement | null)}
                    onPointerEnter={() => prefetchCase(caseStudy)}
                  >
                    <div data-motion-case-media className={layout.mediaClass}>
                      <img className="case-media-image" src={caseStudy.image} alt={caseStudy.imageAlt} />
                    </div>
                    <CaseCaption
                      title={caseStudy.title}
                      descriptionLines={caseStudy.descriptionLines}
                      mobileDescriptionLines={caseStudy.mobileDescriptionLines}
                    />
                  </a>
                </article>
              );
            })}
          </div>
          {hasMoreCases ? (
            <div className="mt-[clamp(3rem,4vw,5rem)] flex justify-center">
              <button
                className="motion-button inline-flex h-[48px] min-w-[220px] items-center justify-center border border-[#BFBFB8] px-8 font-sans text-[14px] font-bold uppercase leading-none tracking-[0em] text-[#141714]"
                onClick={showMoreCases}
                type="button"
              >
                Show more
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section id="services" data-motion-section data-motion-stack data-motion-preset="services" className="bg-[#f4f4ef] px-2 pt-[clamp(4rem,7vw,7rem)] pb-[clamp(5rem,8vw,8rem)] text-[#1E1E1E]">
        <div className="mx-auto max-w-[1824px]">
          <header>
            <h2 data-motion="reveal" className="inline-flex items-start gap-[18px] font-serif text-[135px] leading-[0.82] tracking-[-0.02em] text-[#141714]">
              Services{" "}
              <span className="translate-y-[4px] font-serif text-[64px] font-normal leading-[0.82] tracking-[-0.02em] text-[#141714]">
                (4)
              </span>
            </h2>
            <p data-motion="reveal" className="mt-[48px] max-w-[48rem] font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714]">
              Each format is a complete system for working with
              <br />
              a specific task. We don&apos;t work in the format of
              <br />
              small tasks or quick launches.
            </p>
          </header>

          <div className="mt-[clamp(9rem,13vw,13rem)] space-y-[clamp(6rem,8vw,9rem)]">
            {services.map((service) => (
              <ServiceItem key={service.index} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section id="process" data-motion-section data-motion-stack data-motion-preset="process" className="bg-[#f4f4ef] px-2 pt-[clamp(5rem,8vw,8rem)] pb-0 text-[#1E1E1E]">
        <div className="mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8">
          <p data-motion="reveal" className="col-span-12 font-sans text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold uppercase leading-none tracking-[-0.035em] lg:col-span-3">
            How we work
          </p>

          <h2 data-motion="reveal" className="col-span-12 mt-8 max-w-[52rem] font-serif text-[clamp(2.75rem,2.55vw,3.4rem)] leading-[1.04] tracking-[-0.045em] lg:col-start-5 lg:col-end-10 lg:mt-0">
            <span className="block whitespace-nowrap">
              A structured process allows you to work with
            </span>
            <span className="block whitespace-nowrap">
              complex tasks without chaos.
            </span>
          </h2>

          <div className="col-span-12 mt-[260px] space-y-[clamp(5rem,7vw,8rem)]">
            {processSteps.map((step, index) => (
              <ProcessStep
                key={step.number}
                step={step}
                alignRight={index % 2 === 1}
                compactTop={step.title === "Design"}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="team" data-motion-section data-motion-stack data-motion-preset="team" className="bg-[#f4f4ef] px-2 pt-[220px] pb-[clamp(6rem,9vw,9rem)] text-[#1E1E1E]">
        <div className="relative mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8">
          <p data-motion="reveal" className="col-span-12 font-sans text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.035em] lg:absolute lg:left-0 lg:top-0 lg:w-[22rem]">
            <span className="block">Who works on</span>
            <span className="block">projects</span>
          </p>

          <h2 data-motion="reveal" className="team-mobile-title col-span-12 mt-8 font-serif text-[64px] leading-[70px] tracking-[-0.02em] text-[#141714] md:hidden">
            <span className="block">Each project is conducted</span>
            <span className="block">personally by key studio</span>
            <span className="block">specialists. We do not work</span>
            <span className="block">on a pipeline model</span>
            <span className="block">and take on a limited</span>
            <span className="block">number of tasks at the</span>
            <span className="block">same time.</span>
          </h2>

          <h2 data-motion="reveal" className="hidden col-span-12 mt-8 overflow-hidden font-serif text-[64px] leading-[70px] tracking-[-0.02em] text-[#141714] md:block lg:mt-0 lg:translate-x-[250px]">
            <span className="block lg:pl-[360px]">
              Each project is conducted personally by key studio
            </span>
            <span className="block lg:pl-[60px]">
              specialists. We do not work on a pipeline model and take on a limited
            </span>
            <span className="block lg:pl-[60px]">
              number of tasks at the same time.
            </span>
          </h2>

          <div data-team-primary-roles className="col-span-12 mt-[70px] grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-8 lg:col-start-3 lg:col-end-11">
            <div className="col-span-12 grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-8">
              <p data-team-role-label className="col-span-12 font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714] lg:col-span-3">
                <span className="block">Who runs the</span>
                <span className="block">projects</span>
              </p>
              <ul data-team-role-list className="col-span-12 font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714] lg:col-span-9 lg:-translate-x-[120px]">
                {projectRoles[0].items.map((item) => (
                  <li key={item} className="flex gap-4">
                    <span aria-hidden="true" className="translate-y-[3px] text-[28px] leading-[18px]">
                      &middot;
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="col-span-12 mt-8 grid grid-cols-1 gap-x-8 lg:grid-cols-5">
            <div data-team-secondary-roles className="grid max-w-full grid-cols-1 gap-y-4 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-x-8 lg:col-start-3 lg:col-end-6">
                <p data-team-role-label className="font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714]">
                  <span className="block">Interaction</span>
                  <span className="block">format</span>
                </p>
                <ul data-team-role-list className="font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714]">
                  {projectRoles[1].items.map((item) => (
                    <li key={item} className="flex gap-4">
                      <span aria-hidden="true" className="translate-y-[3px] text-[28px] leading-[18px]">
                        &middot;
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
          </div>

          <div
            ref={teamCarouselRef}
            data-team-carousel
            onScroll={updateActiveTeamSlide}
            className="col-span-12 mt-[clamp(8rem,12vw,12rem)] flex snap-x snap-mandatory gap-4 overflow-x-auto md:grid md:grid-cols-5 md:gap-x-8 md:gap-y-10 md:overflow-visible"
          >
            {teamMembers.map((member) => (
              <article data-motion-team-card className="motion-case w-[78vw] max-w-[21rem] shrink-0 snap-start md:w-auto md:max-w-none md:shrink" key={member.name}>
                <div data-motion-team-media className="motion-media h-[clamp(20rem,96vw,26rem)] bg-[#D9D9D9] md:h-[clamp(18rem,24vw,26rem)]">
                  <img
                    className="team-media-image"
                    src={member.image}
                    alt={member.imageAlt}
                    style={{ objectPosition: member.objectPosition }}
                  />
                </div>
                <CaseCaption title={member.name} description={member.description} />
              </article>
            ))}
          </div>
          <div data-team-carousel-dots className="col-span-12 mt-5">
            {teamMembers.map((member, index) => (
              <button
                type="button"
                data-team-carousel-dot
                data-active={activeTeamSlide === index}
                aria-label={`Show ${member.name}`}
                aria-current={activeTeamSlide === index ? "true" : undefined}
                onClick={() => scrollToTeamSlide(index)}
                key={member.name}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="brief" data-motion-section data-motion-stack data-motion-preset="form" className="bg-[#f4f4ef] px-2 pt-[120px] pb-[120px] text-[#1E1E1E]">
        <div className="mx-auto max-w-[1824px]">
          <h2 data-motion="reveal" className="font-serif text-[135px] leading-[90%] tracking-[-0.02em] text-[#141714]">
            Tell us about the task
          </h2>
          <p data-motion="reveal" className="mt-[28px] max-w-[760px] font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714]">
            Briefly describe the project or context. We will contact
            <br />
            you and suggest further steps.
          </p>

          <div className="mt-[120px] max-w-[1540px] space-y-[84px]">
            <FormChoiceRow
              title="Services"
              options={[
                "Strategic basis",
                "Brand & Digital Identity",
                "Website & Digital Platform",
                "Redesign of existing products",
              ]}
              serif
            />

            <FormChoiceRow
              title="Budget"
              options={[
                "Less than $20k",
                "$20-$40k",
                "$40-$60k",
                "$60-$80k",
                "$80-$100k",
                "To infinity and beyond",
              ]}
              serif
            />

            <div data-motion-form-item>
              <p className="font-serif text-[64px] italic leading-[0.88] tracking-[-0.03em] text-[#141714]">
                Task
              </p>
              <div className="mt-[38px] max-w-[1490px] border-b border-[#BFBFB8] pb-[10px] font-serif text-[20px] leading-[24px] tracking-[0em] text-[#A9A9A2]">
                Launch and maintenance
              </div>
              <button
                type="button"
                className="motion-link mt-[22px] font-serif text-[24px] leading-none tracking-[-0.02em] text-[#141714]"
              >
                + Attach a file
              </button>
            </div>

            <div data-motion-form-item className="pt-[10px]">
              <p className="font-serif text-[64px] italic leading-[0.88] tracking-[-0.03em] text-[#141714]">
                Contacts
              </p>

              <div className="mt-[48px] grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-2 lg:max-w-[1480px]">
                <FormLineField label="Name" />
                <FormLineField label="Company" />
                <FormLineField label="E-mail" />
                <FormLineField label="Phone" />
              </div>

              <div className="mt-[58px] grid grid-cols-1 gap-x-8 gap-y-8 lg:max-w-[1480px] lg:grid-cols-2 lg:items-end">
                <p className="max-w-[620px] font-sans text-[16px] font-normal leading-[20px] tracking-[0em] text-[#1E1E1E]">
                  By clicking on the &quot;Submit request&quot; button, I consent to the processing
                  <br />
                  of personal data and confirm that I have read the terms and conditions.
                  <br />
                  Personal Data Processing Policies
                </p>
                <button
                  type="button"
                  className="motion-button h-[58px] w-[360px] border border-[#BFBFB8] font-sans text-[18px] font-bold uppercase leading-none tracking-[0em] text-[#141714] lg:justify-self-start"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" data-motion-section data-motion-preset="contact" className="bg-[#f4f4ef] px-0 pt-[150px] pb-[60px] text-[#1E1E1E]">
        <div className="mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8 rounded-[24px] bg-[#FFFB12] px-4 pt-[110px] pb-[70px] sm:px-6 lg:px-3">
          <p className="col-span-12 font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714] lg:col-span-2 lg:pt-[12px]">
            <span className="block">Creative</span>
            <span className="block">collaborations</span>
          </p>

          <div className="col-span-12 mt-10 lg:col-start-3 lg:col-end-13 lg:mt-0">
            <p className="font-serif text-[64px] leading-[70px] tracking-[-0.02em] text-[#141714]">
              <span className="block lg:pl-[300px] lg:whitespace-nowrap">
                We are always interested in working with creative people.
              </span>
              <span className="block lg:whitespace-nowrap">
                If you work with augmented reality, 3D, animation, projections, or
              </span>
              <span className="block lg:whitespace-nowrap">
                anything else, please send a message to hello@1331.agency and we&apos;ll
              </span>
              <span className="block lg:whitespace-nowrap">
                come up with something interesting together
              </span>
            </p>
          </div>

          <div className="col-span-12 mt-[120px] text-center lg:col-start-1 lg:col-end-13">
            <a
              href="mailto:hello@1331.agency"
              className="motion-email whitespace-nowrap font-serif text-[clamp(4rem,16.5vw,19.5rem)] leading-[90%] tracking-[-0.03em] text-[#141714]"
            >
              hello@1331.agency
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}

const desktopMenuItems = [
  { label: "Approach", href: "#approach" },
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Team", href: "#team" },
] as const;

const mobileMenuItems = [
  { label: "Main", href: "#top" },
  { label: "Approach", href: "#approach" },
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Team", href: "#team" },
  { label: "Contact", href: "#contact" },
] as const;

function DesktopMenu() {
  return (
    <nav data-desktop-menu aria-label="Primary navigation">
      <div data-desktop-menu-surface>
        <a data-desktop-menu-brand href="#top" aria-label="13:31 Studio, back to top">
          13:31
        </a>
        <div data-desktop-menu-links>
          {desktopMenuItems.map((item, index) => (
            <a data-desktop-menu-link href={item.href} key={item.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </div>
        <a data-desktop-menu-cta href="#brief">
          Start a project
        </a>
      </div>
    </nav>
  );
}

function MobileMenu({
  introActive,
  isOpen,
  onNavigate,
  onToggle,
}: {
  introActive: boolean;
  isOpen: boolean;
  onNavigate: () => void;
  onToggle: () => void;
}) {
  return (
    <nav data-mobile-menu data-intro={introActive} data-open={isOpen} aria-label="Mobile navigation">
      <button
        type="button"
        data-mobile-menu-toggle
        aria-controls="mobile-menu-panel"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span />
        <span />
      </button>
      <div id="mobile-menu-panel" data-mobile-menu-panel aria-hidden={!isOpen}>
        <MobileMenuFlowers />
        <div data-mobile-menu-header>
          <a data-mobile-menu-brand href="#top" onClick={onNavigate}>
            13:31 Studio
          </a>
          <span data-mobile-menu-lang>EN</span>
        </div>
        <div data-mobile-menu-links>
          {mobileMenuItems.map((item, index) => (
            <a data-mobile-menu-link href={item.href} onClick={onNavigate} key={item.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </div>
        <a data-mobile-menu-cta href="#brief" onClick={onNavigate}>
          Start a project
        </a>
        <div data-mobile-menu-footer>
          <a href="mailto:hello@1331.agency">hello@1331.agency</a>
        </div>
      </div>
    </nav>
  );
}

function MobileMenuFlowers() {
  const flowers = [
    "mobile-menu-flower-a",
    "mobile-menu-flower-b",
    "mobile-menu-flower-c",
    "mobile-menu-flower-d",
  ];

  return (
    <div data-mobile-menu-flowers aria-hidden="true">
      {flowers.map((className) => (
        <div className={`mobile-menu-flower ${className}`} key={className}>
          <svg
            className="mobile-menu-flower-shape"
            width="622"
            height="594"
            viewBox="0 0 622 594"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d={openFlowerPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

function IntroOverlay({
  onPrepareContent,
  onComplete,
}: {
  onPrepareContent: () => Promise<void>;
  onComplete: () => void;
}) {
  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let contentReadyPromise: Promise<void> | null = null;
    let introTimeline: gsap.core.Timeline | null = null;
    let sharedTimeline: gsap.core.Timeline | null = null;
    let disposed = false;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.scrollTo(0, 0);

    if (reduceMotion) {
      onPrepareContent().then(() => {
        if (!disposed) {
          onComplete();
        }
      });
      return;
    }

    const intro = document.querySelector<HTMLElement>("[data-motion-intro]");
    const introStage = document.querySelector<HTMLElement>("[data-motion-intro-stage]");
    const introYellow = document.querySelector<HTMLElement>("[data-motion-intro-yellow]");
    const introBrand = document.querySelector<HTMLElement>("[data-motion-intro-brand]");
    const introPieces = gsap.utils.toArray<HTMLElement>("[data-motion-intro-piece]");
    const introColon = document.querySelector<HTMLElement>("[data-motion-intro-colon]");
    const introStudio = document.querySelector<HTMLElement>("[data-motion-intro-studio]");

    if (!intro || !introStage || !introYellow || !introBrand || !introColon || !introStudio) {
      onComplete();
      return;
    }

    const preventIntroScroll = (event: Event) => {
      event.preventDefault();
      window.scrollTo(0, 0);
    };

    const preventIntroKeys = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) {
        event.preventDefault();
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("wheel", preventIntroScroll, { passive: false });
    window.addEventListener("touchmove", preventIntroScroll, { passive: false });
    window.addEventListener("keydown", preventIntroKeys);

    const cleanup = () => {
      window.removeEventListener("wheel", preventIntroScroll);
      window.removeEventListener("touchmove", preventIntroScroll);
      window.removeEventListener("keydown", preventIntroKeys);
    };

    const completeIntro = () => {
      if (disposed) {
        return;
      }

      cleanup();
      onComplete();
    };

    const prepareMainContent = () => {
      contentReadyPromise ??= onPrepareContent();
      return contentReadyPromise;
    };

    const measureIntroStart = () => {
      const stageRect = introStage.getBoundingClientRect();
      const preferredFontSize = Math.min(Math.max(window.innerWidth * 0.1, 80), 192);

      gsap.set(introBrand, { fontSize: preferredFontSize });

      const preferredWidth = introBrand.getBoundingClientRect().width || 1;
      const safeInlinePadding = window.matchMedia("(max-width: 767px)").matches ? 24 : 0;
      const maxAllowedWidth = Math.max(stageRect.width - safeInlinePadding, 1);
      const fittedFontSize = Math.min(
        preferredFontSize,
        preferredFontSize * (maxAllowedWidth / preferredWidth),
      );

      gsap.set(introBrand, { fontSize: fittedFontSize });

      const fittedWidth = introBrand.getBoundingClientRect().width || 1;

      return {
        fontSize: fittedFontSize,
        left: window.innerWidth / 2 - stageRect.left - fittedWidth / 2,
        top: window.innerHeight / 2 - stageRect.top - fittedFontSize * 0.45,
      };
    };

    const startIntro = async () => {
      prepareMainContent();

      if ("fonts" in document) {
        await document.fonts.load('80px "Instrument Serif"').catch(() => undefined);
      }

      if (disposed) {
        return;
      }

      const introStart = measureIntroStart();

      introTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      introTimeline
        .set(intro, { autoAlpha: 1 })
        .set(introBrand, {
          left: introStart.left,
          top: introStart.top,
          x: 0,
          y: 0,
          scale: 1,
          fontSize: introStart.fontSize,
          transformOrigin: "0% 0%",
        })
        .set(introYellow, {
          clipPath: "polygon(-20% 0%, -20% 0%, -35% 100%, -35% 100%)",
        })
        .fromTo(
          introPieces,
          { autoAlpha: 0, yPercent: (index) => (index === 0 ? 22 : -18), rotate: (index) => (index === 0 ? -4 : 4) },
          { autoAlpha: 1, yPercent: 0, rotate: 0, duration: 1.15, stagger: 0.11 },
          0.08,
        )
        .fromTo(
          introColon,
          { autoAlpha: 0, scale: 0.4, yPercent: -8 },
          { autoAlpha: 1, scale: 1, yPercent: 0, duration: 0.85, ease: "back.out(1.25)" },
          0.36,
        )
        .fromTo(
          introStudio,
          { autoAlpha: 0, xPercent: 8, yPercent: 14, rotate: 2 },
          { autoAlpha: 1, xPercent: 0, yPercent: 0, rotate: 0, duration: 1.05 },
          0.56,
        )
        .to(introYellow, {
          clipPath: "polygon(-20% 0%, 120% 0%, 135% 100%, -35% 100%)",
          duration: 1.55,
          ease: "power4.inOut",
        }, 1.15)
        .set(introYellow, {
          clipPath: "inset(0% 0% 0% 0%)",
        })
        .add(() => {
          introTimeline?.pause();

          prepareMainContent().then(() => {
            if (disposed) {
              return;
            }

            const heroLogo = document.querySelector<HTMLElement>("[data-motion-hero-brand]");
            const heroStage = document.querySelector<HTMLElement>("[data-motion-hero-stage]");

            if (!heroLogo || !heroStage) {
              completeIntro();
              return;
            }

            const toRect = heroLogo.getBoundingClientRect();
            const stageRect = introStage.getBoundingClientRect();
            const targetLeft = toRect.left - stageRect.left;
            const targetTop = toRect.top - stageRect.top;
            const targetFontSize = window.getComputedStyle(heroLogo).fontSize;

            gsap.set(heroLogo, { autoAlpha: 0 });

            sharedTimeline = gsap.timeline({
              defaults: { ease: "power4.inOut" },
              onComplete: completeIntro,
            });

            sharedTimeline
              .to(introBrand, {
                left: targetLeft,
                top: targetTop,
                x: 0,
                y: 0,
                scale: 1,
                fontSize: targetFontSize,
                duration: 1.15,
              })
              .set(heroLogo, { autoAlpha: 1 })
              .to(intro, {
                autoAlpha: 0,
                duration: 0.02,
                ease: "none",
              });
          });
        }, ">");
    };

    void startIntro();

    return () => {
      disposed = true;
      cleanup();
      introTimeline?.kill();
      sharedTimeline?.kill();
    };
  }, [onComplete, onPrepareContent]);

  return (
    <div
      data-motion-intro
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 bg-[#f4f4ef] p-3 pb-8 sm:p-5"
    >
      <div data-motion-intro-stage className="relative h-full w-full overflow-hidden bg-[#f4f4ef]">
        <div data-motion-intro-yellow className="absolute inset-0 bg-[#FFFB12]" />
        <p
          data-motion-intro-brand
          className="absolute whitespace-nowrap font-serif leading-[0.9] tracking-[-0.02em] text-[#141714]"
          style={{ fontSize: "clamp(5rem, 10vw, 12rem)" }}
        >
          <span data-motion-intro-piece className="inline-block">13</span>
          <span data-motion-intro-colon className="inline-block">
            :
          </span>
          <span data-motion-intro-piece className="inline-block">31</span>{" "}
          <span data-motion-intro-studio className="inline-block">
            Studio
          </span>
        </p>
      </div>
    </div>
  );
}

function HeroFlowers() {
  const flowers = [
    "hero-bloom-a",
    "hero-bloom-b",
    "hero-bloom-c",
    "hero-bloom-d",
    "hero-bloom-e",
  ];

  return (
    <div aria-hidden="true" className="hero-bloom-field pointer-events-none absolute inset-0 z-[1]">
      {flowers.map((className, index) => (
        <div className={`hero-bloom ${className}`} data-motion-flower key={className}>
          <div className="hero-bloom-inner">
            <MorphFlower />
          </div>
          <span className="hero-bloom-index">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

function MorphFlower() {
  return (
    <svg
      className="hero-bloom-shape"
      width="622"
      height="594"
      viewBox="0 0 622 594"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        data-flower-morph-path
        data-folded-path={foldedFlowerPath}
        data-open-path={openFlowerPath}
        d={foldedFlowerPath}
        fill="none"
        stroke="#141714"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function LockedAutoplayVideo({ className, src }: { className?: string; src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canLoad, setCanLoad] = useState(false);

  const playVideo = useCallback(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    const playPromise = video.play();

    if (playPromise) {
      playPromise.catch(() => undefined);
    }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    let cancelled = false;
    const enableLoad = () => {
      if (!cancelled) {
        setCanLoad(true);
      }
    };
    const isTransitionIdle = () => !root.dataset.caseTransition;

    if (isTransitionIdle()) {
      queueMicrotask(enableLoad);
      return () => {
        cancelled = true;
      };
    }

    const observer = new MutationObserver(() => {
      if (!isTransitionIdle()) {
        return;
      }

      observer.disconnect();
      enableLoad();
    });

    observer.observe(root, {
      attributeFilter: ["data-case-transition"],
      attributes: true,
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!canLoad) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    playVideo();

    const handlePause = () => playVideo();
    const handleEnded = () => playVideo();
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        playVideo();
      }
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canLoad, playVideo]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      autoPlay={canLoad}
      className={className}
      controls={false}
      disablePictureInPicture
      loop
      muted
      playsInline
      preload={canLoad ? "auto" : "none"}
      src={canLoad ? src : undefined}
      tabIndex={-1}
    />
  );
}

const foldedFlowerPath =
  "M34.0653 125.858L70.711 129.333L37.0595 138.18L18.5878 153.041L14.1151 185.58L46.4637 238.012L80.6119 261.5L107.638 252.925L113.699 218.662L125.99 198.745L124.308 238.636L129.298 259.171L164.559 269.34L189.425 260.687L231.6 241.204L219.691 193.574L176.522 148.388L201.177 166.956L230.403 171.565C242.626 159.449 267.175 135.246 267.578 135.362C267.981 135.478 269.798 120.725 270.657 113.334L263.478 104.171L249.034 91.821L253.828 75.1979L236.138 64.6406L219.051 72.808L204.706 79.0378L214.933 49.2498L215.057 28.0065L199.769 7.22937L176.598 0.547265L129.976 12.7468L103.658 26.4364L97.1489 37.6543L104.426 65.397L82.5595 25.8084L63.5537 23.6013L24.9328 32.652L2.11261 58.8084L7.8293 76.8255L0.566144 102.012L10.39 119.031L34.0653 125.858Z";

const openFlowerPath =
  "M159.213 384.755L192.629 353.865L142.534 356.202L96.7334 324.915L73.0263 298.673L83.9764 264.152L101.221 244.505L127.388 219.645L127.627 184.202L138.064 163.145L167.509 145.944L209.459 142.98L267.094 185.305C268.062 165.792 270.799 126.295 274.011 124.419C277.224 122.543 287.135 96.0093 291.689 82.9771C306.401 77.7737 336.784 67.1653 340.622 66.3596C344.46 65.5539 356.109 70.6766 361.453 73.3386L366.224 89.6998L365.014 117.334L375.633 88.3923L387.678 81.3557L398.385 75.101L429.659 68.2012L454.024 76.1079L477.285 102.611L486.861 132.321L465.134 179.121L451.387 202.708L461.693 208.058L505.317 205.911L540.875 211.467L552.603 231.543L565.373 253.404L573.249 299.665L568.125 313.429L542.739 339.627L544.427 361.978L545.187 387.863L490.383 413.893L451.185 416.446L403.272 398.959L378.633 369.072L365.505 370.159L366.601 397.643L383.549 440.997L360.934 495.496L330.526 519.243L259.648 533.122L240.786 524.395L227.494 501.642L206.885 490.943L171.626 489.998C161.855 486.93 141.361 480.392 137.552 478.788C133.742 477.183 132.793 441.277 132.794 423.524L159.213 384.755Z";

function CaseCaption({
  title,
  description,
  descriptionLines,
  mobileDescriptionLines,
}: {
  title?: string;
  description?: string;
  descriptionLines?: string[];
  mobileDescriptionLines?: string[];
}) {
  const desktopLines = descriptionLines ?? [description ?? "Project description"];
  const mobileText = (mobileDescriptionLines ?? desktopLines).join(" ");

  return (
    <div data-case-caption className="mt-5">
      <p className="font-sans text-[20px] font-bold uppercase leading-[1.2] tracking-[0em] text-[#1E1E1E]">
        {title ?? "PROJECT NAME"}
      </p>
      <div className="mt-1 font-sans text-[20px] font-normal leading-[1.2] tracking-[0em] text-[#1E1E1E] md:hidden">
        <p className="case-caption-mobile-text">{mobileText}</p>
      </div>
      <div className="mt-1 hidden font-sans text-[20px] font-normal leading-[1.2] tracking-[0em] text-[#1E1E1E] md:block">
        {desktopLines.map((line) => (
          <p key={line} className="whitespace-nowrap">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

const services = [
  {
    code: "(A)",
    index: "1.1",
    title: "Strategic basis",
    description: [
      "Creating a semantic and visual direction",
      "for growth, entering a new market, or",
      "making business changes",
    ],
    bullets: [
      "Analysis of the situation and goals",
      "Formation of positioning",
      "Communication architecture",
      "The basis for the brand and website",
    ],
  },
  {
    code: "(B)",
    index: "1.2",
    title: "Brand & Digital Identity",
    description: [
      "Creating a holistic visual language for",
      "complex products and organizations",
    ],
    bullets: [
      "Logo and visual system",
      "Typography and graphics",
      "Rules of use",
      "Preparation for the digital environment",
    ],
  },
  {
    code: "(C)",
    index: "1.3",
    title: "Website & Digital Platform",
    description: [
      "Designing and creating websites that work",
      "as a business tool",
    ],
    bullets: [
      "Information Architecture",
      "UX and Design",
      "Content structure",
      "Development and launch",
    ],
  },
  {
    code: "(D)",
    index: "1.4",
    title: "Redesign of existing products",
    description: [
      "For companies that have already grown",
      "out of the current solution",
    ],
    bullets: [
      "We will enhance the visual appeal,",
      "match new market trends or reflect",
      "changes in the company's strategy.",
    ],
    plainBullets: true,
  },
];

type Service = (typeof services)[number];

const processSteps = [
  {
    number: "01.",
    label: "Immersion and analysis",
    title: "Immersion",
    description: [
      "We study the business, context, and objectives to",
      "determine the real goals of the project.",
    ],
    mobileDescription: [
      "We study the business, context,",
      "and objectives to determine",
      "the real goals of the project.",
    ],
    details: [
      "Interviews with stakeholders",
      "Product and audience analysis",
      "Identification of limitations and opportunities",
    ],
  },
  {
    number: "02.",
    label: "Forming a solution",
    title: "Strategy",
    description: [
      "We define how the project should work at the level",
      "of meaning, structure and communication.",
    ],
    mobileDescription: [
      "We define how the project should",
      "work at the level of meaning,",
      "structure and communication.",
    ],
    details: [
      "Positioning",
      "Information architecture",
      "Basic design principles",
      "Alignment of the direction",
    ],
  },
  {
    number: "03.",
    label: "System design and development",
    title: "Design",
    description: [
      "We are creating a visual and functional",
      "system based on the adopted strategy.",
    ],
    mobileDescription: [
      "We are creating a visual and",
      "functional system based on",
      "the adopted strategy.",
    ],
    details: [
      "UX and visual design",
      "Content-Structure",
      "Iterations and approvals",
      "Preparation for implementation",
    ],
  },
  {
    number: "04.",
    label: "Launch and maintenance",
    title: "Realization",
    description: [
      "We bring the solution to a working state",
      "and transfer it to the client's team.",
    ],
    mobileDescription: [
      "We bring the solution to a",
      "working state and transfer it",
      "to the client's team.",
    ],
    details: [
      "Development and testing",
      "Preparation of materials",
      "Launch support",
      "System transfer",
    ],
  },
] as const;

const projectRoles = [
  {
    label: "Who runs the projects",
    items: [
      "Strategy, design and decisions are made within the team",
      "There is no outsourcing of key stages",
      "If necessary, narrow experts are involved",
    ],
  },
  {
    label: "Interaction format",
    items: [
      "Direct contact with those responsible for the project",
      "Work with managers and key teams of the client",
      "A limited number of projects at the same time",
    ],
  },
] as const;

const teamMembers = [
  { name: "YEGOR", description: "Art Director", image: "/PhotoTeam/YEGOR.jpg", imageAlt: "Yegor", objectPosition: "center 18%" },
  { name: "PAVEL", description: "CEO", image: "/PhotoTeam/Pavel.jpg", imageAlt: "Pavel", objectPosition: "center" },
  { name: "NIKITA", description: "Creative Technologist", image: "/PhotoTeam/NIKITA.jpg", imageAlt: "Nikita", objectPosition: "center" },
  { name: "ROMAN", description: "Brand Identity Designer", image: "/PhotoTeam/Roman.jpg", imageAlt: "Roman", objectPosition: "center top" },
  { name: "EVGENIY", description: "Full-Stack Developer", image: "/PhotoTeam/Evgeny1.png", imageAlt: "Evgeniy", objectPosition: "center" },
] as const;

type ProcessStepData = (typeof processSteps)[number];

function ServiceItem({ service }: { service: Service }) {
  return (
    <article data-motion-service-row>
      <div className="grid grid-cols-12 items-end gap-x-8">
        <h3
          data-motion-service-title
          className={`col-span-12 -mb-[-12px] font-serif text-[96px] leading-[60px] tracking-[-0.03em] italic text-[#141714] lg:col-span-6 ${
            service.title === "Redesign of existing products" ? "whitespace-nowrap" : ""
          }`}
        >
          {service.title}
        </h3>
        <p data-motion-service-index className="col-span-12 font-serif text-[clamp(3.8rem,4.35vw,5.5rem)] leading-[0.9] tracking-[-0.055em] lg:col-start-9 lg:col-end-13">
          {service.index}
        </p>
      </div>

      <div data-motion="line" className="mt-5 border-t border-[#1E1E1E]" />

      <div data-motion-service-body className="mt-4 grid grid-cols-12 gap-x-8 font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714]">
        <p className="col-span-2 font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714]">
          Product
        </p>
        <p className="col-span-1 font-bold lg:col-start-4">{service.code}</p>
        <p className="service-description col-span-3 w-[22rem] max-w-full font-bold uppercase lg:col-start-5 lg:col-end-8">
          {service.description.map((line) => (
            <span className="service-description-line" key={line}>
              {line}
            </span>
          ))}
        </p>
        {service.plainBullets ? (
          <p className="col-span-12 max-w-[32rem] lg:col-start-9 lg:col-end-13">
            {service.bullets.map((line) => (
              <span className="block whitespace-nowrap" key={line}>
                {line}
              </span>
            ))}
          </p>
        ) : (
          <ul className="col-span-12 lg:col-start-9 lg:col-end-13">
            {service.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-4">
                <span aria-hidden="true" className="translate-y-[3px] text-[28px] leading-[18px]">
                  &middot;
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function ProcessStep({
  step,
  alignRight,
  compactTop,
}: {
  step: ProcessStepData;
  alignRight: boolean;
  compactTop?: boolean;
}) {
  return (
    <article data-motion-process-step className={`grid grid-cols-12 gap-x-8 gap-y-6 ${compactTop ? "-mt-20" : ""}`}>
      <div data-motion-process-meta className={`col-span-12 ${alignRight ? "lg:col-start-5 lg:col-end-9" : "lg:col-span-4"}`}>
        <div className="grid grid-cols-[auto_1fr] items-start gap-x-6 font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714]">
          <p>{step.number}</p>
          <p>{step.label}</p>
        </div>
        <div data-motion="line" className="mt-3 border-t border-[#1E1E1E]" />
      </div>

      <div
        data-motion-process-content
        className={`col-span-12 ${
          alignRight ? "lg:col-start-9 lg:col-end-13" : "lg:col-start-5 lg:col-end-9"
        }`}
      >
        <h3 className="-mt-10 font-serif text-[clamp(4.2rem,5vw,6.4rem)] leading-[0.9] tracking-[-0.045em] italic">
          {step.title}
        </h3>
        <p className="mt-4 max-w-[28rem] font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714] md:hidden">
          {step.mobileDescription.map((line) => (
            <span className="block" key={line}>
              {line}
            </span>
          ))}
        </p>
        <p className="mt-4 hidden max-w-[28rem] font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714] md:block">
          {step.description.map((line) => (
            <span className="block whitespace-nowrap" key={line}>
              {line}
            </span>
          ))}
        </p>
        <div className="mt-8 grid grid-cols-[auto_1fr] gap-x-10">
          <p className="font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714]">
            Details
          </p>
          <ul className="font-sans text-[clamp(1.2rem,1.15vw,1.45rem)] leading-[1.25] tracking-[-0.03em]">
            {step.details.map((item) => (
              <li key={item} className="flex gap-4">
                <span aria-hidden="true" className="translate-y-[3px] text-[28px] leading-[18px]">
                  &middot;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function FormLineField({ label }: { label: string }) {
  return (
    <label className="block">
      <span className="block font-serif text-[clamp(1.35rem,1.2vw,1.7rem)] leading-none tracking-[-0.04em] text-[#9A9A9A]">
        {label}
      </span>
      <input
        type={label === "E-mail" ? "email" : label === "Phone" ? "tel" : "text"}
        name={label.toLowerCase().replace("-", "")}
        className="motion-field mt-3 block h-[26px] w-full border-0 border-b border-[#BFBFB8] bg-transparent px-0 font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714] outline-none"
      />
    </label>
  );
}
