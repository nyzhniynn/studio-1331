"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { trackYandexPageView, YANDEX_METRIKA_ID } from "../lib/analytics";

const yandexMetrikaScript = `
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {
            if (document.scripts[j].src === r) {
                return;
            }
        }
        k=e.createElement(t);
        a=e.getElementsByTagName(t)[0];
        k.async=1;
        k.src=r;
        a.parentNode.insertBefore(k,a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}', 'ym');

    ym(${YANDEX_METRIKA_ID}, 'init', {
        ssr: true,
        webvisor: true,
        clickmap: true,
        ecommerce: "dataLayer",
        referrer: document.referrer,
        url: location.href,
        accurateTrackBounce: true,
        trackLinks: true
    });
`;

export default function YandexMetrika() {
  const pathname = usePathname();
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUrl = window.location.href;
    const previousUrl = previousUrlRef.current;

    if (!previousUrl) {
      previousUrlRef.current = currentUrl;
      return;
    }

    if (currentUrl !== previousUrl) {
      trackYandexPageView(currentUrl, previousUrl);
      previousUrlRef.current = currentUrl;
    }
  }, [pathname]);

  return (
    <>
      <Script
        dangerouslySetInnerHTML={{ __html: yandexMetrikaScript }}
        id="yandex-metrika"
        strategy="afterInteractive"
      />
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
            style={{ left: "-9999px", position: "absolute" }}
          />
        </div>
      </noscript>
    </>
  );
}
