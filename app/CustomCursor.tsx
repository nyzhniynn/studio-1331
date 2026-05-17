"use client";

import { useEffect, useRef } from "react";

const interactiveSelector =
  "a, button, input, textarea, select, label, [role='button'], [tabindex]:not([tabindex='-1'])";
const lightCursorSurfaceSelector = ".site-footer, [data-cursor-theme='light']";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorDot = cursor?.querySelector<HTMLElement>(".custom-cursor__dot");

    if (!cursor || window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let animationFrame = 0;
    let visible = false;
    let isInteractive = false;
    let isLightTheme = false;
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;
    let targetX = currentX;
    let targetY = currentY;

    const applyCursorPaint = () => {
      const color = isLightTheme ? "#f4f4ef" : "#141714";

      cursor.style.borderColor = color;
      cursor.style.backgroundColor = isInteractive ? "transparent" : color;

      if (cursorDot) {
        cursorDot.style.backgroundColor = color;
      }
    };

    const render = () => {
      currentX += (targetX - currentX) * 0.28;
      currentY += (targetY - currentY) * 0.28;

      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      animationFrame = window.requestAnimationFrame(render);
    };

    const setInteractive = (target: EventTarget | null) => {
      const nextInteractive =
        target instanceof Element && Boolean(target.closest(interactiveSelector));

      if (nextInteractive === isInteractive) {
        return;
      }

      isInteractive = nextInteractive;
      cursor.dataset.cursorState = isInteractive ? "active" : "idle";
      applyCursorPaint();
    };

    const setTheme = (target: EventTarget | null) => {
      const nextLightTheme =
        target instanceof Element && Boolean(target.closest(lightCursorSurfaceSelector));

      if (nextLightTheme === isLightTheme) {
        return;
      }

      isLightTheme = nextLightTheme;
      cursor.dataset.cursorTheme = isLightTheme ? "light" : "dark";
      applyCursorPaint();
    };

    const syncThemeAtCurrentPoint = () => {
      setTheme(document.elementFromPoint(targetX, targetY));
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;

      if (!visible) {
        visible = true;
        currentX = targetX;
        currentY = targetY;
        cursor.dataset.cursorVisible = "true";
      }

      setInteractive(event.target);
      setTheme(event.target);
    };

    const handlePointerLeave = () => {
      visible = false;
      cursor.dataset.cursorVisible = "false";
      cursor.dataset.cursorState = "idle";
      cursor.dataset.cursorTheme = "dark";
      isLightTheme = false;
      applyCursorPaint();
    };

    const handlePointerDown = () => {
      cursor.dataset.cursorPressed = "true";
    };

    const handlePointerUp = () => {
      cursor.dataset.cursorPressed = "false";
    };

    cursor.dataset.cursorState = "idle";
    cursor.dataset.cursorVisible = "false";
    cursor.dataset.cursorPressed = "false";
    cursor.dataset.cursorTheme = "dark";
    applyCursorPaint();
    animationFrame = window.requestAnimationFrame(render);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("scroll", syncThemeAtCurrentPoint, { passive: true });
    window.addEventListener("resize", syncThemeAtCurrentPoint);
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", syncThemeAtCurrentPoint);
      window.removeEventListener("resize", syncThemeAtCurrentPoint);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      <span className="custom-cursor__dot" />
    </div>
  );
}
