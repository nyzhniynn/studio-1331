"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  memo,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MotionOrchestrator from "./MotionOrchestrator";
import FormChoiceRow from "./FormChoiceRow";
import LanguageSwitcher from "./LanguageSwitcher";
import {
  getVisibleHomeCaseCountForSlug,
  homeCaseRevealStep,
  homeVisibleCaseCountKey,
  publishedCaseStudies,
  type CaseStudy,
} from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";
import { defaultLocale, getCasePath, type Locale } from "./i18n";
import { getLocalizedPublishedCaseStudies } from "./localizedCases";
import { getDictionary, type Dictionary } from "../dictionaries";

gsap.registerPlugin(ScrollTrigger);

const skipHomeIntroKey = "studio-1331:skip-home-intro";
const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const smallCaseMediaClass = "motion-media";
const largeCaseMediaClass = "motion-media";
const caseHoverQuery = "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";
const contactFileMaxSize = 4 * 1024 * 1024;
const contactFileAccept = ".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx";
const contactAllowedFileExtensions = new Set(["pdf", "png", "jpg", "jpeg", "zip", "doc", "docx"]);

function getBrandFontFamily() {
  return "Instrument Serif";
}

type CaseHoverValues = {
  imageX: number;
  imageY: number;
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
};

type ContactFormFields = {
  company: string;
  email: string;
  name: string;
  phone: string;
  task: string;
};

type ContactFormStatus = "idle" | "loading" | "success" | "error";

const baseCaseHoverTransform =
  "perspective(1200px) translate3d(0px, 0px, 0) rotateX(0deg) rotateY(0deg)";
const homeCasePreviewCount = homeCaseRevealStep;
const homeCaseShowMoreEnabled = false;

function clampHoverAxis(value: number) {
  return Math.min(1, Math.max(-1, value));
}

function canUseCaseHover(event?: ReactPointerEvent<HTMLElement>) {
  return (
    (!event || event.pointerType !== "touch") &&
    window.matchMedia(caseHoverQuery).matches
  );
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();

  return extension ? extension.toLowerCase() : "";
}

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

function setSiteIntroLock(active: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  if (active) {
    document.documentElement.dataset.siteIntro = "true";
    delete document.documentElement.dataset.siteReady;
    return;
  }

  document.documentElement.dataset.siteReady = "true";
  delete document.documentElement.dataset.siteIntro;
}

function getInitialHomeIntroState() {
  return {
    contentMounted: false,
    introFinished: false,
  };
}

function normalizeVisibleCaseCount(count: number) {
  if (!Number.isFinite(count)) {
    return Math.min(homeCaseRevealStep, publishedCaseStudies.length);
  }

  const steppedCount = Math.ceil(Math.max(homeCaseRevealStep, count) / homeCaseRevealStep) * homeCaseRevealStep;

  return Math.min(steppedCount, publishedCaseStudies.length);
}

function readSavedVisibleCaseCount() {
  if (typeof window === "undefined") {
    return Math.min(homeCaseRevealStep, publishedCaseStudies.length);
  }

  if (window.sessionStorage.getItem(restoreHomeScrollKey) !== "true") {
    return Math.min(homeCaseRevealStep, publishedCaseStudies.length);
  }

  return normalizeVisibleCaseCount(Number(window.sessionStorage.getItem(homeVisibleCaseCountKey)));
}

function saveVisibleCaseCount(count: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(homeVisibleCaseCountKey, String(normalizeVisibleCaseCount(count)));
}

type HomeProps = {
  dictionary?: Dictionary;
  locale?: Locale;
};

export default function Home({
  dictionary = getDictionary(defaultLocale),
  locale = defaultLocale,
}: HomeProps = {}) {
  const [initialIntroState] = useState(getInitialHomeIntroState);
  const contentMountedRef = useRef(initialIntroState.contentMounted);
  const contentReadyPromiseRef = useRef<Promise<void> | null>(null);
  const contentReadyResolverRef = useRef<(() => void) | null>(null);
  const [contentMounted, setContentMounted] = useState(initialIntroState.contentMounted);
  const [introFinished, setIntroFinished] = useState(initialIntroState.introFinished);
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
    setSiteIntroLock(false);
  }, []);

  useLayoutEffect(() => {
    if (shouldSkipHomeIntro()) {
      window.sessionStorage.removeItem(skipHomeIntroKey);
      contentMountedRef.current = true;
      setSiteIntroLock(false);

      // This must happen in layout effect so case-return hydration stays stable
      // while the restored home page is ready before the first visible frame.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setContentMounted(true);
      setIntroFinished(true);
      return;
    }

    setSiteIntroLock(true);

    return () => {
      setSiteIntroLock(false);
    };
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
            ? document.fonts.load(`64px "${getBrandFontFamily()}"`).catch(() => undefined)
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
      {introFinished ? (
        <MobileMenu
          dictionary={dictionary}
          isOpen={mobileMenuOpen}
          onNavigate={() => setMobileMenuOpen(false)}
          onToggle={() => setMobileMenuOpen((isOpen) => !isOpen)}
        />
      ) : null}
      {contentMounted ? (
        <MainPageContent
          key={locale}
          dictionary={dictionary}
          introActive={!introFinished}
          locale={locale}
        />
      ) : null}
      {!introFinished ? (
        <IntroOverlay onPrepareContent={prepareContent} onComplete={finishIntro} />
      ) : null}
    </main>
  );
}

function MainPageContent({
  dictionary,
  introActive,
  locale,
}: {
  dictionary: Dictionary;
  introActive: boolean;
  locale: Locale;
}) {
  const caseGridRef = useRef<HTMLDivElement>(null);
  const caseHoverFrameRef = useRef<number | null>(null);
  const activeCaseHoverMediaRef = useRef<HTMLElement | null>(null);
  const pendingCaseHoverRef = useRef<({ media: HTMLElement } & CaseHoverValues) | null>(null);
  const contactFileInputRef = useRef<HTMLInputElement>(null);
  const [initialVisibleCaseCount] = useState(readSavedVisibleCaseCount);
  const previousVisibleCaseCountRef = useRef(initialVisibleCaseCount);
  const teamCarouselRef = useRef<HTMLDivElement>(null);
  const [activeTeamSlide, setActiveTeamSlide] = useState(0);
  const [attachedContactFiles, setAttachedContactFiles] = useState<File[]>([]);
  const [contactBudget, setContactBudget] = useState<string[]>([]);
  const [contactFields, setContactFields] = useState<ContactFormFields>({
    company: "",
    email: "",
    name: "",
    phone: "",
    task: "",
  });
  const [contactFormMessage, setContactFormMessage] = useState("");
  const [contactFormStatus, setContactFormStatus] = useState<ContactFormStatus>("idle");
  const [contactServices, setContactServices] = useState<string[]>([]);
  const [visibleCaseCount, setVisibleCaseCount] = useState(initialVisibleCaseCount);
  const { openCase, prefetchCase } = useCaseTransition();
  const localizedCaseStudies = getLocalizedPublishedCaseStudies(dictionary);
  const visibleCaseLimit = homeCaseShowMoreEnabled ? visibleCaseCount : homeCasePreviewCount;
  const visibleCases = localizedCaseStudies.slice(0, visibleCaseLimit);
  const hasMoreCases = homeCaseShowMoreEnabled && visibleCaseCount < localizedCaseStudies.length;
  const home = dictionary.home;
  const brief = home.brief;
  const primaryRoleLabelLines = home.team.primaryRoleLabelLines;
  const secondaryRoleLabelLines = home.team.secondaryRoleLabelLines;

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
      const nextCount = Math.min(currentCount + homeCaseRevealStep, publishedCaseStudies.length);

      saveVisibleCaseCount(nextCount);

      return nextCount;
    });
  }, []);

  const handleOpenCase = useCallback((
    event: MouseEvent<HTMLAnchorElement>,
    caseStudy: CaseStudy,
  ) => {
    const requiredVisibleCount = getVisibleHomeCaseCountForSlug(caseStudy.slug);

    if (homeCaseShowMoreEnabled) {
      saveVisibleCaseCount(Math.max(visibleCaseCount, requiredVisibleCount));
    }

    openCase(event, caseStudy);
  }, [openCase, visibleCaseCount]);

  const flushCaseHoverFrame = useCallback(() => {
    const pending = pendingCaseHoverRef.current;

    caseHoverFrameRef.current = null;

    if (!pending) {
      return;
    }

    pending.media.style.transform = [
      "perspective(1200px)",
      `translate3d(${pending.translateX.toFixed(2)}px, ${pending.translateY.toFixed(2)}px, 0)`,
      `rotateX(${pending.rotateX.toFixed(2)}deg)`,
      `rotateY(${pending.rotateY.toFixed(2)}deg)`,
    ].join(" ");
    pending.media.style.setProperty("--case-hover-image-x", `${pending.imageX.toFixed(2)}px`);
    pending.media.style.setProperty("--case-hover-image-y", `${pending.imageY.toFixed(2)}px`);
  }, []);

  const queueCaseHoverFrame = useCallback((media: HTMLElement, values: CaseHoverValues) => {
    pendingCaseHoverRef.current = {
      media,
      ...values,
    };

    if (caseHoverFrameRef.current !== null) {
      return;
    }

    caseHoverFrameRef.current = window.requestAnimationFrame(flushCaseHoverFrame);
  }, [flushCaseHoverFrame]);

  const resetCaseHover = useCallback((media: HTMLElement) => {
    if (pendingCaseHoverRef.current?.media === media) {
      pendingCaseHoverRef.current = null;
    }

    if (activeCaseHoverMediaRef.current === media) {
      activeCaseHoverMediaRef.current = null;
    }

    media.dataset.caseHoverActive = "false";
    media.style.transform = baseCaseHoverTransform;
    media.style.setProperty("--case-hover-image-x", "0px");
    media.style.setProperty("--case-hover-image-y", "0px");
  }, []);

  const handleCaseMediaPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const media = event.currentTarget;

    if (!canUseCaseHover(event)) {
      resetCaseHover(media);
      return;
    }

    const rect = media.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    const horizontal = clampHoverAxis(((event.clientX - rect.left) / rect.width) * 2 - 1);
    const vertical = clampHoverAxis(((event.clientY - rect.top) / rect.height) * 2 - 1);

    activeCaseHoverMediaRef.current = media;
    media.dataset.caseHoverActive = "true";
    queueCaseHoverFrame(media, {
      imageX: horizontal * -12,
      imageY: vertical * -9,
      rotateX: vertical * -5,
      rotateY: horizontal * 5,
      translateX: horizontal * 4,
      translateY: -11 + vertical * 2.5,
    });
  }, [queueCaseHoverFrame, resetCaseHover]);

  const handleCaseMediaPointerLeave = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    resetCaseHover(event.currentTarget);
  }, [resetCaseHover]);

  const clearContactFeedback = useCallback(() => {
    setContactFormStatus((current) => (current === "loading" ? current : "idle"));
    setContactFormMessage("");
  }, []);

  const handleContactFieldChange = useCallback((
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.currentTarget;

    clearContactFeedback();
    setContactFields((current) => ({
      ...current,
      [name]: value,
    }));
  }, [clearContactFeedback]);

  const addContactFiles = useCallback((fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList);

    if (!incomingFiles.length) {
      return;
    }

    const invalidFile = incomingFiles.find((file) => (
      file.size > contactFileMaxSize ||
      !contactAllowedFileExtensions.has(getFileExtension(file.name))
    ));

    if (invalidFile) {
      setContactFormStatus("error");
      setContactFormMessage(brief.fileTooLarge.replace("{fileName}", invalidFile.name));
      return;
    }

    const currentSize = attachedContactFiles.reduce((sum, file) => sum + file.size, 0);
    const incomingSize = incomingFiles.reduce((sum, file) => sum + file.size, 0);

    if (currentSize + incomingSize > contactFileMaxSize) {
      setContactFormStatus("error");
      setContactFormMessage(brief.totalFilesTooLarge);
      return;
    }

    clearContactFeedback();
    setAttachedContactFiles((current) => {
      const existingKeys = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const nextFiles = [...current];

      incomingFiles.forEach((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;

        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          nextFiles.push(file);
        }
      });

      return nextFiles;
    });
  }, [attachedContactFiles, brief.fileTooLarge, brief.totalFilesTooLarge, clearContactFeedback]);

  const handleContactFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      addContactFiles(event.currentTarget.files);
    }

    event.currentTarget.value = "";
  }, [addContactFiles]);

  const handleContactFileDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.dataTransfer.files.length) {
      addContactFiles(event.dataTransfer.files);
    }
  }, [addContactFiles]);

  const handleContactFileDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeContactFile = useCallback((indexToRemove: number) => {
    clearContactFeedback();
    setAttachedContactFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }, [clearContactFeedback]);

  const resetContactForm = useCallback(() => {
    setAttachedContactFiles([]);
    setContactBudget([]);
    setContactFields({
      company: "",
      email: "",
      name: "",
      phone: "",
      task: "",
    });
    setContactServices([]);

    if (contactFileInputRef.current) {
      contactFileInputRef.current.value = "";
    }
  }, []);

  const handleContactSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (contactFormStatus === "loading") {
      return;
    }

    setContactFormStatus("loading");
    setContactFormMessage("");

    const formData = new FormData();

    contactServices.forEach((service) => {
      formData.append("services", service);
    });
    contactBudget.forEach((budget) => {
      formData.append("budget", budget);
    });
    formData.append("task", contactFields.task);
    formData.append("name", contactFields.name);
    formData.append("company", contactFields.company);
    formData.append("email", contactFields.email);
    formData.append("phone", contactFields.phone);
    attachedContactFiles.forEach((file) => {
      formData.append("files", file, file.name);
    });

    try {
      const response = await fetch("/api/contact", {
        body: formData,
        method: "POST",
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Could not send the request. Please try again.");
      }

      resetContactForm();
      setContactFormStatus("success");
      setContactFormMessage(brief.success);
    } catch (error) {
      setContactFormStatus("error");
      setContactFormMessage(error instanceof Error ? error.message : brief.error);
    }
  }, [
    attachedContactFiles,
    brief.error,
    brief.success,
    contactBudget,
    contactFields,
    contactFormStatus,
    contactServices,
    resetContactForm,
  ]);

  useLayoutEffect(() => {
    updateActiveTeamSlide();
    window.addEventListener("resize", updateActiveTeamSlide);

    return () => {
      window.removeEventListener("resize", updateActiveTeamSlide);
    };
  }, [updateActiveTeamSlide]);

  useLayoutEffect(() => {
    return () => {
      if (caseHoverFrameRef.current !== null) {
        window.cancelAnimationFrame(caseHoverFrameRef.current);
      }

      if (activeCaseHoverMediaRef.current) {
        resetCaseHover(activeCaseHoverMediaRef.current);
      }
    };
  }, [resetCaseHover]);

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
    <div
      data-motion-locale={locale}
      data-motion-main-state={introActive ? "intro" : "ready"}
      className="contents"
    >
      {!introActive ? <DesktopMenu dictionary={dictionary} /> : null}
      <section id="top" data-motion-hero className="relative h-[calc(220vh-2.75rem)] w-full overflow-visible bg-[#f4f4ef] text-[#1E1E1E] sm:h-[calc(220vh-2.5rem)]">
        <div data-motion-hero-stage className="hero-panel sticky top-3 z-20 h-[calc(100vh-2.75rem)] w-full overflow-hidden rounded-[24px] sm:top-5 sm:h-[calc(100vh-2.5rem)]">
          <div data-motion-yellow-layer className="absolute inset-0 z-10 overflow-hidden rounded-[inherit] bg-[#FFFB12]">
            <HeroFlowers />

            <div className="relative z-10 flex h-full flex-col px-8 pt-7 pb-9">
              <p data-motion-hero-brand className="hero-brand font-serif text-[64px] leading-[90%] tracking-[-0.02em]">
                {home.hero.brand}
              </p>

              <div
                data-motion-hero-copy
                className="mt-auto pb-[clamp(0rem,1.5vh,1.5rem)]"
              >
                <h1 data-motion-hero-title className="hero-title font-serif text-[clamp(72px,15vh,136px)] leading-[90%] tracking-[-0.02em]">
                  {home.hero.titleLines.map((line, index) => (
                    <span data-motion-hero-line className={`block ${index === 0 ? "italic" : ""}`} key={line}>
                      {line}
                    </span>
                  ))}
                </h1>
                <p
                  className="hero-caption mt-[clamp(1.25rem,1.5vw,2rem)] uppercase leading-[120%] tracking-[-0.02em] text-[#0D0D0D]"
                  style={{ fontFamily: 'var(--font-inter-black)', fontSize: "clamp(16px, 2.7vh, 24px)" }}
                >
                  {home.hero.captionLines.map((line) => (
                    <span className="hero-caption-line whitespace-nowrap" key={line}>
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="approach" data-motion-section data-motion-stack className="relative -mt-[calc(120vh-2.75rem)] bg-[#f4f4ef] px-2 pt-[clamp(8rem,12vh,9rem)] pb-0 text-[#1E1E1E] sm:-mt-[calc(120vh-2.5rem)]">
        <div className="mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8">
          <p className="col-span-12 self-start pt-[0.22em] font-sans text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold uppercase leading-none tracking-[-0.035em] lg:col-span-3">
            {home.approach.label}
          </p>

          <h2 className="who-help-mobile-title col-span-12 mt-10 font-serif text-[64px] leading-[70px] tracking-[-0.025em] text-[#141714] md:hidden">
            {home.approach.mobileTitleLines.map((line) => (
              <span className="block" key={line}>{line}</span>
            ))}
          </h2>

          {locale === "ru" ? (
            <h2 className="hidden col-span-12 mt-10 max-w-none font-serif text-[clamp(3rem,4.1vw,4.1rem)] font-normal leading-[0.93] tracking-[-0.025em] text-[#141714] md:block lg:col-start-3 lg:col-end-13 lg:mt-0" data-approach-title>
              {home.approach.desktopTitleLines.map((line, index) => (
                <span className={`block whitespace-nowrap ${index === 0 ? "pl-[clamp(12rem,17vw,19.5rem)]" : ""}`} key={line}>
                  {line}
                </span>
              ))}
            </h2>
          ) : (
            <h2 className="hidden col-span-12 mt-10 max-w-[1420px] font-serif text-[64px] leading-[70px] tracking-[-0.025em] text-[#141714] md:block lg:col-start-3 lg:col-end-12 lg:mt-0">
              {home.approach.desktopTitleLines.map((line, index) => (
                <span className={`block whitespace-nowrap ${index === 0 ? "pl-[330px]" : ""}`} key={line}>
                  {line}
                </span>
              ))}
            </h2>
          )}

          <div className="col-span-12 mt-[60px] grid grid-cols-12 gap-x-8 gap-y-14">
            <p className="col-span-12 max-w-[35rem] font-sans text-[clamp(1.25rem,1.25vw,1.55rem)] leading-[1.25] tracking-[-0.035em] lg:col-start-3 lg:col-end-6">
              {home.approach.trustMobileLines.map((line) => (
                <span className="block md:hidden" key={line}>{line}</span>
              ))}
              {home.approach.trustDesktopLines.map((line) => (
                <span className="hidden whitespace-nowrap md:block" key={line}>{line}</span>
              ))}
            </p>

            <p className="col-span-12 w-full max-w-full font-sans text-[clamp(1.25rem,1.25vw,1.55rem)] leading-[1.25] tracking-[-0.035em] indent-[11rem] lg:col-start-7 lg:col-end-13">
              {home.approach.body}
            </p>
          </div>

          <div data-motion="media" className="who-help-media motion-media col-span-12 mt-[clamp(4rem,6vw,5rem)] h-[clamp(22rem,25vw,31rem)] bg-[#141714] lg:col-start-7 lg:col-end-13">
            <LockedAutoplayVideo
              className="who-help-video"
              poster="/videos/intro2-poster.jpg"
              src="/videos/intro2.mp4"
            />
          </div>
        </div>
      </section>

      <section id="work" data-motion-section data-motion-stack data-motion-preset="cases" className="bg-[#f4f4ef] px-2 pt-[150px] pb-[clamp(5rem,8vw,8rem)] text-[#1E1E1E]">
        <div className="mx-auto max-w-[1824px]">
            <header className="max-w-[1120px]">
              <h2 data-motion="reveal" className="w-fit font-serif text-[135px] leading-[1] tracking-[-0.030em] text-[#141714]">
                {home.work.title}
              </h2>
              <p data-motion="reveal" className="mt-6 max-w-[540px] font-sans text-[20px] font-bold leading-[24px] tracking-[0em] text-[#141714] md:hidden">
                {home.work.mobileDescriptionLines.map((line) => (
                  <span className="block" key={line}>{line}</span>
                ))}
              </p>
              <p data-motion="reveal" className="mt-6 hidden max-w-[540px] font-sans text-[20px] font-bold leading-[24px] tracking-[0em] text-[#141714] md:block">
                {home.work.desktopDescriptionLines.map((line) => (
                  <span className="block whitespace-nowrap" key={line}>{line}</span>
                ))}
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
                    href={getCasePath(caseStudy.slug, locale)}
                    onClick={(event) => handleOpenCase(event, caseStudy)}
                    onPointerEnter={() => prefetchCase(caseStudy)}
                  >
                    <div
                      data-motion-case-media
                      className={layout.mediaClass}
                      onPointerCancel={handleCaseMediaPointerLeave}
                      onPointerEnter={handleCaseMediaPointerMove}
                      onPointerLeave={handleCaseMediaPointerLeave}
                      onPointerMove={handleCaseMediaPointerMove}
                    >
                      <img
                        className="case-media-image"
                        src={caseStudy.image}
                        alt={caseStudy.imageAlt}
                        style={caseStudy.homeImagePosition ? { objectPosition: caseStudy.homeImagePosition } : undefined}
                      />
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
                {home.work.showMore}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section id="services" data-motion-section data-motion-stack data-motion-preset="services" className="bg-[#f4f4ef] px-2 pt-[clamp(4rem,7vw,7rem)] pb-[clamp(5rem,8vw,8rem)] text-[#1E1E1E]">
        <div className="mx-auto max-w-[1824px]">
          <header>
            <h2 data-motion="reveal" className="inline-flex items-start gap-[18px] font-serif text-[135px] leading-[0.82] tracking-[-0.02em] text-[#141714]">
              {home.services.title}{" "}
              <span className="translate-y-[4px] font-serif text-[64px] font-normal leading-[0.82] tracking-[-0.02em] text-[#141714]">
                {home.services.count}
              </span>
            </h2>
            <p data-motion="reveal" className="mt-6 max-w-[48rem] font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714]">
              {(home.services.mobileDescriptionLines ?? home.services.descriptionLines).map((line) => (
                <span className="block md:hidden" key={`mobile-${line}`}>{line}</span>
              ))}
              {home.services.descriptionLines.map((line) => (
                <span className="hidden md:block" key={`desktop-${line}`}>{line}</span>
              ))}
            </p>
          </header>

          <div className="mt-[clamp(9rem,13vw,13rem)] space-y-[clamp(6rem,8vw,9rem)]">
            {home.services.items.map((service) => (
              <ServiceItem key={service.index} productLabel={home.services.productLabel} service={service} />
            ))}
          </div>
        </div>
      </section>

      <section id="process" data-motion-section data-motion-stack data-motion-preset="process" className="bg-[#f4f4ef] px-2 pt-[clamp(5rem,8vw,8rem)] pb-0 text-[#1E1E1E]">
        <div className="mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8">
          <p data-motion="reveal" className="col-span-12 font-sans text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold uppercase leading-none tracking-[-0.035em] lg:col-span-3">
            {home.process.label}
          </p>

          <h2 data-motion="reveal" className="col-span-12 mt-8 max-w-[52rem] font-serif text-[clamp(2.75rem,2.55vw,3.4rem)] leading-[1.04] tracking-[-0.045em] lg:col-start-5 lg:col-end-10 lg:mt-0">
            {(home.process.mobileHeadlineLines ?? home.process.headlineLines).map((line) => (
              <span className="block md:hidden" key={`mobile-${line}`}>
                {line}
              </span>
            ))}
            {home.process.headlineLines.map((line) => (
              <span className="hidden whitespace-nowrap md:block" key={`desktop-${line}`}>
                {line}
              </span>
            ))}
          </h2>

          <div className="col-span-12 mt-[260px] space-y-[clamp(5rem,7vw,8rem)]">
            {home.process.steps.map((step, index) => (
              <ProcessStep
                key={step.number}
                detailsLabel={home.process.detailsLabel}
                step={step}
                alignRight={index % 2 === 1}
                compactTop={index === 2}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="team" data-motion-section data-motion-stack data-motion-preset="team" className="bg-[#f4f4ef] px-2 pt-[220px] pb-[clamp(6rem,9vw,9rem)] text-[#1E1E1E]">
        <div className="relative mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8">
          <p data-motion="reveal" className="col-span-12 font-sans text-[clamp(1rem,1.2vw,1.5rem)] font-extrabold uppercase leading-[1.05] tracking-[-0.035em] lg:absolute lg:left-0 lg:top-0 lg:w-[22rem]">
            {home.team.eyebrowLines.map((line) => (
              <span className="block" key={line}>{line}</span>
            ))}
          </p>

          <h2 data-motion="reveal" className="team-mobile-title col-span-12 mt-8 font-serif text-[64px] leading-[70px] tracking-[-0.02em] text-[#141714] md:hidden">
            {home.team.introMobileLines.map((line) => <span className="block" key={line}>{line}</span>)}
          </h2>

          {locale === "ru" ? (
            <h2 data-motion="reveal" data-team-intro-title className="hidden col-span-12 mt-8 max-w-[70rem] pb-[0.12em] font-serif text-[clamp(3.35rem,3.55vw,4rem)] leading-[0.94] tracking-[-0.02em] text-[#141714] md:block lg:col-start-1 lg:col-end-11 lg:mt-0 lg:pl-[clamp(9rem,18vw,17rem)]">
              {home.team.introDesktopLines.map((line, index) => (
                <span className={`block whitespace-nowrap ${index === 0 ? "lg:pl-[clamp(5rem,8vw,9rem)]" : ""}`} key={line}>{line}</span>
              ))}
            </h2>
          ) : (
            <h2 data-motion="reveal" className="hidden col-span-12 mt-8 overflow-hidden font-serif text-[64px] leading-[70px] tracking-[-0.02em] text-[#141714] md:block lg:mt-0 lg:translate-x-[250px]">
              {home.team.introDesktopLines.map((line, index) => (
                <span className={`block ${index === 0 ? "lg:pl-[360px]" : "lg:pl-[60px]"}`} key={line}>{line}</span>
              ))}
            </h2>
          )}

          <div data-team-primary-roles className="col-span-12 mt-[70px] grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-8 lg:col-start-3 lg:col-end-11">
            <div className="col-span-12 grid grid-cols-1 gap-y-4 lg:grid-cols-12 lg:gap-x-8">
              <p data-team-role-label className="col-span-12 font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714] lg:col-span-3">
                {primaryRoleLabelLines.map((line) => (
                  <span className="block" key={line}>{line}</span>
                ))}
              </p>
              <ul data-team-role-list className="col-span-12 font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714] lg:col-span-9 lg:-translate-x-[120px]">
                {home.team.projectRoles[0].items.map((item) => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="col-span-12 mt-8 grid grid-cols-1 gap-x-8 lg:grid-cols-5">
            <div data-team-secondary-roles className="grid max-w-full grid-cols-1 gap-y-4 lg:grid-cols-[160px_minmax(0,1fr)] lg:gap-x-8 lg:col-start-3 lg:col-end-6">
                <p data-team-role-label className="font-sans text-[20px] font-normal leading-[24px] tracking-[0em] text-[#141714]">
                  {secondaryRoleLabelLines.map((line) => (
                    <span className="block" key={line}>{line}</span>
                  ))}
                </p>
                <ul data-team-role-list className="font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714]">
                  {home.team.projectRoles[1].items.map((item) => (
                    <li key={item}>
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
            {home.team.members.map((member) => (
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
            {home.team.members.map((member, index) => (
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
            {brief.title}
          </h2>
          <p data-motion="reveal" className="mt-[28px] max-w-[760px] font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714]">
            {(brief.mobileIntroTextLines ?? brief.introTextLines).map((line) => (
              <span className="block md:hidden" key={`mobile-${line}`}>{line}</span>
            ))}
            {brief.introTextLines.map((line) => (
              <span className="hidden md:block" key={`desktop-${line}`}>{line}</span>
            ))}
          </p>

          <form
            className="mt-[120px] max-w-[1540px] space-y-[84px]"
            encType="multipart/form-data"
            onSubmit={handleContactSubmit}
          >
            <FormChoiceRow
              title={brief.servicesTitle}
              name="services"
              onSelectedChange={(selected) => {
                clearContactFeedback();
                setContactServices(selected);
              }}
              options={brief.serviceOptions}
              selectedOptions={contactServices}
              serif
            />

            <FormChoiceRow
              title={brief.budgetTitle}
              multiple={false}
              name="budget"
              onSelectedChange={(selected) => {
                clearContactFeedback();
                setContactBudget(selected);
              }}
              options={brief.budgetOptions}
              selectedOptions={contactBudget}
              serif
            />

            <div
              data-motion-form-item
              onDragOver={handleContactFileDragOver}
              onDrop={handleContactFileDrop}
            >
              <p className="font-serif text-[64px] italic leading-[0.88] tracking-[-0.03em] text-[#141714]">
                {brief.taskTitle}
              </p>
              <textarea
                aria-label={brief.taskTitle}
                className="motion-field mt-[38px] block min-h-[35px] w-full max-w-[1490px] resize-none border-0 border-b border-[#BFBFB8] bg-transparent px-0 pb-[10px] font-serif text-[20px] leading-[24px] tracking-[0em] text-[#141714] outline-none placeholder:text-[#A9A9A2]"
                name="task"
                onChange={handleContactFieldChange}
                placeholder={brief.taskPlaceholder}
                rows={1}
                value={contactFields.task}
              />
              <input
                ref={contactFileInputRef}
                accept={contactFileAccept}
                className="hidden"
                multiple
                name="files"
                onChange={handleContactFileChange}
                type="file"
              />
              <button
                type="button"
                className="motion-link mt-[22px] font-serif text-[24px] leading-none tracking-[-0.02em] text-[#141714]"
                onClick={() => contactFileInputRef.current?.click()}
              >
                {brief.attachFile}
              </button>
              {attachedContactFiles.length ? (
                <ul className="mt-4 grid max-w-[1490px] gap-2 font-sans text-[14px] leading-[18px] text-[#141714]">
                  {attachedContactFiles.map((file, index) => (
                    <li className="flex items-center justify-between gap-4 border-b border-[#D4D4CD] pb-2" key={`${file.name}-${file.size}-${file.lastModified}`}>
                      <span className="min-w-0 truncate">{file.name}</span>
                      <button
                        aria-label={brief.removeFileAria.replace("{fileName}", file.name)}
                        className="font-bold uppercase text-[#9A9A9A]"
                        onClick={() => removeContactFile(index)}
                        type="button"
                      >
                        {brief.removeFile}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div data-motion-form-item className="pt-[10px]">
              <p className="font-serif text-[64px] italic leading-[0.88] tracking-[-0.03em] text-[#141714]">
                {brief.contactsTitle}
              </p>

              <div className="mt-[48px] grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-2 lg:max-w-[1480px]">
                <FormLineField label={brief.fields.name} name="name" onChange={handleContactFieldChange} type="text" value={contactFields.name} />
                <FormLineField label={brief.fields.company} name="company" onChange={handleContactFieldChange} type="text" value={contactFields.company} />
                <FormLineField label={brief.fields.email} name="email" onChange={handleContactFieldChange} type="email" value={contactFields.email} />
                <FormLineField label={brief.fields.phone} name="phone" onChange={handleContactFieldChange} type="tel" value={contactFields.phone} />
              </div>

              <div className="mt-[58px] grid grid-cols-1 gap-x-8 gap-y-8 lg:max-w-[1480px] lg:grid-cols-2 lg:items-end">
                <div className="max-w-[620px] font-sans text-[16px] font-normal leading-[20px] tracking-[0em] text-[#1E1E1E]">
                  <p>
                    {(brief.mobileConsentLines ?? brief.consentLines).map((line) => (
                      <span className="block md:hidden" key={`mobile-${line}`}>{line}</span>
                    ))}
                    {brief.consentLines.map((line) => (
                      <span className="hidden md:block" key={`desktop-${line}`}>{line}</span>
                    ))}
                  </p>
                  {contactFormMessage ? (
                    <p
                      aria-live="polite"
                      className={`mt-4 font-bold ${contactFormStatus === "error" ? "text-[#A13A2F]" : "text-[#141714]"}`}
                      role="status"
                    >
                      {contactFormMessage}
                    </p>
                  ) : null}
                </div>
                <button
                  disabled={contactFormStatus === "loading"}
                  type="submit"
                  className="motion-button h-[58px] w-[360px] border border-[#BFBFB8] font-sans text-[18px] font-bold uppercase leading-none tracking-[0em] text-[#141714] lg:justify-self-start"
                >
                  {contactFormStatus === "loading" ? brief.sending : brief.send}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section id="contact" data-motion-section data-motion-preset="contact" className="bg-[#f4f4ef] px-0 pt-[150px] pb-[60px] text-[#1E1E1E]">
        <div className="mx-auto grid max-w-[1824px] grid-cols-12 gap-x-8 rounded-[24px] bg-[#FFFB12] px-4 pt-[110px] pb-[70px] sm:px-6 lg:px-3">
          <p className="col-span-12 font-sans text-[20px] font-bold uppercase leading-[24px] tracking-[0em] text-[#141714] lg:col-span-2 lg:pt-[12px]">
            {home.contact.labelLines.map((line) => (
              <span className="block" key={line}>{line}</span>
            ))}
          </p>

          <div className="col-span-12 mt-10 lg:col-start-3 lg:col-end-13 lg:mt-0">
            <p data-contact-copy className="font-serif text-[64px] leading-[70px] tracking-[-0.02em] text-[#141714]">
              {home.contact.textLines.map((line, index) => (
                <span className={`block ${locale !== "ru" ? "lg:whitespace-nowrap" : ""} ${index === 0 && locale !== "ru" ? "lg:pl-[300px]" : ""}`} key={line}>
                  {line}
                  {index < home.contact.textLines.length - 1 ? " " : ""}
                </span>
              ))}
            </p>
          </div>

          <div className="col-span-12 mt-[120px] text-center lg:col-start-1 lg:col-end-13">
            <a
              data-contact-email
              href={`mailto:${home.contact.email}`}
              className="motion-email whitespace-nowrap font-serif text-[clamp(4rem,16.5vw,19.5rem)] leading-[90%] tracking-[-0.03em] text-[#141714]"
            >
              {home.contact.email}
            </a>
          </div>
        </div>
      </section>

      {!introActive ? <MotionOrchestrator key={locale} /> : null}
    </div>
  );
}

function DesktopMenu({ dictionary }: { dictionary: Dictionary }) {
  return (
    <nav data-desktop-menu aria-label="Primary navigation">
      <div data-desktop-menu-surface>
        <a data-desktop-menu-brand href="#top" aria-label={dictionary.nav.brandAria}>
          13:31
        </a>
        <div data-desktop-menu-links>
          {dictionary.nav.desktopItems.map((item, index) => (
            <a data-desktop-menu-link href={item.href} key={item.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </div>
        <LanguageSwitcher />
        <a data-desktop-menu-cta href="#brief">
          {dictionary.nav.startProject}
        </a>
      </div>
    </nav>
  );
}

function MobileMenu({
  dictionary,
  isOpen,
  onNavigate,
  onToggle,
}: {
  dictionary: Dictionary;
  isOpen: boolean;
  onNavigate: () => void;
  onToggle: () => void;
}) {
  return (
    <nav data-mobile-menu data-open={isOpen} aria-label="Mobile navigation">
      <button
        type="button"
        data-mobile-menu-toggle
        aria-controls="mobile-menu-panel"
        aria-label={isOpen ? dictionary.nav.closeMenu : dictionary.nav.openMenu}
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
          <LanguageSwitcher className="mobile-language-switcher" onNavigate={onNavigate} />
        </div>
        <div data-mobile-menu-links>
          {dictionary.nav.mobileItems.map((item, index) => (
            <a data-mobile-menu-link href={item.href} onClick={onNavigate} key={item.href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </a>
          ))}
        </div>
        <a data-mobile-menu-cta href="#brief" onClick={onNavigate}>
          {dictionary.nav.startProject}
        </a>
        <div data-mobile-menu-footer>
          <a href={`mailto:${dictionary.home.contact.email}`}>{dictionary.home.contact.email}</a>
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
        await document.fonts.load(`80px "${getBrandFontFamily()}"`).catch(() => undefined);
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

const LockedAutoplayVideo = memo(function LockedAutoplayVideo({
  className,
  poster,
  src,
}: {
  className?: string;
  poster: string;
  src: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [shouldLoadSource, setShouldLoadSource] = useState(false);

  const playVideo = useCallback(() => {
    const video = videoRef.current;

    if (!video || document.hidden) {
      return;
    }

    const playPromise = video.play();

    if (playPromise) {
      playPromise.catch(() => undefined);
    }
  }, []);

  useLayoutEffect(() => {
    const video = videoRef.current;
    const root = document.documentElement;
    let cancelled = false;
    let transitionObserver: MutationObserver | null = null;

    const enableSource = () => {
      if (!cancelled) {
        setShouldLoadSource(true);
      }
    };

    const isTransitionIdle = () => !root.dataset.brandTransition;
    const loadWhenTransitionIdle = () => {
      if (isTransitionIdle()) {
        enableSource();
        return;
      }

      transitionObserver?.disconnect();
      transitionObserver = new MutationObserver(() => {
        if (!isTransitionIdle()) {
          return;
        }

        transitionObserver?.disconnect();
        transitionObserver = null;
        enableSource();
      });

      transitionObserver.observe(root, {
        attributeFilter: ["data-brand-transition"],
        attributes: true,
      });
    };

    if (!video || !("IntersectionObserver" in window)) {
      setIsInView(true);
      loadWhenTransitionIdle();
      return () => {
        cancelled = true;
        transitionObserver?.disconnect();
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting;

        setIsInView(active);

        if (active) {
          loadWhenTransitionIdle();
        }
      },
      {
        root: null,
        rootMargin: "320px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(video);

    return () => {
      cancelled = true;
      observer.disconnect();
      transitionObserver?.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    if (!shouldLoadSource || !isInView) {
      video.pause();
      return;
    }

    playVideo();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
        return;
      }

      if (isInView) {
        playVideo();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isInView, playVideo, shouldLoadSource]);

  return (
    <video
      ref={videoRef}
      aria-hidden="true"
      className={className}
      controls={false}
      disablePictureInPicture
      loop
      muted
      playsInline
      poster={poster}
      preload="metadata"
      src={shouldLoadSource ? src : undefined}
      tabIndex={-1}
    />
  );
});

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

type Service = Dictionary["home"]["services"]["items"][number];

type ProcessStepData = Dictionary["home"]["process"]["steps"][number];

function ServiceItem({ productLabel, service }: { productLabel: string; service: Service }) {
  const hasPlainBullets = "plainBullets" in service && service.plainBullets;

  return (
    <article data-motion-service-row>
      <div className="grid grid-cols-12 items-end gap-x-8">
        <h3
          data-motion-service-title
          className={`col-span-12 -mb-[-12px] whitespace-pre-line font-serif text-[96px] leading-[60px] tracking-[-0.03em] italic text-[#141714] ${
            hasPlainBullets ? "lg:col-span-8" : "lg:col-span-6"
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
          {productLabel}
        </p>
        <p className="col-span-1 font-bold lg:col-start-4">{service.code}</p>
        <p className="service-description col-span-3 w-[22rem] max-w-full font-bold uppercase lg:col-start-5 lg:col-end-8">
          {service.description.map((line) => (
            <span className="service-description-line" key={line}>
              {line}
            </span>
          ))}
        </p>
        {hasPlainBullets ? (
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
  detailsLabel,
  step,
  alignRight,
  compactTop,
}: {
  detailsLabel: string;
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
            {detailsLabel}
          </p>
          <ul data-process-details-list className="font-sans text-[clamp(1.2rem,1.15vw,1.45rem)] leading-[1.25] tracking-[-0.03em]">
            {step.details.map((item) => (
              <li key={item}>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function FormLineField({
  label,
  name,
  onChange,
  type,
  value,
}: {
  label: string;
  name: keyof ContactFormFields;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type: "email" | "tel" | "text";
  value: string;
}) {
  return (
    <label className="block">
      <span className="block font-serif text-[clamp(1.35rem,1.2vw,1.7rem)] leading-none tracking-[-0.04em] text-[#9A9A9A]">
        {label}
      </span>
      <input
        type={type}
        name={name}
        onChange={onChange}
        value={value}
        className="motion-field mt-3 block h-[26px] w-full border-0 border-b border-[#BFBFB8] bg-transparent px-0 font-sans text-[20px] leading-[24px] tracking-[0em] text-[#141714] outline-none"
      />
    </label>
  );
}
