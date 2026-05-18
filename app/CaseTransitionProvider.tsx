"use client";

import {
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { flushSync } from "react-dom";
import gsap from "gsap";
import { getVisibleHomeCaseCountForSlug, homeVisibleCaseCountKey, type CaseStudy } from "./caseData";

type TransitionIntent = "case" | "home" | "home-anchor";

type PendingNavigation = {
  href: string;
  intent: TransitionIntent;
  pathname: string;
  slug?: string;
  targetId?: string;
};

type BrandTransitionState = {
  href: string;
  intent: TransitionIntent;
};

type CaseTransitionContextValue = {
  closeCase: (caseStudy: CaseStudy) => void;
  navigateHomeAnchor: (href: `/#${string}`) => void;
  openCase: (event: MouseEvent<HTMLAnchorElement>, caseStudy: CaseStudy) => void;
  prefetchCase: (caseStudy: CaseStudy) => void;
  switchCase: (event: MouseEvent<HTMLAnchorElement>, caseStudy: CaseStudy) => void;
};

type BodyLockState = {
  overflow: string;
};

const CaseTransitionContext = createContext<CaseTransitionContextValue | null>(null);
const homeScrollKey = "studio-1331:case-home-scroll";
const homeReturnSlugKey = "studio-1331:home-return-slug";
const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const skipIntroKey = "studio-1331:skip-home-intro";

function getCaseHref(caseStudy: CaseStudy) {
  return `/cases/${caseStudy.slug}`;
}

function canHandleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    !event.defaultPrevented &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function readSavedHomeScroll() {
  const scrollY = Number(sessionStorage.getItem(homeScrollKey) ?? "0");

  return Number.isFinite(scrollY) ? scrollY : 0;
}

function scrollWindowToInstant(top: number, left = 0) {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  window.scrollTo({
    left,
    top,
    behavior: "auto",
  });
  root.style.scrollBehavior = previousScrollBehavior;
}

function clampScrollY(scrollY: number) {
  const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  return Math.min(Math.max(0, scrollY), maxScrollY);
}

function getPreferredHomeScrollForTarget(target: HTMLElement, fallbackScrollY: number) {
  const rect = target.getBoundingClientRect();
  const topMargin = Math.min(180, Math.max(96, window.innerHeight * 0.16));
  const bottomMargin = Math.min(140, Math.max(72, window.innerHeight * 0.12));

  if (rect.top >= topMargin && rect.bottom <= window.innerHeight - bottomMargin) {
    return fallbackScrollY;
  }

  return clampScrollY(rect.top + window.scrollY - topMargin);
}

function markHomeVisibleCasesForRestore(slug: string) {
  const savedCount = Number(sessionStorage.getItem(homeVisibleCaseCountKey) ?? "0");
  const requiredCount = getVisibleHomeCaseCountForSlug(slug);
  const visibleCount = Math.max(Number.isFinite(savedCount) ? savedCount : 0, requiredCount);

  sessionStorage.setItem(homeVisibleCaseCountKey, String(visibleCount));
}

function findHomeCard(slug: string) {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-case-card-slug]")).find(
    (card) => card.dataset.caseCardSlug === slug,
  ) ?? null;
}

function waitForAnimationFrame(frameIds: number[]) {
  return new Promise<void>((resolve) => {
    const frameId = window.requestAnimationFrame(() => {
      resolve();
    });

    frameIds.push(frameId);
  });
}

async function waitForHomeTarget(targetId: string, frameIds: number[]) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const target = document.getElementById(targetId);

    if (target) {
      return target;
    }

    await waitForAnimationFrame(frameIds);
  }

  return null;
}

async function waitForPaintFrames(count: number, frameIds: number[]) {
  for (let index = 0; index < count; index += 1) {
    await waitForAnimationFrame(frameIds);
  }
}

async function waitForHomeCard(slug: string, frameIds: number[]) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const card = findHomeCard(slug);

    if (card) {
      return card;
    }

    await waitForAnimationFrame(frameIds);
  }

  return null;
}

function waitForTimeline(timeline: gsap.core.Timeline) {
  return new Promise<void>((resolve) => {
    timeline.eventCallback("onComplete", resolve);
  });
}

function lockBodyScroll(): BodyLockState {
  const lockState = {
    overflow: document.body.style.overflow,
  };

  document.body.style.overflow = "hidden";

  return lockState;
}

function unlockBodyScroll(lockState: BodyLockState | null) {
  if (!lockState) {
    return;
  }

  document.body.style.overflow = lockState.overflow;
}

function setBrandTransitionState(active: boolean) {
  if (active) {
    document.documentElement.dataset.brandTransition = "true";
    return;
  }

  delete document.documentElement.dataset.brandTransition;
}

function isHomeIntent(intent: TransitionIntent) {
  return intent === "home" || intent === "home-anchor";
}

function scrollElementIntoViewInstant(target: HTMLElement) {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  target.scrollIntoView({
    behavior: "auto",
    block: "start",
  });
  root.style.scrollBehavior = previousScrollBehavior;
}

export function CaseTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLParagraphElement>(null);
  const pendingRef = useRef<PendingNavigation | null>(null);
  const lockStateRef = useRef<BodyLockState | null>(null);
  const coveringTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const revealTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const sequenceFrameIdsRef = useRef<number[]>([]);
  const [transition, setTransition] = useState<BrandTransitionState | null>(null);

  const releaseTransition = useCallback((clearHomeRestore = false) => {
    pendingRef.current = null;
    coveringTimelineRef.current?.kill();
    revealTimelineRef.current?.kill();
    coveringTimelineRef.current = null;
    revealTimelineRef.current = null;
    sequenceFrameIdsRef.current.forEach((frameId) => {
      window.cancelAnimationFrame(frameId);
    });
    sequenceFrameIdsRef.current = [];
    unlockBodyScroll(lockStateRef.current);
    lockStateRef.current = null;
    setBrandTransitionState(false);

    if (clearHomeRestore) {
      sessionStorage.removeItem(restoreHomeScrollKey);
      sessionStorage.removeItem(skipIntroKey);
      sessionStorage.removeItem(homeReturnSlugKey);
    }

    setTransition(null);
  }, []);

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
      releaseTransition();
    };
  }, [releaseTransition]);

  const coverCurrentPage = useCallback(async (navigation: PendingNavigation) => {
    for (let attempt = 0; attempt < 4 && (!overlayRef.current || !panelRef.current); attempt += 1) {
      await waitForPaintFrames(1, sequenceFrameIdsRef.current);
    }

    if (pendingRef.current !== navigation || !overlayRef.current || !panelRef.current) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bloomElements = overlayRef.current.querySelectorAll<HTMLElement>("[data-brand-transition-bloom]");

    gsap.set(overlayRef.current, {
      autoAlpha: 1,
    });
    gsap.set(panelRef.current, {
      clipPath: reduceMotion ? "inset(0% 0% 0% 0%)" : "circle(0% at 50% 50%)",
    });
    gsap.set(markRef.current, {
      autoAlpha: reduceMotion ? 1 : 0,
      y: reduceMotion ? 0 : 18,
    });
    gsap.set(bloomElements, {
      autoAlpha: reduceMotion ? 0.2 : 0,
      rotate: (index) => (index % 2 === 0 ? -10 : 12),
      scale: reduceMotion ? 1 : 0.78,
    });

    await waitForPaintFrames(1, sequenceFrameIdsRef.current);

    if (pendingRef.current !== navigation) {
      return;
    }

    if (reduceMotion) {
      await waitForPaintFrames(1, sequenceFrameIdsRef.current);

      if (pendingRef.current === navigation) {
        router.push(navigation.href, { scroll: false });
      }

      return;
    }

    const timeline = gsap.timeline({
      defaults: {
        ease: "power4.inOut",
      },
    });

    coveringTimelineRef.current = timeline;
    timeline
      .to(panelRef.current, {
        clipPath: "circle(150% at 50% 50%)",
        duration: 0.92,
      }, 0)
      .to(markRef.current, {
        autoAlpha: 1,
        y: 0,
        duration: 0.52,
        ease: "power3.out",
      }, 0.24)
      .to(bloomElements, {
        autoAlpha: 0.22,
        rotate: (index) => (index % 2 === 0 ? 5 : -6),
        scale: 1,
        duration: 0.82,
        stagger: 0.06,
        ease: "power3.out",
      }, 0.18);

    await waitForTimeline(timeline);

    if (pendingRef.current === navigation) {
      router.push(navigation.href, { scroll: false });
    }
  }, [router]);

  const startNavigation = useCallback((navigation: PendingNavigation) => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = navigation;
    lockStateRef.current = lockBodyScroll();
    setBrandTransitionState(true);
    flushSync(() => {
      setTransition({
        href: navigation.href,
        intent: navigation.intent,
      });
    });
    void coverCurrentPage(navigation);
  }, [coverCurrentPage]);

  const prefetchCase = useCallback((caseStudy: CaseStudy) => {
    router.prefetch(getCaseHref(caseStudy));
  }, [router]);

  const openCase = useCallback<CaseTransitionContextValue["openCase"]>((event, caseStudy) => {
    if (!canHandleLinkClick(event)) {
      return;
    }

    event.preventDefault();

    const href = getCaseHref(caseStudy);

    sessionStorage.setItem(homeScrollKey, String(window.scrollY));
    sessionStorage.setItem(skipIntroKey, "true");
    sessionStorage.setItem(restoreHomeScrollKey, "true");
    sessionStorage.setItem(homeReturnSlugKey, caseStudy.slug);
    router.prefetch(href);
    startNavigation({
      href,
      intent: "case",
      pathname: href,
      slug: caseStudy.slug,
    });
  }, [router, startNavigation]);

  const switchCase = useCallback<CaseTransitionContextValue["switchCase"]>((event, caseStudy) => {
    if (!canHandleLinkClick(event)) {
      return;
    }

    const href = getCaseHref(caseStudy);

    if (pathname === href) {
      return;
    }

    event.preventDefault();
    router.prefetch(href);
    startNavigation({
      href,
      intent: "case",
      pathname: href,
      slug: caseStudy.slug,
    });
  }, [pathname, router, startNavigation]);

  const navigateHomeAnchor = useCallback((href: `/#${string}`) => {
    if (pendingRef.current) {
      return;
    }

    const targetId = decodeURIComponent(href.slice(2));

    sessionStorage.setItem(homeScrollKey, "0");
    sessionStorage.removeItem(homeReturnSlugKey);
    sessionStorage.setItem(restoreHomeScrollKey, "true");
    sessionStorage.setItem(skipIntroKey, "true");
    router.prefetch("/");
    startNavigation({
      href,
      intent: "home-anchor",
      pathname: "/",
      targetId,
    });
  }, [router, startNavigation]);

  const closeCase = useCallback((caseStudy: CaseStudy) => {
    if (pendingRef.current) {
      return;
    }

    const scrollY = readSavedHomeScroll();

    sessionStorage.setItem(homeScrollKey, String(scrollY));
    sessionStorage.setItem(homeReturnSlugKey, caseStudy.slug);
    sessionStorage.setItem(restoreHomeScrollKey, "true");
    sessionStorage.setItem(skipIntroKey, "true");
    markHomeVisibleCasesForRestore(caseStudy.slug);
    router.prefetch("/");
    startNavigation({
      href: "/",
      intent: "home",
      pathname: "/",
      slug: caseStudy.slug,
    });
  }, [router, startNavigation]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;

    if (!transition || !pending || pathname !== pending.pathname || !overlayRef.current || !panelRef.current) {
      return;
    }

    let cancelled = false;
    const frameIds: number[] = [];
    const bloomElements = overlayRef.current.querySelectorAll<HTMLElement>("[data-brand-transition-bloom]");

    const prepareDestination = async () => {
      if (pending.intent === "case") {
        scrollWindowToInstant(0);
        await waitForPaintFrames(2, frameIds);
        return;
      }

      if (pending.intent === "home-anchor") {
        const target = pending.targetId ? await waitForHomeTarget(pending.targetId, frameIds) : null;

        if (target) {
          scrollElementIntoViewInstant(target);
          sessionStorage.setItem(homeScrollKey, String(window.scrollY));
        } else {
          scrollWindowToInstant(0);
          sessionStorage.setItem(homeScrollKey, "0");
        }

        await waitForPaintFrames(2, frameIds);
        return;
      }

      const fallbackScrollY = readSavedHomeScroll();
      const targetCard = pending.slug ? await waitForHomeCard(pending.slug, frameIds) : null;
      const targetScrollY = targetCard
        ? getPreferredHomeScrollForTarget(targetCard, fallbackScrollY)
        : fallbackScrollY;

      sessionStorage.setItem(homeScrollKey, String(targetScrollY));
      scrollWindowToInstant(targetScrollY);
      await waitForPaintFrames(2, frameIds);
    };

    const revealDestination = async () => {
      await prepareDestination();

      if (cancelled || !overlayRef.current || !panelRef.current) {
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        releaseTransition(isHomeIntent(pending.intent));
        return;
      }

      revealTimelineRef.current = gsap.timeline({
        defaults: {
          ease: "power4.inOut",
        },
        onComplete: () => {
          releaseTransition(isHomeIntent(pending.intent));
        },
      });

      revealTimelineRef.current
        .to(markRef.current, {
          autoAlpha: 0,
          y: -18,
          duration: 0.34,
          ease: "power2.in",
        }, 0)
        .to(bloomElements, {
          autoAlpha: 0,
          scale: 1.16,
          duration: 0.48,
          stagger: 0.03,
          ease: "power2.in",
        }, 0)
        .to(panelRef.current, {
          clipPath: "circle(0% at 50% 50%)",
          duration: 0.92,
        }, 0.14)
        .to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.12,
          ease: "none",
        }, 0.94);
    };

    void revealDestination();

    return () => {
      cancelled = true;
      frameIds.forEach((frameId) => {
        window.cancelAnimationFrame(frameId);
      });
      revealTimelineRef.current?.kill();
      revealTimelineRef.current = null;
    };
  }, [pathname, releaseTransition, transition]);

  useLayoutEffect(() => {
    if (pathname !== "/" || pendingRef.current) {
      return;
    }

    if (sessionStorage.getItem(restoreHomeScrollKey) !== "true") {
      return;
    }

    let cancelled = false;
    const frameIds: number[] = [];

    const restoreHomeWithoutOverlay = async () => {
      const slug = sessionStorage.getItem(homeReturnSlugKey);
      const fallbackScrollY = readSavedHomeScroll();
      const targetCard = slug ? await waitForHomeCard(slug, frameIds) : null;
      const targetScrollY = targetCard
        ? getPreferredHomeScrollForTarget(targetCard, fallbackScrollY)
        : fallbackScrollY;

      if (cancelled) {
        return;
      }

      sessionStorage.setItem(homeScrollKey, String(targetScrollY));
      scrollWindowToInstant(targetScrollY);
      sessionStorage.removeItem(restoreHomeScrollKey);
      sessionStorage.removeItem(skipIntroKey);
      sessionStorage.removeItem(homeReturnSlugKey);
    };

    void restoreHomeWithoutOverlay();

    return () => {
      cancelled = true;
      frameIds.forEach((frameId) => {
        window.cancelAnimationFrame(frameId);
      });
    };
  }, [pathname]);

  return (
    <CaseTransitionContext.Provider value={{ closeCase, navigateHomeAnchor, openCase, prefetchCase, switchCase }}>
      {children}
      {transition ? (
        <div data-brand-transition-overlay ref={overlayRef}>
          <div data-brand-transition-panel ref={panelRef}>
            <div data-brand-transition-noise />
            <span data-brand-transition-bloom data-bloom="a" />
            <span data-brand-transition-bloom data-bloom="b" />
            <span data-brand-transition-bloom data-bloom="c" />
            <p data-brand-transition-mark ref={markRef}>
              13:31
            </p>
          </div>
        </div>
      ) : null}
    </CaseTransitionContext.Provider>
  );
}

export function useCaseTransition() {
  const context = useContext(CaseTransitionContext);

  if (!context) {
    throw new Error("useCaseTransition must be used inside CaseTransitionProvider");
  }

  return context;
}
