"use client";

import Link from "next/link";
import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { CaseStudy } from "./caseData";
import { useCaseTransition } from "./CaseTransitionProvider";

export default function CaseBackLink({ caseStudy }: { caseStudy: CaseStudy }) {
  const { closeCase } = useCaseTransition();
  const pointerHandledRef = useRef(false);

  const canHandleMouseEvent = (event: MouseEvent<HTMLAnchorElement>) => (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
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
    pointerHandledRef.current = true;
    closeCase(caseStudy);
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!canHandleMouseEvent(event)) {
      return;
    }

    event.preventDefault();

    if (pointerHandledRef.current) {
      pointerHandledRef.current = false;
      return;
    }

    closeCase(caseStudy);
  };

  return (
    <Link data-case-back href="/#work" onClick={handleClick} onPointerDown={handlePointerDown}>
      Back to cases
    </Link>
  );
}
