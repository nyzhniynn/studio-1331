import { defaultLocale, type Locale } from "../app/i18n";
import en from "./en";
import ru from "./ru";

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? Widen<U>[]
        : T extends object
          ? { -readonly [K in keyof T]: Widen<T[K]> }
          : T;

export type CaseDictionaryEntry = {
  category?: string;
  challenge?: string;
  descriptionLines?: string[];
  imageAlt?: string;
  mobileDescriptionLines?: string[];
  result?: string;
  role?: string;
  services?: string[];
  solution?: string;
  summary?: string;
  title?: string;
};

export type Dictionary = Widen<typeof en> & {
  cases: Record<string, CaseDictionaryEntry>;
};

const dictionaries = {
  en,
  ru,
};

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale] as unknown as Dictionary;
}

export { en, ru };
