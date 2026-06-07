"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getDictionary } from "../dictionaries";
import FooterHashLink from "./FooterHashLink";
import { getLocaleFromPathname } from "./i18n";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

export default function SiteFooter() {
  const pathname = usePathname();
  const dictionary = getDictionary(getLocaleFromPathname(pathname));
  const copyToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copyToastMessage, setCopyToastMessage] = useState("");
  const footerMenuItems = dictionary.nav.mobileItems.map((item) => ({
    ...item,
    href: `/${item.href}` as `/#${string}`,
  }));
  const footerServiceItems = dictionary.home.services.items.map((item) => item.title);
  const showCopyToast = (message: string) => {
    setCopyToastMessage(message);

    if (copyToastTimeoutRef.current) {
      clearTimeout(copyToastTimeoutRef.current);
    }

    copyToastTimeoutRef.current = setTimeout(() => {
      setCopyToastMessage("");
      copyToastTimeoutRef.current = null;
    }, 2200);
  };
  const handleCopy = async (value: string, successMessage: string) => {
    try {
      await copyText(value);
      showCopyToast(successMessage);
    } catch {
      showCopyToast(dictionary.footer.copyError);
    }
  };

  useEffect(() => {
    return () => {
      if (copyToastTimeoutRef.current) {
        clearTimeout(copyToastTimeoutRef.current);
      }
    };
  }, []);

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
            <button
              className="site-footer__text-link site-footer__copy-button"
              onClick={() => handleCopy(dictionary.footer.email, dictionary.footer.copyEmailSuccess)}
              type="button"
            >
              {dictionary.footer.email}
            </button>
            <a className="site-footer__text-link" href={dictionary.footer.telegramUrl} rel="noreferrer" target="_blank">
              {dictionary.footer.telegram}
            </a>
            <button
              className="site-footer__text-link site-footer__copy-button"
              onClick={() => handleCopy(dictionary.footer.phone, dictionary.footer.copyPhoneSuccess)}
              type="button"
            >
              {dictionary.footer.phone}
            </button>
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
      <div
        aria-live="polite"
        className="site-footer__copy-toast"
        data-visible={copyToastMessage ? "true" : "false"}
      >
        {copyToastMessage}
      </div>
    </footer>
  );
}
