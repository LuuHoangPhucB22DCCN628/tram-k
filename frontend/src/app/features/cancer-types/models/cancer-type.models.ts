export interface CancerType {
  slug: string;
  name: string;
  summary: string;
  image: string;
  imageAlt: string;
  featured?: boolean;
}

export interface CancerFact {
  label: string;
  value: string;
  description: string;
}

export interface CancerDetailSection {
  title: string;
  subtitle?: string;
  intro: string;
  items: readonly string[];
}

export interface CancerArticleSection {
  title: string;
  paragraphs: readonly string[];
  image?: string;
  imageAlt?: string;
}

interface CancerDetailBase {
  slug: string;
  name: string;
  tagline: string;
  intro: string;
  heroImage: string;
  heroAlt: string;
  layout?: 'mega' | 'article';
  articleTitle?: string;
  publishedAt?: string;
  readingTime?: string;
  articleSections?: readonly CancerArticleSection[];
}

interface CancerSectionedDetail extends CancerDetailBase {
  theme:
    | 'breast'
    | 'cervical'
    | 'colorectal'
    | 'liver'
    | 'blood'
    | 'stomach'
    | 'prostate'
    | 'nasopharyngeal';
  signs: CancerDetailSection;
  risks: CancerDetailSection;
  stages: CancerDetailSection;
  treatment: CancerDetailSection;
  prevention: CancerDetailSection;
}

interface CancerLungDetail extends CancerDetailBase {
  theme: 'lung';
}

interface CancerThyroidDetail extends CancerDetailBase {
  theme: 'thyroid';
}

export type CancerDetail = CancerSectionedDetail | CancerLungDetail | CancerThyroidDetail;
