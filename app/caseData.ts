export type CaseStudy = {
  slug: string;
  title: string;
  category: string;
  year: string;
  image: string;
  imageAlt: string;
  slides?: string[];
  descriptionLines: string[];
  mobileDescriptionLines?: string[];
  summary: string;
  services: string[];
  role: string;
  challenge: string;
  solution: string;
  result: string;
  homeArticleClass: string;
  homeMediaClass: string;
};

export const homeCaseRevealStep = 5;
export const homeVisibleCaseCountKey = "studio-1331:home-visible-case-count";

function caseAsset(folder: string, file: string) {
  return `/Case/${encodeURIComponent(folder)}/${file}`;
}

function buildCaseSlides(folder: string, files: string[]) {
  return files.map((file) => caseAsset(folder, file));
}

const kngkEnergoSlides = buildCaseSlides("KNGK ENERGO", [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.png",
  "6.png",
  "7.png",
  "8.png",
  "9.png",
  "10.png",
  "11.png",
  "12.png",
  "13.png",
  "14.png",
  "15.png",
  "16.png",
  "17.jpg",
  "18.png",
]);

const kngkGroupSlides = buildCaseSlides("KNGK GROUP", [
  "1.png",
  "2.png",
  "3.png",
  "4.jpg",
  "5.png",
  "6.png",
  "7.png",
  "8.png",
  "9.png",
  "10.png",
  "11.png",
  "12.png",
  "13.png",
  "14.png",
  "15.png",
]);

const kngkTranslogisticsSlides = buildCaseSlides("KNGK TRANSLOGISTIKA", [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.png",
  "6.png",
  "7.png",
  "8.png",
  "9.png",
  "10.png",
  "11.png",
  "12.png",
  "13.png",
  "14.png",
  "15.png",
  "16.png",
  "17.png",
]);

const formaZvukaSlides = buildCaseSlides("FORMA ZVUKA", [
  "1.jpg",
  "2.jpg",
  "3.jpg",
  "4.jpg",
  "5.jpg",
  "6.jpg",
  "7.jpg",
  "8.jpg",
  "9.jpg",
  "10.jpg",
  "11.jpg",
]);

const kngkSportTeamSlides = buildCaseSlides("KNGK SPORT TEAM", [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.jpg",
  "6.jpg",
  "7.jpg",
  "8.jpg",
  "9.jpg",
  "10.jpg",
  "11.png",
  "12.jpg",
  "13.jpg",
  "14.jpg",
  "15.jpg",
  "16.jpg",
  "17.jpg",
  "18.jpg",
  "19.jpg",
  "20.jpg",
  "21.jpg",
  "22.jpg",
  "23.png",
]);

export const caseStudies: CaseStudy[] = [
  {
    slug: "kngk-energo",
    title: "KNGK ENERGO",
    category: "Website redesign",
    year: "2026",
    image: "/Photo/KNG%20ENERGO.png",
    imageAlt: "KNGK Energo project preview",
    slides: kngkEnergoSlides,
    descriptionLines: [
      "Complete website redesign for a large independent",
      "energy retail company",
    ],
    summary:
      "A complete website redesign for an independent energy retail company, focused on clarity, trust, and structured communication.",
    services: ["Information architecture", "Website design", "Digital presentation"],
    role: "Art direction, UX/UI, frontend",
    challenge:
      "The company needed a more mature digital presence that could explain a complex offer without visual noise.",
    solution:
      "We rebuilt the page logic around decision makers: direct navigation, restrained typography, clear service blocks, and a visual language that supports credibility instead of decoration.",
    result:
      "We built a quieter, clearer structure around the company narrative, making the website easier to scan and more credible for decision makers.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "kngk-group",
    title: "KNGK GROUP",
    category: "Corporate platform",
    year: "2026",
    image: "/Photo/kngk%20group.png",
    imageAlt: "KNGK Group project preview",
    slides: kngkGroupSlides,
    descriptionLines: [
      "A major corporate project for an large industrial group in the field",
      "of oil refining, petrochemical, oil and gas production",
    ],
    mobileDescriptionLines: [
      "A major corporate project for an large industrial",
      "group in the field of oil refining, petrochemical,",
      "oil and gas production",
    ],
    summary:
      "A major corporate project for a large industrial group operating across oil refining, petrochemicals, and gas production.",
    services: ["Corporate website", "Content system", "Visual direction"],
    role: "Strategy, design system, interface",
    challenge:
      "The brand needed a digital system that could hold a large amount of information while still feeling precise and contemporary.",
    solution:
      "We designed a modular content system with a calmer visual rhythm, stronger hierarchy, and more controlled presentation of the group's industrial scale.",
    result:
      "The project turns heavy industrial communication into a calmer, more navigable corporate experience.",
    homeArticleClass: "motion-case col-span-12 lg:col-start-6 lg:col-end-13",
    homeMediaClass: "motion-media h-[clamp(28rem,33vw,43rem)] bg-[#D9D9D9]",
  },
  {
    slug: "kngk-translogistics",
    title: "KNGK TRANSLOGISTICS",
    category: "Digital presentation",
    year: "2026",
    image: "/Photo/kngk%20translogistics.png",
    imageAlt: "KNGK Translogistics project preview",
    slides: kngkTranslogisticsSlides,
    descriptionLines: [
      "A completed project for a company specializing in the",
      "provision of special equipment",
    ],
    summary:
      "A digital presentation for a logistics company specializing in special equipment and operational reliability.",
    services: ["Website structure", "Interface design", "Content design"],
    role: "Digital design, content structure",
    challenge:
      "The service offer needed to be explained quickly while preserving a sense of scale and practical expertise.",
    solution:
      "We focused the experience around equipment, service geography, and operational proof, using a direct grid and large visuals to make the company feel specific and dependable.",
    result:
      "The visual system gives the company a direct, work-focused presentation with a stronger project image.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "forma-zvuka",
    title: "FORMA ZVUKA",
    category: "Cultural project",
    year: "2026",
    image: "/Photo/forma%20zvuka.png",
    imageAlt: "Forma Zvuka project preview",
    slides: formaZvukaSlides,
    descriptionLines: [
      "Cultural project of the Anastasia Charitable Foundation",
    ],
    summary:
      "A cultural project for the Anastasia Charitable Foundation, built around a more emotional and editorial presentation.",
    services: ["Art direction", "Website design", "Editorial structure"],
    role: "Art direction, interface, storytelling",
    challenge:
      "The project needed to feel human and memorable while remaining easy to understand and support.",
    solution:
      "We shaped the page as an editorial story: warm visual rhythm, simple navigation, and a more atmospheric image system that keeps the project accessible.",
    result:
      "The result is a compact visual experience with a stronger atmosphere and a clearer cultural position.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "kngk-sport-team",
    title: "KNGK SPORT TEAM",
    category: "Image project",
    year: "2026",
    image: "/Photo/kngk%20sport%20team.png",
    imageAlt: "KNGK Sport Team project preview",
    slides: kngkSportTeamSlides,
    descriptionLines: [
      "A large image project aimed at involving the team of the",
      "group of companies in sports programs and a healthy lifestyle",
    ],
    mobileDescriptionLines: [
      "A large image project aimed at involving the",
      "team of the group of companies in sports programs",
      "and a healthy lifestyle",
    ],
    summary:
      "An image project for a sports team initiative inside a group of companies, focused on involvement and lifestyle.",
    services: ["Campaign website", "Image system", "Digital storytelling"],
    role: "Campaign design, visual system",
    challenge:
      "The project had to feel energetic and inclusive while staying aligned with a larger corporate ecosystem.",
    solution:
      "We combined a campaign-like visual tone with a clear participation flow, letting the project feel active without losing the discipline of the wider corporate brand.",
    result:
      "We shaped a visual presentation that makes the initiative easier to join, understand, and share.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "atlas-equipment",
    title: "ATLAS EQUIPMENT",
    category: "Industrial website",
    year: "2026",
    image: "/Photo/kngk%20translogistics.png",
    imageAlt: "Atlas Equipment project preview",
    descriptionLines: [
      "A direct digital presentation for a company working with",
      "industrial equipment and field operations",
    ],
    summary:
      "A digital presentation for an industrial equipment company, focused on clear service structure and practical credibility.",
    services: ["Website structure", "Interface design", "Visual direction"],
    role: "UX/UI, art direction, frontend",
    challenge:
      "The company needed to explain technical services quickly while keeping the page calm and reliable.",
    solution:
      "We organized the communication around equipment categories, operational proof, and a restrained visual rhythm.",
    result:
      "The project gives the company a sharper digital image and makes the offer easier to evaluate.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "sever-energy",
    title: "SEVER ENERGY",
    category: "Corporate website",
    year: "2026",
    image: "/Photo/KNG%20ENERGO.png",
    imageAlt: "Sever Energy project preview",
    descriptionLines: [
      "A corporate website concept for an energy company with",
      "a more mature and structured digital presence",
    ],
    mobileDescriptionLines: [
      "A corporate website concept for an energy company",
      "with a more mature digital presence",
    ],
    summary:
      "A corporate website concept for an energy company, built around trust, clarity, and a stronger information hierarchy.",
    services: ["Corporate website", "Information architecture", "Design system"],
    role: "Strategy, UX/UI, visual system",
    challenge:
      "The communication needed to feel precise and established without becoming heavy or overloaded.",
    solution:
      "We used a modular page system, direct navigation, and large visual anchors to keep the experience readable.",
    result:
      "The site becomes easier to scan for partners and decision makers while preserving a serious corporate tone.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "urban-sport-lab",
    title: "URBAN SPORT LAB",
    category: "Image project",
    year: "2026",
    image: "/Photo/kngk%20sport%20team.png",
    imageAlt: "Urban Sport Lab project preview",
    descriptionLines: [
      "An image project for a sports initiative focused on",
      "participation, rhythm, and team involvement",
    ],
    summary:
      "An image project for a sports initiative, focused on participation mechanics and a more energetic visual tone.",
    services: ["Campaign website", "Visual system", "Digital storytelling"],
    role: "Campaign design, interface, art direction",
    challenge:
      "The initiative needed to feel active and easy to join without losing clarity in the participation flow.",
    solution:
      "We paired bold image moments with a simple structure that explains the program and keeps the page moving.",
    result:
      "The final presentation feels more open, energetic, and easier to share across the team.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "forma-media",
    title: "FORMA MEDIA",
    category: "Cultural platform",
    year: "2026",
    image: "/Photo/forma%20zvuka.png",
    imageAlt: "Forma Media project preview",
    descriptionLines: [
      "A cultural platform with an editorial rhythm and a",
      "warmer visual language for public communication",
    ],
    summary:
      "A cultural platform with an editorial structure, designed to make the project feel human, memorable, and easy to support.",
    services: ["Editorial structure", "Website design", "Art direction"],
    role: "Art direction, interface, storytelling",
    challenge:
      "The project needed a warmer tone while staying simple enough for visitors to understand the initiative quickly.",
    solution:
      "We built a quiet editorial rhythm around image sequencing, clear text blocks, and soft navigation moments.",
    result:
      "The platform becomes more expressive without sacrificing clarity or accessibility.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
  {
    slug: "kngk-industrial",
    title: "KNGK INDUSTRIAL",
    category: "Corporate platform",
    year: "2026",
    image: "/Photo/kngk%20group.png",
    imageAlt: "KNGK Industrial project preview",
    descriptionLines: [
      "A corporate platform for an industrial group with a",
      "large amount of information and service directions",
    ],
    mobileDescriptionLines: [
      "A corporate platform for an industrial group",
      "with a large amount of information",
    ],
    summary:
      "A corporate platform for an industrial group, focused on structure, scale, and a more disciplined digital image.",
    services: ["Corporate platform", "Content system", "Interface design"],
    role: "Strategy, design system, UX/UI",
    challenge:
      "The company needed to present multiple directions without making the website feel fragmented.",
    solution:
      "We designed a calmer content system with repeatable modules, clear navigation, and strong visual hierarchy.",
    result:
      "The platform gives the group a more coherent digital presence and makes the information easier to navigate.",
    homeArticleClass: "motion-case col-span-12 lg:col-span-4",
    homeMediaClass: "motion-media h-[clamp(16rem,19vw,24rem)] bg-[#D9D9D9]",
  },
];

export function getCaseBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}

export function getNextCase(slug: string) {
  const currentIndex = caseStudies.findIndex((caseStudy) => caseStudy.slug === slug);

  if (currentIndex === -1) {
    return caseStudies[0];
  }

  return caseStudies[(currentIndex + 1) % caseStudies.length];
}

export function getPreviousCase(slug: string) {
  const currentIndex = caseStudies.findIndex((caseStudy) => caseStudy.slug === slug);

  if (currentIndex === -1) {
    return caseStudies[caseStudies.length - 1];
  }

  return caseStudies[(currentIndex - 1 + caseStudies.length) % caseStudies.length];
}

export function getVisibleHomeCaseCountForSlug(slug: string) {
  const caseIndex = caseStudies.findIndex((caseStudy) => caseStudy.slug === slug);

  if (caseIndex === -1) {
    return Math.min(homeCaseRevealStep, caseStudies.length);
  }

  const visibleBatchCount = Math.ceil((caseIndex + 1) / homeCaseRevealStep) * homeCaseRevealStep;

  return Math.min(visibleBatchCount, caseStudies.length);
}
