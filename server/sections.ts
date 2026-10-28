import type { Decoder } from '../src/infrastructure/decoders';
import {
  advantagesDecoder, clientsDecoder, companyDecoder, contactDecoder, journeyDecoder,
  levelsDecoder, productsDecoder, projectsDecoder, servicesDecoder,
} from '../src/infrastructure/schemas';
import { villaDecoder } from '../src/infrastructure/villaSchema';

export interface Section {
  key: string;
  /** Name shown in the dashboard. */
  label: string;
  /** Validates the content with the same rules the site uses to display it. */
  decoder: Decoder<unknown>;
}

/** Every editable section. Each key matches a file in public/data (<key>.json). */
export const SECTIONS: readonly Section[] = [
  { key: 'company', label: 'المؤسسة والمعارض', decoder: companyDecoder },
  { key: 'services', label: 'الخدمات', decoder: servicesDecoder },
  { key: 'products', label: 'المنتجات', decoder: productsDecoder },
  { key: 'advantages', label: 'لماذا النظرة الساحرة', decoder: advantagesDecoder },
  { key: 'journey', label: 'رحلة العمل', decoder: journeyDecoder },
  { key: 'levels', label: 'مستويات التعامل', decoder: levelsDecoder },
  { key: 'projects', label: 'المشاريع', decoder: projectsDecoder },
  { key: 'clients', label: 'العملاء والشركاء', decoder: clientsDecoder },
  { key: 'contact', label: 'بيانات التواصل', decoder: contactDecoder },
  { key: 'villa-wood', label: 'كتالوج فيلا الخشب', decoder: villaDecoder },
];

export const findSection = (key: string): Section | undefined => SECTIONS.find((s) => s.key === key);
