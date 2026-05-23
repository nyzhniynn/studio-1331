import type { Metadata } from "next";
import { getDictionary } from "../../dictionaries";
import Home from "../page";

const dictionary = getDictionary("ru");

export const metadata: Metadata = {
  title: dictionary.metadata.title,
  description: dictionary.metadata.description,
  alternates: {
    canonical: "/ru",
    languages: {
      en: "/",
      ru: "/ru",
    },
  },
  openGraph: {
    title: dictionary.metadata.title,
    description: dictionary.metadata.description,
    url: "/ru",
  },
};

export default function RussianHomePage() {
  return <Home dictionary={dictionary} locale="ru" />;
}
