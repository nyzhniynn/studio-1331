import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Спасибо за обращение! | 13:31 Studio",
  description: "Мы получили вашу заявку и свяжемся с вами в ближайшее время.",
  alternates: {
    canonical: "/thank-you",
  },
  openGraph: {
    title: "Спасибо за обращение! | 13:31 Studio",
    description: "Мы получили вашу заявку и свяжемся с вами в ближайшее время.",
    url: "/thank-you",
  },
};

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-[#f4f4ef] p-3 pb-16 text-[#141714] sm:p-5">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1824px] flex-col justify-between border-t border-[#141714]/70 pt-5 sm:min-h-[calc(100vh-2.5rem)] sm:pt-8">
        <Link
          aria-label="13:31 Studio"
          className="w-fit font-serif text-[64px] leading-[0.9] tracking-[0em] text-[#141714] no-underline sm:text-[86px]"
          href="/"
        >
          13:31
        </Link>

        <div className="grid max-w-[78rem] gap-7 pb-[12vh] sm:gap-9">
          <h1 className="m-0 max-w-[13ch] font-serif text-[64px] font-normal leading-[0.88] tracking-[0em] text-[#141714] sm:text-[96px] lg:text-[135px] xl:text-[156px]">
            Спасибо за обращение!
          </h1>
          <p className="m-0 max-w-[44rem] font-sans text-[18px] font-extrabold uppercase leading-[1.14] tracking-[0em] text-[#141714] sm:text-[22px]">
            Мы получили вашу заявку и свяжемся с вами в ближайшее время.
          </p>
          <Link
            className="motion-button mt-3 inline-flex h-[3.6rem] w-fit min-w-[16rem] items-center justify-center border border-[#bfbfb8] px-8 font-sans text-[1rem] font-extrabold uppercase leading-none tracking-[0em] text-[#141714] no-underline max-sm:w-full"
            href="/"
          >
            Вернуться на главную
          </Link>
        </div>
      </section>
    </main>
  );
}
