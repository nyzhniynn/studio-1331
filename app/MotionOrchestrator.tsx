"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getLocaleFromPathname, type Locale } from "./i18n";

gsap.registerPlugin(ScrollTrigger);

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const homeMotionReadyEvent = "studio-1331:home-motion-ready";
const morphPointCount = 72;

type Point = {
  x: number;
  y: number;
};

function isConnectedElement<T extends Element>(element: T | null | undefined): element is T {
  return Boolean(element?.isConnected);
}

function queryOne<T extends Element>(scope: ParentNode, selector: string) {
  const element = scope.querySelector<T>(selector);

  return isConnectedElement(element) ? element : null;
}

function queryAll<T extends Element>(scope: ParentNode, selector: string) {
  return Array.from(scope.querySelectorAll<T>(selector)).filter(isConnectedElement);
}

function findMotionRoot(routeKey: Locale) {
  return document.querySelector<HTMLElement>(
    `[data-motion-main-state='ready'][data-motion-locale='${routeKey}']`,
  );
}

function samplePath(pathData: string, count: number, folded: boolean): Point[] {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);

  const length = path.getTotalLength();
  const points: Point[] = [];

  for (let index = 0; index < count; index += 1) {
    const point = path.getPointAtLength((length * index) / count);
    const x = folded ? point.x * 1.34 + 128 : point.x;
    const y = folded ? point.y * 1.34 + 116 : point.y;

    points.push({ x, y });
  }

  return points;
}

function pointsToPath(points: Point[]) {
  return `${points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join("")}Z`;
}

function blendPoints(from: Point[], to: Point[], progress: number) {
  return from.map((point, index) => ({
    x: point.x + (to[index].x - point.x) * progress,
    y: point.y + (to[index].y - point.y) * progress,
  }));
}

function isRestoringHomePage() {
  return window.sessionStorage.getItem(restoreHomeScrollKey) === "true";
}

function markHomeMotionReady(locale: Locale) {
  document.documentElement.dataset.homeMotionReadyLocale = locale;
  document.dispatchEvent(
    new CustomEvent(homeMotionReadyEvent, {
      detail: { locale },
    }),
  );
}

function setHomeToRestoredFinalState(scope: ParentNode) {
  const finalElements = queryAll<HTMLElement>(scope, [
    "[data-motion]",
    "[data-motion='reveal']",
    "[data-motion='media']",
    "[data-motion='line']",
    "[data-motion-section]",
    "[data-motion-stack]",
    "[data-motion-case-card]",
    "[data-motion-case-media]",
    "[data-case-caption]",
    "[data-motion-service-row]",
    "[data-motion-service-title]",
    "[data-motion-service-index]",
    "[data-motion-service-body]",
    "[data-motion-process-step]",
    "[data-motion-process-meta]",
    "[data-motion-process-content]",
    "[data-motion-team-card]",
    "[data-motion-team-media]",
    "[data-motion-form-item]",
    "[data-motion-flower]",
    "[data-motion-flower] *",
    "[data-motion-hero-copy]",
    "[data-motion-hero-line]",
  ].join(", "));
  const clippedElements = queryAll<HTMLElement>(scope, [
    "[data-motion='media']",
    "[data-motion-case-media]",
    "[data-motion-team-media]",
  ].join(", "));
  const lineElements = queryAll<HTMLElement>(scope, "[data-motion='line']");
  const yellowLayer = queryOne<HTMLElement>(scope, "[data-motion-yellow-layer]");

  gsap.killTweensOf(finalElements);
  gsap.set(finalElements, {
    autoAlpha: 1,
    clearProps: "transform,filter,willChange",
  });
  gsap.set(clippedElements, {
    clipPath: "inset(0% 0% 0% 0%)",
  });
  gsap.set(lineElements, {
    scaleX: 1,
    transformOrigin: "0% 50%",
  });
  if (yellowLayer) {
    gsap.set(yellowLayer, {
      clipPath: "inset(0% 0% 100% 0%)",
    });
  }
}

function hasTargets(targets: Element | Element[] | NodeListOf<Element> | null | undefined) {
  if (!targets) {
    return false;
  }

  if (targets instanceof Element) {
    return targets.isConnected;
  }

  return Array.from(targets).some(isConnectedElement);
}

function setMobileContentToFinalState(scope: ParentNode) {
  const finalElements = queryAll<HTMLElement>(scope, [
    "[data-motion-preset] [data-motion='reveal']",
    "[data-motion-preset] [data-motion='media']",
    "[data-motion-preset] [data-case-caption]",
    "[data-motion-preset] [data-motion-case-card]",
    "[data-motion-preset] [data-motion-case-media]",
    "[data-motion-preset] [data-motion-service-row]",
    "[data-motion-preset] [data-motion-service-title]",
    "[data-motion-preset] [data-motion-service-index]",
    "[data-motion-preset] [data-motion-service-body]",
    "[data-motion-preset] [data-motion-process-step]",
    "[data-motion-preset] [data-motion-process-meta]",
    "[data-motion-preset] [data-motion-process-content]",
    "[data-motion-preset] [data-motion-team-card]",
    "[data-motion-preset] [data-motion-team-media]",
    "[data-motion-preset] [data-motion-form-item]",
  ].join(", "));
  const clippedElements = queryAll<HTMLElement>(scope, [
    "[data-motion-preset] [data-motion='media']",
    "[data-motion-preset] [data-motion-case-media]",
    "[data-motion-preset] [data-motion-team-media]",
  ].join(", "));
  const presetLines = queryAll<HTMLElement>(scope, "[data-motion-preset] [data-motion='line']");

  gsap.killTweensOf([...finalElements, ...clippedElements, ...presetLines]);
  gsap.set(finalElements, {
    autoAlpha: 1,
    clearProps: "transform,filter,willChange",
  });
  gsap.set(clippedElements, {
    clipPath: "inset(0% 0% 0% 0%)",
    clearProps: "scale",
  });
  gsap.set(presetLines, {
    autoAlpha: 1,
    scaleX: 1,
    transformOrigin: "0% 50%",
  });
}

function getHeroEntranceElements(scope: ParentNode) {
  const heroCopy = queryOne<HTMLElement>(scope, "[data-motion-hero-copy]");
  const heroTitleLines = queryAll<HTMLElement>(scope, "[data-motion-hero-line]");
  const heroCaption = queryOne<HTMLElement>(scope, "[data-motion-hero-copy] > p");

  return {
    heroCaption,
    heroCopy,
    heroTitleLines,
  };
}

function setHeroEntranceStartState(scope: ParentNode) {
  const { heroCaption, heroCopy, heroTitleLines } = getHeroEntranceElements(scope);

  if (!heroCopy || !heroTitleLines.length) {
    return false;
  }

  const targets = [
    heroCopy,
    ...heroTitleLines,
    ...(heroCaption ? [heroCaption] : []),
  ];

  gsap.killTweensOf(targets);
  gsap.set(heroCopy, { autoAlpha: 1, y: 0 });
  gsap.set(heroTitleLines, {
    autoAlpha: 0,
    y: (index) => (index === 0 ? 22 : 54),
  });
  if (heroCaption) {
    gsap.set(heroCaption, {
      autoAlpha: 0,
      y: 28,
    });
  }

  return true;
}

function setHeroEntranceFinalState(scope: ParentNode) {
  const { heroCaption, heroCopy, heroTitleLines } = getHeroEntranceElements(scope);

  if (heroCopy) {
    gsap.set(heroCopy, { autoAlpha: 1, y: 0 });
  }
  if (heroTitleLines.length) {
    gsap.set(heroTitleLines, { autoAlpha: 1, y: 0 });
  }
  if (heroCaption) {
    gsap.set(heroCaption, { autoAlpha: 1, y: 0 });
  }
}

function setHeroFlowersFinalState(scope: ParentNode) {
  queryAll<HTMLElement>(scope, "[data-motion-flower]").forEach((flower, index) => {
    const morphPath = queryOne<SVGPathElement>(flower, "[data-flower-morph-path]");
    const visibleAlpha = index > 2 ? 0.68 : 0.82;

    gsap.killTweensOf(flower);
    gsap.set(flower, {
      autoAlpha: visibleAlpha,
      clearProps: "x,y,scale,rotate,transform",
    });

    if (!morphPath?.dataset.openPath) {
      return;
    }

    gsap.killTweensOf(morphPath);
    morphPath.setAttribute("d", morphPath.dataset.openPath);
    gsap.set(morphPath, {
      clearProps: "strokeDasharray,strokeDashoffset",
    });
  });
}

function animateHeroFlowers(withEntrance: boolean, scope: ParentNode) {
  queryAll<HTMLElement>(scope, "[data-motion-flower]").forEach((flower, index) => {
    const morphPath = queryOne<SVGPathElement>(flower, "[data-flower-morph-path]");
    const delay = index * 0.72;
    const rotation = index % 2 === 0 ? 5 : -6;
    const travelY = index % 2 === 0 ? -12 : 10;
    const travelX = index % 3 === 0 ? 9 : -7;
    const visibleAlpha = index > 2 ? 0.68 : 0.82;

    if (!morphPath?.dataset.foldedPath || !morphPath.dataset.openPath) {
      return;
    }

    const foldedPoints = samplePath(morphPath.dataset.foldedPath, morphPointCount, true);
    const openPoints = samplePath(morphPath.dataset.openPath, morphPointCount, false);
    const morphState = { progress: 0 };

    morphPath.setAttribute("d", pointsToPath(foldedPoints));

    if (withEntrance) {
      const drawLength = morphPath.getTotalLength();

      gsap.set(morphPath, {
        strokeDasharray: drawLength,
        strokeDashoffset: drawLength,
      });

      gsap.to(morphPath, {
        strokeDashoffset: 0,
        duration: 1.15,
        delay: delay * 0.45,
        ease: "power2.out",
        onComplete: () => {
          gsap.set(morphPath, { clearProps: "strokeDasharray,strokeDashoffset" });
        },
      });

      gsap.fromTo(flower, {
        autoAlpha: 0,
        scale: 0.94,
        rotate: rotation,
      }, {
        autoAlpha: visibleAlpha,
        scale: 1,
        rotate: rotation * -0.35,
        duration: 1.15,
        delay,
        ease: "power3.out",
      });
    } else {
      gsap.set(morphPath, {
        clearProps: "strokeDasharray,strokeDashoffset",
      });
      gsap.set(flower, {
        autoAlpha: visibleAlpha,
        scale: 1,
        rotate: rotation * -0.35,
      });
    }

    gsap
      .timeline({
        repeat: -1,
        yoyo: true,
        repeatDelay: 2.4 + index * 0.22,
        delay: withEntrance ? delay + 0.35 : index * 0.12,
      })
      .to(morphState, {
        progress: 1,
        duration: 1.7,
        ease: "power2.inOut",
        onUpdate: () => {
          morphPath.setAttribute(
            "d",
            pointsToPath(blendPoints(foldedPoints, openPoints, morphState.progress)),
          );
        },
      }, 0)
      .to(flower, {
        y: travelY,
        x: travelX,
        rotate: rotation * 0.9,
        scale: index % 2 === 0 ? 1.03 : 0.97,
        duration: 2.8,
        ease: "sine.inOut",
      }, 1.1);
  });
}

export default function MotionOrchestrator() {
  const pathname = usePathname();
  const routeKey = getLocaleFromPathname(pathname);

  useLayoutEffect(() => {
    const root = findMotionRoot(routeKey);

    if (!isConnectedElement(root)) {
      return;
    }

    const reduceMotion = window.matchMedia(reduceMotionQuery).matches;
    const restoringHomePage = isRestoringHomePage();

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (restoringHomePage) {
      setHomeToRestoredFinalState(root);
    } else if (!reduceMotion) {
      setHeroEntranceStartState(root);
    }

    if (reduceMotion) {
      gsap.set(queryAll<HTMLElement>(root, "[data-motion]"), {
        autoAlpha: 1,
        clearProps: "clipPath,transform,opacity,visibility",
      });
      queryAll<SVGPathElement>(root, "[data-flower-morph-path]").forEach((path) => {
        if (!path.dataset.foldedPath) {
          return;
        }

        path.setAttribute(
          "d",
          pointsToPath(samplePath(path.dataset.foldedPath, morphPointCount, true)),
        );
      });
      gsap.set(queryAll<HTMLElement>(root, "[data-motion-flower], [data-motion-flower] *"), {
        autoAlpha: 1,
        clearProps: "transform,opacity,visibility",
      });
      setHeroEntranceFinalState(root);
      markHomeMotionReady(routeKey);
      return;
    }

    ScrollTrigger.config({
      ignoreMobileResize: true,
    });

    let disposed = false;
    const frameIds: number[] = [];
    let context: ReturnType<typeof gsap.context> | null = null;
    let ownedTriggers: ScrollTrigger[] = [];

    const scheduleFrame = (callback: FrameRequestCallback) => {
      const frameId = window.requestAnimationFrame(callback);
      frameIds.push(frameId);
    };

    const initializeMotion = () => {
      if (disposed || !isConnectedElement(root)) {
        return;
      }

      const previousTriggers = new Set(ScrollTrigger.getAll());

      try {
        context = gsap.context(() => {
        let heroScrollSceneCreated = false;
        const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;

      const createHeroScrollScene = () => {
        if (heroScrollSceneCreated) {
          return;
        }

        const hero = queryOne<HTMLElement>(root, "[data-motion-hero]");
        const heroStage = queryOne<HTMLElement>(root, "[data-motion-hero-stage]");
        const yellowLayer = queryOne<HTMLElement>(root, "[data-motion-yellow-layer]");
        const desktopMenu = queryOne<HTMLElement>(root, "[data-desktop-menu-surface]");

        if (!hero || !heroStage || !yellowLayer) {
          return;
        }

        heroScrollSceneCreated = true;
        const shouldAnimateDesktopMenu =
          Boolean(desktopMenu) && window.matchMedia("(min-width: 1024px)").matches;
        const desktopMenuContent = desktopMenu
          ? queryAll<HTMLElement>(
              desktopMenu,
              "[data-desktop-menu-brand], [data-desktop-menu-link], [data-desktop-menu-cta]",
            )
          : [];
        const getHeroPinStart = () => {
          if (!isMobileViewport) {
            return "top top";
          }

          const stageTop = parseFloat(window.getComputedStyle(heroStage).top);
          return Number.isFinite(stageTop) ? `top top+=${stageTop}` : "top top";
        };
        const getHeroScrollDistance = () => {
          if (!isMobileViewport) {
            return window.innerHeight;
          }

          return heroStage.getBoundingClientRect().height;
        };

        gsap.set(yellowLayer, {
          clipPath: "inset(0% 0% 0% 0%)",
        });

        if (shouldAnimateDesktopMenu && desktopMenu) {
          gsap.set(desktopMenu, {
            autoAlpha: 0,
            pointerEvents: "none",
            y: -18,
            scaleX: 0.42,
            scaleY: 0.18,
            clipPath: "inset(42% 0% 42% 0% round 6px)",
            backgroundColor: "#fffb12",
            borderColor: "rgba(20, 23, 20, 0)",
            boxShadow: "0 0 0 rgba(20, 23, 20, 0)",
            transformOrigin: "50% 0%",
          });
          gsap.set(desktopMenuContent, {
            autoAlpha: 0,
            y: -4,
          });
        }

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: hero,
            start: getHeroPinStart,
            end: () => `+=${getHeroScrollDistance()}`,
            pin: isMobileViewport ? heroStage : false,
            pinSpacing: false,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });

        timeline.to(yellowLayer, {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 1,
          ease: "none",
        }, 0);

        if (shouldAnimateDesktopMenu && desktopMenu) {
          timeline
            .to(desktopMenu, {
              autoAlpha: 1,
              y: -6,
              scaleX: 0.86,
              scaleY: 0.22,
              duration: 0.08,
              ease: "none",
            }, 0.72)
            .to(desktopMenu, {
              y: 0,
              scaleX: 1,
              scaleY: 1,
              clipPath: "inset(0% 0% 0% 0% round 6px)",
              backgroundColor: "rgba(244, 244, 239, 0.76)",
              borderColor: "rgba(20, 23, 20, 0.16)",
              boxShadow: "0 18px 42px rgba(20, 23, 20, 0.08)",
              duration: 0.18,
              ease: "none",
            }, 0.8)
            .to(desktopMenuContent, {
              autoAlpha: 1,
              y: 0,
              duration: 0.08,
              stagger: 0.004,
              ease: "none",
            }, 0.9)
            .set(desktopMenu, {
              pointerEvents: "auto",
            }, 0.98);
        }
      };

      const runHeroEntrance = () => {
        const { heroCaption, heroCopy, heroTitleLines } = getHeroEntranceElements(root);

        if (!heroCopy || !heroTitleLines.length) {
          return;
        }

        setHeroEntranceStartState(root);

        const timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            setHeroEntranceFinalState(root);
          },
        });

        timeline
          .to(heroTitleLines[0], {
            autoAlpha: 1,
            y: 0,
            duration: 1.05,
          }, 0.08)
          .to(heroTitleLines.slice(1), {
            autoAlpha: 1,
            y: 0,
            duration: 0.95,
            stagger: 0.12,
          }, 0.42);

        if (heroCaption) {
          timeline.to(heroCaption, {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
          }, 0.86);
        }
      };

        if (restoringHomePage) {
          setHeroEntranceFinalState(root);
          animateHeroFlowers(false, root);
          createHeroScrollScene();
          ScrollTrigger.refresh();
          markHomeMotionReady(routeKey);
          return;
        }

        runHeroEntrance();
        animateHeroFlowers(true, root);
        markHomeMotionReady(routeKey);

        createHeroScrollScene();

        if (isMobileViewport) {
          setMobileContentToFinalState(root);
          ScrollTrigger.refresh();
          return;
        }

      const animateCases = () => {
        queryAll<HTMLElement>(root, "[data-motion-preset='cases']").forEach((section) => {
          const headerItems = queryAll<HTMLElement>(section, "[data-motion='reveal']");
          const cards = queryAll<HTMLElement>(section, "[data-motion-case-card]");

          if (restoringHomePage) {
            const media = cards
              .map((card) => queryOne<HTMLElement>(card, "[data-motion-case-media]"))
              .filter(isConnectedElement);
            const captions = cards.flatMap((card) =>
              queryAll<HTMLElement>(card, "[data-case-caption]"),
            );

            gsap.set([...headerItems, ...cards, ...media, ...captions], {
              clearProps: "visibility,opacity,transform,filter,clipPath,scale",
            });
            return;
          }

          if (hasTargets(headerItems)) {
            gsap.fromTo(
              headerItems,
              { autoAlpha: 0, y: 34, skewY: 1.5 },
              {
                autoAlpha: 1,
                y: 0,
                skewY: 0,
                duration: 1.05,
                ease: "power3.out",
                stagger: 0.1,
                scrollTrigger: {
                  trigger: section,
                  start: "top 72%",
                  once: true,
                },
              },
            );
          }

          cards.forEach((card, index) => {
            const media = queryOne<HTMLElement>(card, "[data-motion-case-media]");
            const caption = queryAll<HTMLElement>(card, "[data-case-caption]");
            const fromClip =
              index % 3 === 0
                ? "inset(0% 100% 0% 0%)"
                : index % 3 === 1
                  ? "inset(16% 0% 0% 0%)"
                  : "inset(0% 0% 100% 0%)";

            if (!media) {
              return;
            }

            gsap.fromTo(
              media,
              { autoAlpha: 0, clipPath: fromClip, scale: 1.035 },
              {
                autoAlpha: 1,
                clipPath: "inset(0% 0% 0% 0%)",
                scale: 1,
                duration: 1.2,
                ease: "power3.out",
                scrollTrigger: {
                  trigger: card,
                  start: "top 80%",
                  once: true,
                },
              },
            );

            if (hasTargets(caption)) {
              gsap.fromTo(
                caption,
                { autoAlpha: 0, y: 18 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.85,
                  delay: 0.16,
                  ease: "power3.out",
                  stagger: 0.06,
                  scrollTrigger: {
                    trigger: card,
                    start: "top 80%",
                    once: true,
                  },
                },
              );
            }
          });
        });
      };

      const animateServices = () => {
        queryAll<HTMLElement>(root, "[data-motion-preset='services']").forEach((section) => {
          const headerItems = queryAll<HTMLElement>(section, "[data-motion='reveal']");

          if (hasTargets(headerItems)) {
            gsap.fromTo(
              headerItems,
              { autoAlpha: 0, y: 28 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
                stagger: 0.1,
                scrollTrigger: {
                  trigger: section,
                  start: "top 72%",
                  once: true,
                },
              },
            );
          }

          queryAll<HTMLElement>(section, "[data-motion-service-row]").forEach((row) => {
            const title = queryOne<HTMLElement>(row, "[data-motion-service-title]");
            const index = queryOne<HTMLElement>(row, "[data-motion-service-index]");
            const line = queryOne<HTMLElement>(row, "[data-motion='line']");
            const body = queryOne<HTMLElement>(row, "[data-motion-service-body]");

            const timeline = gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                trigger: row,
                start: "top 78%",
                once: true,
              },
            });

            if (title) {
              timeline.fromTo(title, { autoAlpha: 0, x: -34 }, { autoAlpha: 1, x: 0, duration: 0.95 }, 0);
            }

            if (index) {
              timeline.fromTo(index, { autoAlpha: 0, x: 34 }, { autoAlpha: 1, x: 0, duration: 0.95 }, 0.05);
            }

            if (line) {
              timeline.fromTo(line, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.9 }, 0.18);
            }

            if (body) {
              timeline.fromTo(body, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.32);
            }
          });
        });
      };

      const animateProcess = () => {
        queryAll<HTMLElement>(root, "[data-motion-preset='process']").forEach((section) => {
          const headerItems = queryAll<HTMLElement>(section, "[data-motion='reveal']");
          const steps = queryAll<HTMLElement>(section, "[data-motion-process-step]");

          if (isMobileViewport) {
            const processElements = queryAll<HTMLElement>(
              section,
              "[data-motion='reveal'], [data-motion-process-step], [data-motion-process-meta], [data-motion-process-content], li",
            );
            const processLines = queryAll<HTMLElement>(section, "[data-motion='line']");

            gsap.set(processElements, {
              autoAlpha: 1,
              clearProps: "transform,filter,willChange",
            });
            gsap.set(processLines, {
              autoAlpha: 1,
              scaleX: 1,
              transformOrigin: "0% 50%",
            });
            return;
          }

          if (hasTargets(headerItems)) {
            gsap.fromTo(
              headerItems,
              { autoAlpha: 0, y: 30 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
                stagger: 0.1,
                scrollTrigger: {
                  trigger: section,
                  start: "top 74%",
                  once: true,
                },
              },
            );
          }

          steps.forEach((step) => {
            const meta = queryOne<HTMLElement>(step, "[data-motion-process-meta]");
            const line = queryOne<HTMLElement>(step, "[data-motion='line']");
            const content = queryOne<HTMLElement>(step, "[data-motion-process-content]");
            const detailItems = queryAll<HTMLElement>(step, "li");

            if (!meta && !line && !content && !detailItems.length) {
              return;
            }

            const timeline = gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                trigger: step,
                start: "top 76%",
                once: true,
              },
            });

            if (meta) {
              timeline.fromTo(meta, { autoAlpha: 0, x: -22 }, { autoAlpha: 1, x: 0, duration: 0.75 }, 0);
            }

            if (line) {
              timeline.fromTo(line, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.85 }, 0.1);
            }

            if (content) {
              timeline.fromTo(content, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.95 }, 0.18);
            }

            if (hasTargets(detailItems)) {
              timeline.fromTo(detailItems, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05 }, 0.48);
            }
          });
        });
      };

      const animateTeam = () => {
        queryAll<HTMLElement>(root, "[data-motion-preset='team']").forEach((section) => {
          const revealItems = queryAll<HTMLElement>(section, "[data-motion='reveal']");
          const cards = queryAll<HTMLElement>(section, "[data-motion-team-card]");

          if (hasTargets(revealItems)) {
            gsap.fromTo(
              revealItems,
              { autoAlpha: 0, y: 28 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
                stagger: 0.1,
                scrollTrigger: {
                  trigger: section,
                  start: "top 74%",
                  once: true,
                },
              },
            );
          }

          if (hasTargets(cards)) {
            gsap.fromTo(
              cards,
              { autoAlpha: 0, y: 32 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.95,
                ease: "power3.out",
                stagger: 0.08,
                scrollTrigger: {
                  trigger: cards[0] ?? section,
                  start: "top 80%",
                  once: true,
                },
              },
            );
          }

          const mediaItems = queryAll<HTMLElement>(section, "[data-motion-team-media]");

          if (hasTargets(mediaItems)) {
            gsap.fromTo(
              mediaItems,
              { clipPath: "inset(14% 0% 0% 0%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                duration: 1.05,
                ease: "power3.out",
                stagger: 0.08,
                scrollTrigger: {
                  trigger: cards[0] ?? section,
                  start: "top 80%",
                  once: true,
                },
              },
            );
          }
        });
      };

      const animateForm = () => {
        queryAll<HTMLElement>(root, "[data-motion-preset='form']").forEach((section) => {
          const headingItems = queryAll<HTMLElement>(section, "[data-motion='reveal']");
          const formItems = queryAll<HTMLElement>(section, "[data-motion-form-item]");

          if (hasTargets(headingItems)) {
            gsap.fromTo(
              headingItems,
              { autoAlpha: 0, y: 30 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                ease: "power3.out",
                stagger: 0.09,
                scrollTrigger: {
                  trigger: section,
                  start: "top 72%",
                  once: true,
                },
              },
            );
          }

          if (hasTargets(formItems)) {
            gsap.fromTo(
              formItems,
              { autoAlpha: 0, y: 24 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.9,
                ease: "power3.out",
                stagger: 0.08,
                scrollTrigger: {
                  trigger: formItems[0] ?? section,
                  start: "top 82%",
                  once: true,
                },
              },
            );
          }
        });
      };

      animateCases();
      animateServices();
      animateProcess();
      animateTeam();
      animateForm();

      queryAll<HTMLElement>(root, "[data-motion-section]").forEach((section) => {
        if (section.dataset.motionPreset) {
          return;
        }

        const items = queryAll<HTMLElement>(section, "[data-motion='reveal']");

        if (!items.length) {
          return;
        }

        gsap.fromTo(
          items,
          {
            autoAlpha: 0,
            y: 26,
          },
          {
            autoAlpha: 1,
            y: 0,
            duration: 1.15,
            ease: "power3.out",
            stagger: 0.09,
            clearProps: "clipPath",
            scrollTrigger: {
              trigger: section,
              start: "top 74%",
              once: true,
            },
          },
        );
      });

      queryAll<HTMLElement>(root, "[data-motion='media']").forEach((media) => {
        if (media.closest("[data-motion-preset]")) {
          return;
        }

        gsap.fromTo(
          media,
          {
            autoAlpha: 0,
            clipPath: "inset(18% 0 0 0)",
          },
          {
            autoAlpha: 1,
            clipPath: "inset(0% 0 0 0)",
            duration: 1.25,
            ease: "power3.out",
            scrollTrigger: {
              trigger: media,
              start: "top 82%",
              once: true,
            },
          },
        );
      });

      queryAll<HTMLElement>(root, "[data-motion='line']").forEach((line) => {
        if (line.closest("[data-motion-preset]")) {
          return;
        }

        gsap.fromTo(
          line,
          { scaleX: 0, transformOrigin: "0% 50%" },
          {
            scaleX: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: line,
              start: "top 86%",
              once: true,
            },
          },
        );
      });

      queryAll<HTMLElement>(root, "[data-motion-stack]").forEach((section, index) => {
        if (section.matches("[data-motion-preset='cases']")) {
          return;
        }

        gsap.set(section, { zIndex: 10 + index });

        gsap.fromTo(
          section,
          { y: 34 },
          {
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top 30%",
              scrub: 1,
            },
          },
        );
      });

        }, root);
      } catch {
        setHeroEntranceFinalState(root);
        setHeroFlowersFinalState(root);
        markHomeMotionReady(routeKey);
      }

      ownedTriggers = ScrollTrigger.getAll().filter((trigger) => !previousTriggers.has(trigger));
      ScrollTrigger.refresh();
    };

    scheduleFrame(() => {
      scheduleFrame(initializeMotion);
    });

    return () => {
      disposed = true;
      frameIds.forEach((frameId) => {
        window.cancelAnimationFrame(frameId);
      });
      context?.revert();
      ownedTriggers.forEach((trigger) => trigger.kill());
    };
  }, [routeKey]);

  return null;
}
