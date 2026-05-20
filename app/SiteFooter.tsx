import FooterHashLink from "./FooterHashLink";

const footerMenuItems = [
  { label: "Main", href: "/#top" },
  { label: "Approach", href: "/#approach" },
  { label: "Work", href: "/#work" },
  { label: "Services", href: "/#services" },
  { label: "Process", href: "/#process" },
  { label: "Team", href: "/#team" },
  { label: "Contact", href: "/#contact" },
] as const;

const footerServiceItems = [
  "Strategic basis",
  "Brand & Digital Identity",
  "Website & Digital Platform",
  "Redesign of existing products",
] as const;

const footerSocialItems = [
  { label: "Instagram", shortLabel: "IG", href: "https://www.instagram.com/" },
  { label: "Telegram", shortLabel: "TG", href: "https://t.me/" },
] as const;

export default function SiteFooter() {
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
              Services
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
            <p className="site-footer__panel-label">Menu</p>
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
            <p className="site-footer__panel-label">Contacts</p>
            <a className="site-footer__text-link" href="mailto:hello@1331.agency">
              hello@1331.agency
            </a>
            <FooterHashLink className="site-footer__text-link" href="/#contact">
              Online studio
            </FooterHashLink>
            <FooterHashLink className="site-footer__text-link" href="/#brief">
              Start a project
            </FooterHashLink>
          </address>

          <section className="site-footer__panel site-footer__panel--socials" aria-labelledby="site-footer-socials">
            <p id="site-footer-socials" className="site-footer__panel-label">
              Socials
            </p>
            <div className="site-footer__social-grid">
              {footerSocialItems.map((item) => (
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
