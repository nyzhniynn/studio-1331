export const GA_MEASUREMENT_ID = "G-B1W1ZNZ2GE";
export const YANDEX_METRIKA_ID = 111116609;
export const YANDEX_METRIKA_FORM_SUBMIT_GOAL = "form_submit";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    ym?: (counterId: number, method: string, ...params: unknown[]) => void;
  }
}

export const analyticsEvents = {
  contactFormSubmit: "contact_form_submit",
  ctaClick: "cta_click",
  telegramClick: "telegram_click",
  whatsappClick: "whatsapp_click",
  externalLinkClick: "external_link_click",
} as const;

export function trackEvent(
  name: string,
  // Future conversion tracking can pass GA4 params here: value, currency, link_url, button_id, form_id, etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>
) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", name, params ?? {});
}

export function reachYandexGoal(goal: string) {
  if (typeof window === "undefined" || typeof window.ym !== "function") {
    return;
  }

  window.ym(YANDEX_METRIKA_ID, "reachGoal", goal);
}

export function trackYandexPageView(url: string, referer?: string) {
  if (typeof window === "undefined" || typeof window.ym !== "function") {
    return;
  }

  window.ym(YANDEX_METRIKA_ID, "hit", url, referer ? { referer } : undefined);
}

export {};
