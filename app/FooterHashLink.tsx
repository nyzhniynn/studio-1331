"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type FooterHashLinkProps = {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  href: `/#${string}`;
};

function shouldLetBrowserHandle(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export default function FooterHashLink({
  children,
  className,
  href,
  ...props
}: FooterHashLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (shouldLetBrowserHandle(event) || window.location.pathname !== "/") {
      return;
    }

    const targetId = decodeURIComponent(href.slice(2));
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    event.preventDefault();

    if (window.location.hash !== `#${targetId}`) {
      window.history.pushState(null, "", `#${targetId}`);
    }

    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <Link className={className} href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
