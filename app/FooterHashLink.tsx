"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useCaseTransition } from "./CaseTransitionProvider";
import { getHomePath, getLocaleFromPathname, getLocalizedHashHref } from "./i18n";

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
  const pathname = usePathname();
  const { navigateHomeAnchor } = useCaseTransition();
  const locale = getLocaleFromPathname(pathname);
  const homePath = getHomePath(locale);
  const localizedHref = getLocalizedHashHref(href, locale);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (shouldLetBrowserHandle(event)) {
      return;
    }

    if (pathname !== homePath) {
      event.preventDefault();
      navigateHomeAnchor(href);
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
    <Link className={className} href={localizedHref} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
