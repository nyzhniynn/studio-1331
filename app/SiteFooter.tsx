"use client";

import { usePathname } from "next/navigation";
import { getDictionary } from "../dictionaries";
import FooterHashLink from "./FooterHashLink";
import { getLocaleFromPathname } from "./i18n";

export default function SiteFooter() {
  const pathname = usePathname();
  const dictionary = getDictionary(getLocaleFromPathname(pathname));
  const footerMenuItems = dictionary.nav.mobileItems.map((item) => ({
    ...item,
    href: `/${item.href}` as `/#${string}`,
  }));
  const footerServiceItems = dictionary.home.services.items.map((item) => item.title);

  return (
    <footer
      className="site-footer"
      data-site-footer
      style={{ backgroundColor: "#11140f", color: "#f4f4ef" }}
    >
      <div className="site-footer__inner">
        <div className="site-footer__directory">
          <section className="site-footer__panel site-footer__panel--services" aria-labelledby="site-footer-services">
            <p id="site-footer-services" className="site-footer__panel-label">
              {dictionary.footer.servicesLabel}
            </p>
            <ul className="site-footer__service-list">
              {footerServiceItems.map((item) => (
                <li key={item}>
                  <FooterHashLink className="site-footer__text-link" href="/#services">
                    {item}
                  </FooterHashLink>
                </li>
              ))}
            </ul>
          </section>

          <nav className="site-footer__panel site-footer__panel--menu" aria-label="Footer navigation">
            <p className="site-footer__panel-label">{dictionary.footer.menuLabel}</p>
            <ul className="site-footer__menu-list">
              {footerMenuItems.map((item, index) => (
                <li key={item.href}>
                  <FooterHashLink className="site-footer__menu-link" href={item.href}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                  </FooterHashLink>
                </li>
              ))}
            </ul>
          </nav>

          <address className="site-footer__panel site-footer__panel--contacts">
            <p className="site-footer__panel-label">{dictionary.footer.contactsLabel}</p>
            <a className="site-footer__text-link" href={`mailto:${dictionary.footer.email}`}>
              {dictionary.footer.email}
            </a>
            <FooterHashLink className="site-footer__text-link" href="/#contact">
              {dictionary.footer.onlineStudio}
            </FooterHashLink>
            <FooterHashLink className="site-footer__text-link" href="/#brief">
              {dictionary.footer.startProject}
            </FooterHashLink>
          </address>

          <section className="site-footer__panel site-footer__panel--socials" aria-labelledby="site-footer-socials">
            <p id="site-footer-socials" className="site-footer__panel-label">
              {dictionary.footer.socialsLabel}
            </p>
            <div className="site-footer__social-grid">
              {dictionary.footer.socialItems.map((item) => (
                <a
                  className="site-footer__social-link"
                  href={item.href}
                  key={item.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>{item.shortLabel}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </footer>
  );
}
