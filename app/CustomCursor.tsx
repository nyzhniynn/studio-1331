"use client";

import { useEffect, useRef } from "react";

const interactiveSelector =
  "a, button, input, textarea, select, label, [role='button'], [tabindex]:not([tabindex='-1'])";
const lightCursorSurfaceSelector = ".site-footer, [data-cursor-theme='light']";

function isInNativeScrollbarGutter(event: PointerEvent) {
  const root = document.documentElement;

  return event.clientX >= root.clientWidth || event.clientY >= root.clientHeight;
}

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
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
      cursor.style.backgroundColor = "transparent";
      cursor.style.color = color;
    };

    const render = () => {
      currentX += (targetX - currentX) * 0.28;
      currentY += (targetY - currentY) * 0.28;

      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-2px, -2px)`;
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
      if (isInNativeScrollbarGutter(event)) {
        visible = false;
        cursor.dataset.cursorVisible = "false";
        cursor.dataset.cursorState = "idle";
        document.documentElement.dataset.nativeCursor = "true";
        return;
      }

      delete document.documentElement.dataset.nativeCursor;
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
      delete document.documentElement.dataset.nativeCursor;
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
      delete document.documentElement.dataset.nativeCursor;
    };
  }, []);

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      <svg className="custom-cursor__arrow" viewBox="0 0 48 48" focusable="false">
        <path d="M4.24 3.23C2.29 1.91-.21 3.87.55 6.13L14.1 45.5c.9 2.62 4.58 2.69 5.58.11l5.97-15.41c.34-.88 1.04-1.58 1.92-1.92l15.62-6.06c2.55-.99 2.52-4.61-.05-5.55L4.24 3.23Z" />
      </svg>
    </div>
  );
}
