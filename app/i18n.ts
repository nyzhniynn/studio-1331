export const locales = ["en", "ru"] as const;
export const defaultLocale = "en";

export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getLocaleFromPathname(pathname: string): Locale {
  return pathname === "/ru" || pathname.startsWith("/ru/") ? "ru" : defaultLocale;
}

export function stripLocaleFromPathname(pathname: string) {
  if (pathname === "/ru") {
    return "/";
  }

  if (pathname.startsWith("/ru/")) {
    return pathname.slice(3) || "/";
  }

  return pathname || "/";
}

export function addLocaleToPathname(pathname: string, locale: Locale) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;

  if (locale === defaultLocale) {
    return normalizedPathname === "/ru" ? "/" : normalizedPathname;
  }

  return normalizedPathname === "/" ? "/ru" : `/ru${normalizedPathname}`;
}

export function getHomePath(locale: Locale) {
  return addLocaleToPathname("/", locale);
}

export function getCasePath(slug: string, locale: Locale) {
  return addLocaleToPathname(`/cases/${slug}`, locale);
}

export function getPathnameFromHref(href: string) {
  const [pathname] = href.split("#");

  return pathname || "/";
}

export function getLocalizedHashHref(hashHref: `/#${string}`, locale: Locale) {
  return `${getHomePath(locale)}${hashHref.slice(1)}` as const;
}

export function switchLocalePathname(pathname: string, locale: Locale) {
  return addLocaleToPathname(stripLocaleFromPathname(pathname), locale);
}
