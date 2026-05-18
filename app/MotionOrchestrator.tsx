"use client";

import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
const restoreHomeScrollKey = "studio-1331:restore-home-scroll";
const morphPointCount = 72;

type Point = {
  x: number;
  y: number;
};

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

function setHomeToRestoredFinalState() {
  const finalElements = gsap.utils.toArray<HTMLElement>([
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
  const clippedElements = gsap.utils.toArray<HTMLElement>([
    "[data-motion='media']",
    "[data-motion-case-media]",
    "[data-motion-team-media]",
  ].join(", "));

  gsap.killTweensOf(finalElements);
  gsap.set(finalElements, {
    autoAlpha: 1,
    clearProps: "transform,filter,willChange",
  });
  gsap.set(clippedElements, {
    clipPath: "inset(0% 0% 0% 0%)",
  });
  gsap.set("[data-motion='line']", {
    scaleX: 1,
    transformOrigin: "0% 50%",
  });
  gsap.set("[data-motion-yellow-layer]", {
    clipPath: "inset(0% 0% 100% 0%)",
  });
}

function animateHeroFlowers(withEntrance: boolean) {
  gsap.utils.toArray<HTMLElement>("[data-motion-flower]").forEach((flower, index) => {
    const morphPath = flower.querySelector<SVGPathElement>("[data-flower-morph-path]");
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
  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia(reduceMotionQuery).matches;
    const restoringHomePage = isRestoringHomePage();

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    if (restoringHomePage) {
      setHomeToRestoredFinalState();
    }

    if (reduceMotion) {
        gsap.set("[data-motion]", {
          autoAlpha: 1,
          clearProps: "clipPath,transform,opacity,visibility",
        });
      gsap.utils.toArray<SVGPathElement>("[data-flower-morph-path]").forEach((path) => {
        if (!path.dataset.foldedPath) {
          return;
        }

        path.setAttribute(
          "d",
          pointsToPath(samplePath(path.dataset.foldedPath, morphPointCount, true)),
        );
      });
      gsap.set("[data-motion-flower], [data-motion-flower] *", {
        autoAlpha: 1,
        clearProps: "transform,opacity,visibility",
      });
      return;
    }

    ScrollTrigger.config({
      ignoreMobileResize: true,
    });

    const context = gsap.context(() => {
      let heroScrollSceneCreated = false;

      const createHeroScrollScene = () => {
        if (heroScrollSceneCreated) {
          return;
        }

        const hero = document.querySelector<HTMLElement>("[data-motion-hero]");
        const heroStage = document.querySelector<HTMLElement>("[data-motion-hero-stage]");
        const yellowLayer = document.querySelector<HTMLElement>("[data-motion-yellow-layer]");
        const desktopMenu = document.querySelector<HTMLElement>("[data-desktop-menu-surface]");

        if (!hero || !heroStage || !yellowLayer) {
          return;
        }

        heroScrollSceneCreated = true;
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const shouldAnimateDesktopMenu =
          Boolean(desktopMenu) && window.matchMedia("(min-width: 1024px)").matches;
        const desktopMenuContent = desktopMenu
          ? gsap.utils.toArray<HTMLElement>(
              desktopMenu.querySelectorAll(
                "[data-desktop-menu-brand], [data-desktop-menu-link], [data-desktop-menu-cta]",
              ),
            )
          : [];
        const getHeroPinStart = () => {
          if (!isMobile) {
            return "top top";
          }

          const stageTop = parseFloat(window.getComputedStyle(heroStage).top);
          return Number.isFinite(stageTop) ? `top top+=${stageTop}` : "top top";
        };
        const getHeroScrollDistance = () => {
          if (!isMobile) {
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
            pin: isMobile ? heroStage : false,
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
        const heroCopy = document.querySelector<HTMLElement>("[data-motion-hero-copy]");
        const heroTitleLines = gsap.utils.toArray<HTMLElement>("[data-motion-hero-line]");
        const heroCaption = document.querySelector<HTMLElement>("[data-motion-hero-copy] > p");

        if (!heroCopy || !heroTitleLines.length) {
          return;
        }

        gsap.set(heroCopy, { autoAlpha: 1, y: 0 });
        gsap.set(heroTitleLines, {
          autoAlpha: 0,
          y: (index) => (index === 0 ? 22 : 54),
        });
        gsap.set(heroCaption, {
          autoAlpha: 0,
          y: 28,
        });

        gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            gsap.set(heroCopy, { autoAlpha: 1, y: 0 });
            gsap.set(heroTitleLines, { autoAlpha: 1, y: 0 });
            gsap.set(heroCaption, { autoAlpha: 1, y: 0 });
          },
        })
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
          }, 0.42)
          .to(heroCaption, {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
          }, 0.86);
      };

      createHeroScrollScene();

      if (restoringHomePage) {
        animateHeroFlowers(false);
        ScrollTrigger.refresh();
        return;
      }

      runHeroEntrance();

      const animateCases = () => {
        gsap.utils.toArray<HTMLElement>("[data-motion-preset='cases']").forEach((section) => {
          const headerItems = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion='reveal']"));
          const cards = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion-case-card]"));

          if (restoringHomePage) {
            const media = cards
              .map((card) => card.querySelector<HTMLElement>("[data-motion-case-media]"))
              .filter(Boolean) as HTMLElement[];
            const captions = cards.flatMap((card) =>
              gsap.utils.toArray<HTMLElement>(card.querySelectorAll("[data-case-caption]")),
            );

            gsap.set([...headerItems, ...cards, ...media, ...captions], {
              clearProps: "visibility,opacity,transform,filter,clipPath,scale",
            });
            return;
          }

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

          cards.forEach((card, index) => {
            const media = card.querySelector<HTMLElement>("[data-motion-case-media]");
            const caption = gsap.utils.toArray<HTMLElement>(card.querySelectorAll("[data-case-caption]"));
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
          });
        });
      };

      const animateServices = () => {
        gsap.utils.toArray<HTMLElement>("[data-motion-preset='services']").forEach((section) => {
          const headerItems = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion='reveal']"));

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

          gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion-service-row]")).forEach((row) => {
            const title = row.querySelector<HTMLElement>("[data-motion-service-title]");
            const index = row.querySelector<HTMLElement>("[data-motion-service-index]");
            const line = row.querySelector<HTMLElement>("[data-motion='line']");
            const body = row.querySelector<HTMLElement>("[data-motion-service-body]");

            gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                trigger: row,
                start: "top 78%",
                once: true,
              },
            })
              .fromTo(title, { autoAlpha: 0, x: -34 }, { autoAlpha: 1, x: 0, duration: 0.95 }, 0)
              .fromTo(index, { autoAlpha: 0, x: 34 }, { autoAlpha: 1, x: 0, duration: 0.95 }, 0.05)
              .fromTo(line, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.9 }, 0.18)
              .fromTo(body, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 0.32);
          });
        });
      };

      const animateProcess = () => {
        gsap.utils.toArray<HTMLElement>("[data-motion-preset='process']").forEach((section) => {
          const headerItems = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion='reveal']"));

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

          gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion-process-step]")).forEach((step) => {
            const meta = step.querySelector<HTMLElement>("[data-motion-process-meta]");
            const line = step.querySelector<HTMLElement>("[data-motion='line']");
            const content = step.querySelector<HTMLElement>("[data-motion-process-content]");
            const detailItems = gsap.utils.toArray<HTMLElement>(step.querySelectorAll("li"));

            gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: {
                trigger: step,
                start: "top 76%",
                once: true,
              },
            })
              .fromTo(meta, { autoAlpha: 0, x: -22 }, { autoAlpha: 1, x: 0, duration: 0.75 }, 0)
              .fromTo(line, { scaleX: 0, transformOrigin: "0% 50%" }, { scaleX: 1, duration: 0.85 }, 0.1)
              .fromTo(content, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.95 }, 0.18)
              .fromTo(detailItems, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.05 }, 0.48);
          });
        });
      };

      const animateTeam = () => {
        gsap.utils.toArray<HTMLElement>("[data-motion-preset='team']").forEach((section) => {
          const revealItems = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion='reveal']"));
          const cards = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion-team-card]"));

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

          gsap.fromTo(
            section.querySelectorAll("[data-motion-team-media]"),
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
        });
      };

      const animateForm = () => {
        gsap.utils.toArray<HTMLElement>("[data-motion-preset='form']").forEach((section) => {
          const headingItems = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion='reveal']"));
          const formItems = gsap.utils.toArray<HTMLElement>(section.querySelectorAll("[data-motion-form-item]"));

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
        });
      };

      animateCases();
      animateServices();
      animateProcess();
      animateTeam();
      animateForm();

      animateHeroFlowers(true);

      gsap.utils.toArray<HTMLElement>("[data-motion-section]").forEach((section) => {
        if (section.dataset.motionPreset) {
          return;
        }

        const items = section.querySelectorAll<HTMLElement>("[data-motion='reveal']");

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

      gsap.utils.toArray<HTMLElement>("[data-motion='media']").forEach((media) => {
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

      gsap.utils.toArray<HTMLElement>("[data-motion='line']").forEach((line) => {
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

      gsap.utils.toArray<HTMLElement>("[data-motion-stack]").forEach((section, index) => {
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

    });

    return () => {
      context.revert();
    };
  }, []);

  return null;
}
