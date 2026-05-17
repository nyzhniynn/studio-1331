"use client";

import {
  createContext,
  type MouseEvent,
  type Ref,
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
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CaseDetailLayout from "./CaseDetailLayout";
import {
  getCaseBySlug,
  getNextCase,
  getPreviousCase,
  getVisibleHomeCaseCountForSlug,
  homeVisibleCaseCountKey,
  type CaseStudy,
} from "./caseData";

gsap.registerPlugin(ScrollTrigger);

type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type HandoffReadinessSnapshot = {
  imageComplete: boolean | null;
  imageNaturalWidth: number | null;
  imageOpacity: string | null;
  imageVisibility: string | null;
  overlayRect: Rect | null;
  rectsMatch: boolean;
  targetEffectiveOpacity: number | null;
  targetOpacity: string | null;
  targetRect: Rect | null;
  targetVisibility: string | null;
  timestamp: number;
};

type OverlayState = {
  mode: "open" | "switch" | "close";
  caseStudy: CaseStudy;
  fromRect: Rect;
  href: string;
};

type PendingTransition =
  | {
      mode: "open";
      href: string;
      slug: string;
    }
  | {
      mode: "switch";
      href: string;
      slug: string;
    }
  | {
      mode: "close";
      href: string;
      restoreToCurrentCase: boolean;
      slug: string;
      scrollY: number;
      targetRect: Rect | null;
    };

type ScrollLockState = {
  bodyLeft: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyRight: string;
  bodyTop: string;
  bodyWidth: string;
  htmlScrollBehavior: string;
  scrollY: number;
};

type CaseTransitionContextValue = {
  closeCase: (caseStudy: CaseStudy) => void;
  openCase: (
    event: MouseEvent<HTMLAnchorElement>,
    caseStudy: CaseStudy,
    card: HTMLElement | null,
  ) => void;
  prefetchCase: (caseStudy: CaseStudy) => void;
  switchCase: (
    event: MouseEvent<HTMLAnchorElement>,
    caseStudy: CaseStudy,
    source: HTMLElement | null,
  ) => void;
};

const CaseTransitionContext = createContext<CaseTransitionContextValue | null>(null);
const homeScrollKey = "studio-1331:case-home-scroll";
const homeCaseRectKey = "studio-1331:case-home-rect";
const homeCaseSourceSlugKey = "studio-1331:case-home-source-slug";
const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const skipIntroKey = "studio-1331:skip-home-intro";

function rectFromElement(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function roundedRectFromElement(element: HTMLElement | null): Rect | null {
  if (!element) {
    return null;
  }

  const rect = rectFromElement(element);

  return {
    top: roundNumber(rect.top),
    left: roundNumber(rect.left),
    width: roundNumber(rect.width),
    height: roundNumber(rect.height),
  };
}

function rectsMatch(first: Rect | null, second: Rect | null, tolerance = 2) {
  if (!first || !second) {
    return false;
  }

  return (
    Math.abs(first.top - second.top) <= tolerance &&
    Math.abs(first.left - second.left) <= tolerance &&
    Math.abs(first.width - second.width) <= tolerance &&
    Math.abs(first.height - second.height) <= tolerance
  );
}

function getEffectiveOpacity(element: HTMLElement | null) {
  if (!element) {
    return null;
  }

  let opacity = 1;
  let currentElement: HTMLElement | null = element;

  while (currentElement && currentElement !== document.documentElement) {
    const computedStyle = window.getComputedStyle(currentElement);

    if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
      return 0;
    }

    const elementOpacity = Number(computedStyle.opacity);
    opacity *= Number.isFinite(elementOpacity) ? elementOpacity : 1;
    currentElement = currentElement.parentElement;
  }

  return roundNumber(opacity);
}

function getHandoffReadinessSnapshot(
  target: HTMLElement | null,
  image: HTMLImageElement | null,
  overlayMedia: HTMLElement | null,
): HandoffReadinessSnapshot {
  const targetStyle = target ? window.getComputedStyle(target) : null;
  const imageStyle = image ? window.getComputedStyle(image) : null;
  const targetRect = roundedRectFromElement(target);
  const overlayRect = roundedRectFromElement(overlayMedia);

  return {
    imageComplete: image ? image.complete : null,
    imageNaturalWidth: image ? image.naturalWidth : null,
    imageOpacity: imageStyle?.opacity ?? null,
    imageVisibility: imageStyle?.visibility ?? null,
    overlayRect,
    rectsMatch: rectsMatch(targetRect, overlayRect),
    targetEffectiveOpacity: getEffectiveOpacity(target),
    targetOpacity: targetStyle?.opacity ?? null,
    targetRect,
    targetVisibility: targetStyle?.visibility ?? null,
    timestamp: roundNumber(performance.now()),
  };
}

function isHandoffReady(snapshot: HandoffReadinessSnapshot) {
  const targetOpacity = Number(snapshot.targetOpacity ?? "0");
  const imageOpacity = Number(snapshot.imageOpacity ?? "0");

  return (
    snapshot.imageComplete === true &&
    (snapshot.imageNaturalWidth ?? 0) > 0 &&
    snapshot.targetVisibility !== "hidden" &&
    snapshot.imageVisibility !== "hidden" &&
    Number.isFinite(targetOpacity) &&
    targetOpacity >= 0.99 &&
    Number.isFinite(imageOpacity) &&
    imageOpacity >= 0.99 &&
    (snapshot.targetEffectiveOpacity ?? 0) >= 0.99 &&
    snapshot.rectsMatch
  );
}

function createMediaClone(
  target: HTMLElement,
  image: HTMLImageElement | null,
  cloneSelector: string,
  objectFit: "contain" | "cover",
) {
  if (!image) {
    return null;
  }

  const existingClone = target.querySelector<HTMLImageElement>(cloneSelector);

  existingClone?.remove();

  const clone = image.cloneNode(false) as HTMLImageElement;

  clone.alt = "";
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("data-case-handoff-clone", "true");
  Object.assign(clone.style, {
    display: "block",
    height: "100%",
    inset: "0",
    objectFit,
    opacity: "1",
    pointerEvents: "none",
    position: "absolute",
    transform: "translateZ(0)",
    width: "100%",
    willChange: "opacity, transform",
    zIndex: "3",
  });

  target.appendChild(clone);

  return clone;
}

function createHomeMediaHandoffClone(
  target: HTMLElement,
  sourceImage: HTMLImageElement | null,
) {
  return createMediaClone(target, sourceImage, "[data-case-handoff-clone]", "cover");
}

function releaseHomeMediaHandoffClone(clone: HTMLImageElement, onReleased: () => void) {
  let removeDelay: gsap.core.Tween | null = null;
  let fadeTween: gsap.core.Tween | null = null;

  removeDelay = gsap.delayedCall(0.62, () => {
    fadeTween = gsap.to(clone, {
      opacity: 0,
      duration: 0.18,
      ease: "power2.out",
      onComplete: () => {
        clone.remove();
        onReleased();
      },
    });
  });

  return () => {
    removeDelay?.kill();
    fadeTween?.kill();
    clone.remove();
  };
}

function getCaseHref(caseStudy: CaseStudy) {
  return `/cases/${caseStudy.slug}`;
}

function getSlugFromCasePath(path: string) {
  const match = path.match(/^\/cases\/([^/?#]+)/);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function readSavedHomeScroll() {
  const scrollY = Number(sessionStorage.getItem(homeScrollKey) ?? "0");

  return Number.isFinite(scrollY) ? scrollY : 0;
}

function getHomeCaseRectKey(slug: string) {
  return `${homeCaseRectKey}:${slug}`;
}

function saveHomeCaseRect(slug: string, rect: Rect) {
  sessionStorage.setItem(getHomeCaseRectKey(slug), JSON.stringify(rect));
}

function readSavedHomeCaseRect(slug: string) {
  const savedRect = sessionStorage.getItem(getHomeCaseRectKey(slug));

  if (!savedRect) {
    return null;
  }

  try {
    const rect = JSON.parse(savedRect) as Partial<Rect>;
    const values = [rect.top, rect.left, rect.width, rect.height];

    if (values.every((value) => typeof value === "number" && Number.isFinite(value))) {
      return rect as Rect;
    }
  } catch {
    return null;
  }

  return null;
}

function setCaseTransitionState(state: "opening" | "closing" | null) {
  if (state) {
    document.documentElement.dataset.caseTransition = state;
    return;
  }

  delete document.documentElement.dataset.caseTransition;
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

function lockDocumentScroll(scrollY: number): ScrollLockState {
  const body = document.body;
  const root = document.documentElement;
  const lockState: ScrollLockState = {
    bodyLeft: body.style.left,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyRight: body.style.right,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    htmlScrollBehavior: root.style.scrollBehavior,
    scrollY,
  };

  root.dataset.caseScrollLock = "true";
  root.style.scrollBehavior = "auto";
  body.style.position = "fixed";
  body.style.top = `-${scrollY}px`;
  body.style.left = "0";
  body.style.right = "0";
  body.style.width = "100%";
  body.style.overflow = "hidden";

  return lockState;
}

function unlockDocumentScroll(lockState: ScrollLockState, targetScrollY: number) {
  const body = document.body;
  const root = document.documentElement;

  body.style.position = lockState.bodyPosition;
  body.style.top = lockState.bodyTop;
  body.style.left = lockState.bodyLeft;
  body.style.right = lockState.bodyRight;
  body.style.width = lockState.bodyWidth;
  body.style.overflow = lockState.bodyOverflow;
  root.style.scrollBehavior = lockState.htmlScrollBehavior;
  delete root.dataset.caseScrollLock;
  scrollWindowToInstant(targetScrollY);
}

function markHomeScrollForRestore(scrollY = readSavedHomeScroll()) {
  sessionStorage.setItem(homeScrollKey, String(scrollY));
  sessionStorage.setItem(restoreHomeScrollKey, "true");
  sessionStorage.setItem(skipIntroKey, "true");
}

function markHomeVisibleCasesForRestore(slug: string) {
  const savedCount = Number(sessionStorage.getItem(homeVisibleCaseCountKey) ?? "0");
  const requiredCount = getVisibleHomeCaseCountForSlug(slug);
  const visibleCount = Math.max(Number.isFinite(savedCount) ? savedCount : 0, requiredCount);

  sessionStorage.setItem(homeVisibleCaseCountKey, String(visibleCount));
}

function findHomeCardMedia(slug: string) {
  const card = gsap.utils
    .toArray<HTMLElement>("[data-case-card-slug]")
    .find((element) => element.dataset.caseCardSlug === slug);

  return card?.querySelector<HTMLElement>("[data-motion-case-media]") ?? null;
}

function getHomeLandingElements() {
  return [
    document.querySelector<HTMLElement>("main"),
    document.querySelector<HTMLElement>("[data-site-footer]"),
  ].filter(Boolean) as HTMLElement[];
}

function isInsideTransitionOverlay(element: HTMLElement) {
  return Boolean(element.closest("[data-case-transition-overlay]"));
}

function getRealDetailRoot() {
  return gsap.utils
    .toArray<HTMLElement>("[data-case-detail]")
    .find((element) => !isInsideTransitionOverlay(element)) ?? null;
}

function getDetailMediaElement() {
  return gsap.utils
    .toArray<HTMLElement>("[data-case-detail-media]")
    .find((element) => !isInsideTransitionOverlay(element)) ?? null;
}

function getDetailMediaRect() {
  const media = getDetailMediaElement();

  return media ? rectFromElement(media) : null;
}

function getTransitionSceneParts(root: HTMLElement | null) {
  if (!root) {
    return null;
  }

  return {
    copyRows: gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-case-transition-copy-row]")),
    divider: root.querySelector<HTMLElement>("[data-case-transition-divider]"),
    footer: root.querySelector<HTMLElement>("[data-case-transition-footer]"),
    followupVisuals: gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-case-transition-followup-visual]")),
    leftRail: root.querySelector<HTMLElement>("[data-case-transition-left-rail]"),
    rightNote: root.querySelector<HTMLElement>("[data-case-transition-right-note]"),
    target: root.querySelector<HTMLElement>("[data-case-transition-target-media]"),
    title: root.querySelector<HTMLElement>("[data-case-transition-title]"),
  };
}

function getDetailPageParts() {
  const root = getRealDetailRoot();
  const title = root?.querySelector<HTMLElement>("[data-case-detail-title]") ?? null;
  const leftRail = root?.querySelector<HTMLElement>("[data-case-detail-left-rail]") ?? null;
  const divider = root?.querySelector<HTMLElement>("[data-case-detail-divider]") ?? null;
  const rightNote = root?.querySelector<HTMLElement>("[data-case-detail-right-note]") ?? null;
  const footer = root?.querySelector<HTMLElement>("[data-case-detail-footer]") ?? null;
  const target = root?.querySelector<HTMLElement>("[data-case-detail-media]") ?? null;
  const followupVisuals = root
    ? gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-case-detail-visual]"))
    : [];
  const copyRows = root
    ? gsap.utils.toArray<HTMLElement>(root.querySelectorAll("[data-case-detail-copy-row]"))
    : [];

  return {
    copyRows,
    divider,
    followupVisuals,
    footer,
    pageElements: [title, leftRail, divider, rightNote, footer].filter(Boolean) as HTMLElement[],
    target,
  };
}

function waitForAnimationFrame(frameIds: number[]) {
  return new Promise<void>((resolve) => {
    const frameId = window.requestAnimationFrame(() => {
      resolve();
    });

    frameIds.push(frameId);
  });
}

async function waitForPaintFrames(
  count: number,
  frameIds: number[],
  onFrame?: () => void,
) {
  for (let index = 0; index < count; index += 1) {
    await waitForAnimationFrame(frameIds);
    onFrame?.();
  }
}

async function waitForImagePaint(
  image: HTMLImageElement | null,
  frameIds: number[],
  onFrame?: () => void,
) {
  if (image) {
    if (!image.complete || image.naturalWidth <= 0) {
      await new Promise<void>((resolve) => {
        const cleanup = () => {
          image.removeEventListener("load", cleanup);
          image.removeEventListener("error", cleanup);
          resolve();
        };

        image.addEventListener("load", cleanup, { once: true });
        image.addEventListener("error", cleanup, { once: true });
      });
    }

    await image.decode().catch(() => undefined);
  }

  await waitForPaintFrames(2, frameIds, onFrame);
}

async function waitForHandoffReadiness(
  target: HTMLElement,
  image: HTMLImageElement | null,
  overlayMedia: HTMLElement,
  frameIds: number[],
  onFrame?: () => void,
) {
  await waitForImagePaint(image, frameIds, onFrame);

  let snapshot = getHandoffReadinessSnapshot(target, image, overlayMedia);

  for (let attempt = 0; attempt < 8 && !isHandoffReady(snapshot); attempt += 1) {
    await waitForPaintFrames(1, frameIds, onFrame);
    snapshot = getHandoffReadinessSnapshot(target, image, overlayMedia);
  }

  return snapshot;
}

async function waitForDetailAssets(root: HTMLElement | null) {
  const imageElements = root
    ? gsap.utils.toArray<HTMLImageElement>(root.querySelectorAll("img"))
    : [];
  const imagePromises = imageElements.map((image) => {
    if (image.complete) {
      return Promise.resolve();
    }

    return image.decode().catch(() => undefined);
  });
  const fontPromise = "fonts" in document
    ? document.fonts.ready.catch(() => undefined)
    : Promise.resolve();

  await Promise.allSettled([fontPromise, ...imagePromises]);
}

export function CaseTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<PendingTransition | null>(null);
  const pendingSourceScrollYRef = useRef<number | null>(null);
  const scrollLockRef = useRef<ScrollLockState | null>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  const releaseScrollLock = useCallback((targetScrollY: number) => {
    const lockState = scrollLockRef.current;

    if (!lockState) {
      scrollWindowToInstant(targetScrollY);
      return;
    }

    scrollLockRef.current = null;
    unlockDocumentScroll(lockState, targetScrollY);
  }, []);

  useLayoutEffect(() => {
    return () => {
      const lockState = scrollLockRef.current;

      if (lockState) {
        scrollLockRef.current = null;
        unlockDocumentScroll(lockState, lockState.scrollY);
      }

      setCaseTransitionState(null);
    };
  }, []);

  const prefetchCase = useCallback((caseStudy: CaseStudy) => {
    router.prefetch(getCaseHref(caseStudy));
  }, [router]);

  const openCase = useCallback<CaseTransitionContextValue["openCase"]>((event, caseStudy, card) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();

    const media = card?.querySelector<HTMLElement>("[data-motion-case-media]");
    const href = getCaseHref(caseStudy);
    const currentScrollY = window.scrollY;
    const sourceRect = media ? rectFromElement(media) : null;

    sessionStorage.setItem(homeScrollKey, String(currentScrollY));
    sessionStorage.setItem(homeCaseSourceSlugKey, caseStudy.slug);
    sessionStorage.removeItem(restoreHomeScrollKey);
    sessionStorage.setItem(skipIntroKey, "true");
    if (sourceRect) {
      saveHomeCaseRect(caseStudy.slug, sourceRect);
    }
    pendingRef.current = { mode: "open", href, slug: caseStudy.slug };
    router.prefetch(href);

    if (!media || !sourceRect) {
      scrollWindowToInstant(0);
      router.push(href, { scroll: false });
      return;
    }

    pendingSourceScrollYRef.current = currentScrollY;

    const otherCards = gsap.utils
      .toArray<HTMLElement>("[data-motion-case-card]")
      .filter((caseCard) => caseCard !== card);

    gsap.set(media, {
      autoAlpha: 0,
    });
    gsap.to(otherCards, {
      autoAlpha: 0.26,
      filter: "blur(6px)",
      y: 22,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.035,
    });

    setOverlay({
      mode: "open",
      caseStudy,
      fromRect: sourceRect,
      href,
    });
  }, [router]);

  const switchCase = useCallback<CaseTransitionContextValue["switchCase"]>((event, caseStudy, source) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const href = getCaseHref(caseStudy);

    if (pathname === href) {
      return;
    }

    event.preventDefault();

    const sourceRect = source ? rectFromElement(source) : getDetailMediaRect();

    pendingRef.current = {
      mode: "switch",
      href,
      slug: caseStudy.slug,
    };
    router.prefetch(href);

    if (!sourceRect) {
      scrollWindowToInstant(0);
      router.push(href, { scroll: false });
      return;
    }

    pendingSourceScrollYRef.current = window.scrollY;
    setOverlay({
      mode: "switch",
      caseStudy,
      fromRect: sourceRect,
      href,
    });
  }, [pathname, router]);

  const closeCase = useCallback((caseStudy: CaseStudy) => {
    if (pendingRef.current?.mode === "close" || overlayRef.current) {
      return;
    }

    const scrollY = readSavedHomeScroll();
    const href = "/";
    const sourceRect = getDetailMediaRect();
    const sourceSlug = sessionStorage.getItem(homeCaseSourceSlugKey);
    const restoreToCurrentCase = Boolean(sourceSlug && sourceSlug !== caseStudy.slug);

    markHomeScrollForRestore(scrollY);
    markHomeVisibleCasesForRestore(caseStudy.slug);
    pendingRef.current = {
      mode: "close",
      href,
      restoreToCurrentCase,
      slug: caseStudy.slug,
      scrollY,
      targetRect: restoreToCurrentCase ? null : readSavedHomeCaseRect(caseStudy.slug),
    };
    router.prefetch(href);

    if (!sourceRect) {
      scrollWindowToInstant(scrollY);
      router.push(href, { scroll: false });
      return;
    }

    pendingSourceScrollYRef.current = window.scrollY;
    flushSync(() => {
      setOverlay({
        mode: "close",
        caseStudy,
        fromRect: sourceRect,
        href,
      });
    });
  }, [router]);

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const handlePopState = () => {
      if (!pathname.startsWith("/cases/") || window.location.pathname !== "/") {
        return;
      }

      const slug = getSlugFromCasePath(pathname);
      const caseStudy = slug ? getCaseBySlug(slug) : null;
      const scrollY = readSavedHomeScroll();

      if (!caseStudy) {
        return;
      }

      markHomeScrollForRestore(scrollY);
      markHomeVisibleCasesForRestore(caseStudy.slug);
      pendingRef.current = null;
      pendingSourceScrollYRef.current = null;
      setCaseTransitionState(null);
      setOverlay(null);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [pathname]);

  useLayoutEffect(() => {
    if (!overlay || !mediaRef.current || !bgRef.current || !overlayRef.current) {
      return;
    }

    const sourceScrollY = pendingSourceScrollYRef.current ?? window.scrollY;

    gsap.set(overlayRef.current, {
      autoAlpha: 1,
    });
    const mobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const initialBgAlpha = overlay.mode === "open" && mobileViewport ? 0.86 : 0;

    gsap.set(bgRef.current, {
      autoAlpha: initialBgAlpha,
      zIndex: 0,
    });
    if (overlay.mode === "close" && sceneRef.current) {
      const sceneDetail = sceneRef.current.querySelector<HTMLElement>("[data-case-detail]");
      const sceneFollowupVisuals = gsap.utils.toArray<HTMLElement>(
        sceneRef.current.querySelectorAll("[data-case-transition-followup-visual]"),
      );

      sceneRef.current.style.setProperty("background", "#f4f4ef", "important");
      sceneDetail?.style.setProperty("background", "#f4f4ef", "important");
      sceneFollowupVisuals.forEach((visual) => {
        visual.style.setProperty("visibility", "visible", "important");
        visual.style.setProperty("opacity", "1", "important");
      });
      gsap.set(sceneRef.current, {
        autoAlpha: 1,
        backgroundColor: "#f4f4ef",
        y: -sourceScrollY,
      });
      gsap.set(sceneDetail, {
        backgroundColor: "#f4f4ef",
      });
    } else if (sceneRef.current) {
      const sceneDetail = sceneRef.current.querySelector<HTMLElement>("[data-case-detail]");

      gsap.set(sceneRef.current, {
        backgroundColor: "#f4f4ef",
        y: 0,
      });
      gsap.set(sceneDetail, {
        backgroundColor: "#f4f4ef",
      });
    }
    gsap.set(mediaRef.current, {
      top: overlay.fromRect.top,
      left: overlay.fromRect.left,
      width: overlay.fromRect.width,
      height: overlay.fromRect.height,
      borderRadius: 8,
      autoAlpha: 1,
      force3D: true,
      zIndex: 2,
    });
    setCaseTransitionState(overlay.mode === "close" ? "closing" : "opening");

    if (!scrollLockRef.current) {
      pendingSourceScrollYRef.current = null;
      scrollLockRef.current = lockDocumentScroll(sourceScrollY);
    }
  }, [overlay]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;

    if (
      !overlay ||
      !pending ||
      pathname === pending.href ||
      !overlayRef.current ||
      !sceneRef.current ||
      !mediaRef.current ||
      !bgRef.current
    ) {
      return;
    }

    if (pending.mode === "close") {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduceMotion) {
        router.push(pending.href, { scroll: false });
        return;
      }

      if (pending.targetRect) {
        let routePushFrame = 0;
        const timeline = gsap.timeline({
          defaults: {
            ease: "power4.inOut",
          },
          onComplete: () => {
            routePushFrame = window.requestAnimationFrame(() => {
              router.push(pending.href, { scroll: false });
            });
          },
        });

        timeline
          .to(mediaRef.current, {
            top: pending.targetRect.top,
            left: pending.targetRect.left,
            width: pending.targetRect.width,
            height: pending.targetRect.height,
            borderRadius: 8,
            duration: 1.28,
          }, 0)
          .to(sceneRef.current, {
            autoAlpha: 0,
            duration: 0.9,
            ease: "power2.out",
          }, 0.1)
          .to(bgRef.current, {
            autoAlpha: 1,
            duration: 0.54,
            ease: "power2.inOut",
          }, 1.1)
          .set(mediaRef.current, {
            autoAlpha: 1,
          }, 1.42);

        return () => {
          timeline.kill();
          window.cancelAnimationFrame(routePushFrame);
        };
      }

      let cancelled = false;
      const frameIds: number[] = [];
      const pushAfterOverlayPaint = async () => {
        await waitForPaintFrames(3, frameIds);

        if (cancelled) {
          return;
        }

        router.push(pending.href, { scroll: false });
      };

      void pushAfterOverlayPaint();

      return () => {
        cancelled = true;
        frameIds.forEach((frameId) => {
          window.cancelAnimationFrame(frameId);
        });
      };
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sceneParts = getTransitionSceneParts(sceneRef.current);

    if (!sceneParts?.target) {
      router.push(overlay.href, { scroll: false });
      return;
    }

    if (reduceMotion) {
      router.push(overlay.href, { scroll: false });
      return;
    }

    const targetRect = rectFromElement(sceneParts.target);
    let routePushFrame = 0;
    const sceneFinalElements = [
      sceneParts.target,
      sceneParts.title,
      sceneParts.divider,
      sceneParts.rightNote,
      sceneParts.leftRail,
      sceneParts.footer,
      ...sceneParts.copyRows,
      ...sceneParts.followupVisuals,
    ].filter(Boolean) as HTMLElement[];

    gsap.set(sceneRef.current, {
      autoAlpha: 0,
    });
    gsap.set([
      sceneParts.target,
      ...sceneParts.followupVisuals,
    ], {
      autoAlpha: 0,
    });
    gsap.set(sceneParts.title, {
      autoAlpha: 0,
      y: 46,
    });
    gsap.set(sceneParts.divider, {
      autoAlpha: 0,
      scaleY: 0,
      transformOrigin: "50% 0%",
    });
    gsap.set(sceneParts.rightNote, {
      autoAlpha: 0,
      y: 18,
    });
    gsap.set(sceneParts.leftRail, {
      autoAlpha: 0,
      y: 28,
    });
    gsap.set(sceneParts.copyRows, {
      autoAlpha: 0,
      y: 22,
    });
    gsap.set(sceneParts.footer, {
      autoAlpha: 0,
      y: 18,
    });
    gsap.set(sceneParts.followupVisuals, {
      clipPath: "inset(0% 0% 100% 0%)",
      y: -28,
    });

    const timeline = gsap.timeline({
      defaults: {
        ease: "power4.inOut",
      },
      onComplete: () => {
        gsap.set(sceneFinalElements, {
          clearProps: "visibility,opacity,transform,clipPath,scale,filter",
        });
        scrollWindowToInstant(0);
        routePushFrame = window.requestAnimationFrame(() => {
          router.push(overlay.href, { scroll: false });
        });
      },
    });

    timeline
      .to(bgRef.current, {
        autoAlpha: 1,
        duration: 0.58,
        ease: "power2.out",
      }, 0)
      .to(sceneRef.current, {
        autoAlpha: 1,
        duration: 0.44,
        ease: "power2.out",
      }, 0.1)
      .to(sceneParts.title, {
        autoAlpha: 1,
        y: 0,
        duration: 0.85,
        ease: "power3.out",
      }, 0.16)
      .to(sceneParts.divider, {
        autoAlpha: 1,
        scaleY: 1,
        duration: 0.92,
        ease: "power3.out",
      }, 0.32)
      .to(sceneParts.rightNote, {
        autoAlpha: 1,
        y: 0,
        duration: 0.64,
        ease: "power3.out",
      }, 0.42)
      .to(mediaRef.current, {
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius: 0,
        duration: 1.28,
      }, 0.58)
      .set(sceneParts.target, {
        autoAlpha: 1,
      }, 1.56)
      .to(sceneParts.leftRail, {
        autoAlpha: 1,
        y: 0,
        duration: 0.01,
        ease: "none",
      }, 1.1)
      .to(sceneParts.copyRows, {
        autoAlpha: 1,
        y: 0,
        duration: 0.72,
        ease: "power3.out",
        stagger: 0.08,
      }, 1.12)
      .to(sceneParts.followupVisuals, {
        autoAlpha: 1,
        y: 0,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.82,
        ease: "power3.out",
        stagger: 0.14,
      }, 1.6)
      .to(sceneParts.footer, {
        autoAlpha: 1,
        y: 0,
        duration: 0.58,
        ease: "power3.out",
      }, 1.82);

    return () => {
      timeline.kill();
      window.cancelAnimationFrame(routePushFrame);
    };
  }, [overlay, pathname, router]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;

    if (
      !pending ||
      pending.mode === "close" ||
      pathname !== pending.href ||
      !overlayRef.current
    ) {
      return;
    }

    let cancelled = false;
    const frameIds: number[] = [];
    let fadeTween: gsap.core.Tween | null = null;

    const fadeOutOverlay = () => {
      if (cancelled || !overlayRef.current) {
        return;
      }

      const {
        copyRows,
        followupVisuals,
        pageElements,
        target,
      } = getDetailPageParts();
      const realElements = [target, ...followupVisuals, ...pageElements, ...copyRows].filter(Boolean) as HTMLElement[];

      gsap.set(realElements, {
        clearProps: "transform,clipPath,scale,filter",
      });
      gsap.set(realElements, {
        autoAlpha: 1,
      });

      const frameId = window.requestAnimationFrame(() => {
        if (cancelled || !overlayRef.current) {
          return;
        }

        fadeTween = gsap.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.46,
          ease: "power2.out",
          onComplete: () => {
            pendingRef.current = null;
            setCaseTransitionState(null);
            gsap.set(realElements, {
              clearProps: "visibility,opacity,transform,clipPath,scale,filter",
            });
            setOverlay(null);
          },
        });
      });
      frameIds.push(frameId);
    };

    const waitForStableDetailPaint = async () => {
      releaseScrollLock(0);

      const detailRoot = getRealDetailRoot();

      await waitForDetailAssets(detailRoot);
      await waitForPaintFrames(3, frameIds, () => {
        scrollWindowToInstant(0);
      });

      if (cancelled) {
        return;
      }

      fadeOutOverlay();
    };

    void waitForStableDetailPaint();

    return () => {
      cancelled = true;
      frameIds.forEach((frameId) => {
        window.cancelAnimationFrame(frameId);
      });
      fadeTween?.kill();
    };
  }, [pathname, releaseScrollLock]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;

    if (
      pending?.mode !== "close" ||
      pathname !== "/" ||
      !overlay ||
      !overlayRef.current ||
      !sceneRef.current ||
      !mediaRef.current ||
      !bgRef.current
    ) {
      return;
    }

    let cancelled = false;
    let completed = false;
    let observer: MutationObserver | null = null;
    let handoffTimeline: gsap.core.Timeline | null = null;
    let settleTween: gsap.core.Tween | null = null;
    let handoffLandingElements: HTMLElement[] = [];
    let handoffRealMediaElements: HTMLElement[] = [];
    let handoffClone: HTMLImageElement | null = null;
    let cleanupHandoffClone: (() => void) | null = null;
    const frameIds: number[] = [];

    const cleanupTransition = () => {
      gsap.set([...handoffLandingElements, ...handoffRealMediaElements], {
        clearProps: "visibility,opacity,pointerEvents,transform,filter,clipPath,scale,willChange,contain",
      });
      pendingRef.current = null;
      pendingSourceScrollYRef.current = null;
      sessionStorage.removeItem(restoreHomeScrollKey);
      sessionStorage.removeItem(skipIntroKey);
      setCaseTransitionState(null);
      completed = true;
      setOverlay(null);

      if (handoffClone) {
        const clone = handoffClone;

        cleanupHandoffClone = releaseHomeMediaHandoffClone(clone, () => {
          if (handoffClone === clone) {
            handoffClone = null;
            cleanupHandoffClone = null;
          }
        });
      }
    };

    const startHandoff = async (target: HTMLElement) => {
      releaseScrollLock(pending.scrollY);

      await waitForPaintFrames(3, frameIds, () => {
        scrollWindowToInstant(pending.scrollY);
      });

      if (cancelled || !overlayRef.current || !sceneRef.current || !mediaRef.current || !bgRef.current) {
        return;
      }

      const restoredTarget = findHomeCardMedia(pending.slug) ?? target;
      if (pending.restoreToCurrentCase) {
        const targetScrollY = getPreferredHomeScrollForTarget(restoredTarget, pending.scrollY);

        if (Math.abs(targetScrollY - pending.scrollY) > 1) {
          pending.scrollY = targetScrollY;
          sessionStorage.setItem(homeScrollKey, String(targetScrollY));
          scrollWindowToInstant(targetScrollY);
          await waitForPaintFrames(2, frameIds, () => {
            scrollWindowToInstant(targetScrollY);
          });
        }
      }

      if (cancelled || !overlayRef.current || !sceneRef.current || !mediaRef.current || !bgRef.current) {
        return;
      }

      const targetRect = rectFromElement(restoredTarget);
      const targetImage = restoredTarget.querySelector<HTMLImageElement>("img");
      const overlayImage = mediaRef.current.querySelector<HTMLImageElement>("img");
      const landingElements = getHomeLandingElements();

      handoffLandingElements = landingElements;
      handoffRealMediaElements = [restoredTarget, targetImage].filter(Boolean) as HTMLElement[];

      gsap.killTweensOf([
        mediaRef.current,
        bgRef.current,
        sceneRef.current,
        ...landingElements,
        ...handoffRealMediaElements,
      ]);
      gsap.set(landingElements, {
        opacity: 1,
        pointerEvents: "none",
        visibility: "visible",
      });
      gsap.set(handoffRealMediaElements, {
        clearProps: "pointerEvents,filter,clipPath,scale",
      });
      gsap.set(handoffRealMediaElements, {
        autoAlpha: 0,
        backfaceVisibility: "hidden",
        contain: "paint",
        force3D: true,
        transform: "translateZ(0)",
        willChange: "transform, opacity",
      });
      gsap.set(bgRef.current, {
        autoAlpha: pending.targetRect ? 1 : 0,
        zIndex: 0,
      });
      gsap.set(sceneRef.current, {
        autoAlpha: pending.targetRect ? 0 : 1,
      });
      gsap.set(mediaRef.current, {
        borderRadius: 8,
        autoAlpha: 1,
      });

      const settleOverlayMediaToTarget = async () => {
        if (!mediaRef.current) {
          return;
        }

        const currentRect = rectFromElement(mediaRef.current);
        const targetState = {
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: 8,
          autoAlpha: 1,
        };

        if (rectsMatch(currentRect, targetRect, 0.2)) {
          gsap.set(mediaRef.current, targetState);
          await waitForPaintFrames(1, frameIds, () => {
            scrollWindowToInstant(pending.scrollY);
          });
          return;
        }

        await new Promise<void>((resolve) => {
          settleTween = gsap.to(mediaRef.current, {
            ...targetState,
            duration: 0.18,
            ease: "power2.out",
            onComplete: resolve,
            onInterrupt: resolve,
          });
        });

        await waitForPaintFrames(1, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });
      };

      const finishHandoff = async () => {
        if (cancelled || !mediaRef.current) {
          return;
        }

        await settleOverlayMediaToTarget();

        if (cancelled || !mediaRef.current) {
          return;
        }

        gsap.set(handoffRealMediaElements, {
          autoAlpha: 1,
        });

        await waitForHandoffReadiness(restoredTarget, targetImage, mediaRef.current, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        await waitForPaintFrames(2, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        if (cancelled) {
          return;
        }

        handoffClone = createHomeMediaHandoffClone(restoredTarget, overlayImage ?? targetImage);
        await waitForImagePaint(handoffClone, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });
        await waitForPaintFrames(2, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        if (cancelled) {
          handoffClone?.remove();
          handoffClone = null;
          return;
        }

        if (!overlayRef.current) {
          cleanupTransition();
          return;
        }

        handoffTimeline = gsap.timeline({
          onComplete: cleanupTransition,
        });
        handoffTimeline.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.46,
          ease: "power2.out",
        });
      };

      if (pending.targetRect) {
        await waitForPaintFrames(2, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        if (cancelled || !overlayRef.current || !mediaRef.current) {
          return;
        }

        await settleOverlayMediaToTarget();

        if (cancelled || !overlayRef.current || !mediaRef.current) {
          return;
        }

        gsap.set(handoffRealMediaElements, {
          autoAlpha: 1,
        });

        await waitForHandoffReadiness(restoredTarget, targetImage, mediaRef.current, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        await waitForPaintFrames(2, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        if (cancelled || !overlayRef.current) {
          return;
        }

        handoffClone = createHomeMediaHandoffClone(restoredTarget, overlayImage ?? targetImage);
        await waitForImagePaint(handoffClone, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });
        await waitForPaintFrames(2, frameIds, () => {
          scrollWindowToInstant(pending.scrollY);
        });

        if (cancelled || !overlayRef.current) {
          handoffClone?.remove();
          handoffClone = null;
          return;
        }

        gsap.set(handoffRealMediaElements, {
          autoAlpha: 1,
        });

        handoffTimeline = gsap.timeline({
          onComplete: cleanupTransition,
        });
        handoffTimeline.to(overlayRef.current, {
          autoAlpha: 0,
          duration: 0.46,
          ease: "power2.out",
        });
        return;
      }

      handoffTimeline = gsap.timeline({
        defaults: {
          ease: "power2.out",
        },
        onComplete: () => {
          void finishHandoff();
        },
      });

      handoffTimeline
        .to(mediaRef.current, {
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
          borderRadius: 8,
          duration: 1.28,
          ease: "power4.inOut",
        }, 0)
        .to(sceneRef.current, {
          autoAlpha: 0,
          duration: 0.78,
          ease: "power2.out",
        }, 0.1)
        .to(bgRef.current, {
          autoAlpha: 0,
          duration: 0.82,
          ease: "power2.inOut",
        }, 0.36);
    };

    const tryStart = () => {
      const target = findHomeCardMedia(pending.slug);

      if (!target) {
        return false;
      }

      observer?.disconnect();
      observer = null;
      void startHandoff(target);

      return true;
    };

    if (!tryStart()) {
      observer = new MutationObserver(() => {
        tryStart();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      frameIds.forEach((frameId) => {
        window.cancelAnimationFrame(frameId);
      });
      handoffTimeline?.kill();
      settleTween?.kill();
      if (!completed) {
        cleanupHandoffClone?.();
      }
    };
  }, [overlay, pathname, releaseScrollLock]);

  useLayoutEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const shouldRestore = sessionStorage.getItem(restoreHomeScrollKey) === "true";

    if (!shouldRestore) {
      return;
    }

    if (pendingRef.current?.mode === "close" && overlay) {
      return;
    }

    const scrollY = readSavedHomeScroll();
    let cancelled = false;

    scrollWindowToInstant(scrollY);
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      sessionStorage.removeItem(skipIntroKey);
      if (pendingRef.current?.mode === "close") {
        pendingRef.current = null;
        pendingSourceScrollYRef.current = null;
      }
      setCaseTransitionState(null);
    });

    return () => {
      cancelled = true;
    };
  }, [overlay, pathname]);

  return (
    <CaseTransitionContext.Provider value={{ closeCase, openCase, prefetchCase, switchCase }}>
      {children}
      {overlay ? (
        <div data-case-transition-overlay data-case-transition-mode={overlay.mode} ref={overlayRef}>
          <div data-case-transition-bg ref={bgRef} />
          <CaseTransitionScene caseStudy={overlay.caseStudy} mode={overlay.mode} sceneRef={sceneRef} />
          <div data-case-transition-media ref={mediaRef}>
            <img src={overlay.caseStudy.image} alt="" />
          </div>
        </div>
      ) : null}
    </CaseTransitionContext.Provider>
  );
}

function CaseTransitionScene({
  caseStudy,
  mode,
  sceneRef,
}: {
  caseStudy: CaseStudy;
  mode: OverlayState["mode"];
  sceneRef: Ref<HTMLDivElement>;
}) {
  const nextCase = getNextCase(caseStudy.slug);
  const previousCase = getPreviousCase(caseStudy.slug);

  return (
    <div
      data-case-transition-scene
      ref={sceneRef}
      style={mode === "close" ? { background: "#f4f4ef" } : undefined}
    >
      <CaseDetailLayout
        backSlot={<span data-case-back>Back to cases</span>}
        caseStudy={caseStudy}
        nextCase={nextCase}
        previousCase={previousCase}
        primaryVisual="slot"
        transition
      />
    </div>
  );
}

export function useCaseTransition() {
  const context = useContext(CaseTransitionContext);

  if (!context) {
    throw new Error("useCaseTransition must be used inside CaseTransitionProvider");
  }

  return context;
}
