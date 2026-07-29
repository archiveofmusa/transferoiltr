import type { UhpProduct, UhpProductFamily } from '@/data/uhpProducts';
import type { Messages } from './messages';
import type { Locale } from './routing';

type ApplicationKey = keyof Messages['Products']['applications'];

const familyApplications: Record<UhpProductFamily, ApplicationKey[]> = {
  helix: ['waterJet', 'industrialCleaning', 'shipyardMaintenance', 'fluidTransfer'],
  inserts: ['hoseConnections', 'waterJetSystems', 'highPressureLines', 'cleaningEquipment'],
  adapters: ['lineTransitions', 'connectionAdaptation', 'testLines'],
  ferrules: ['hoseAssemblies', 'highPressureConnections', 'waterJetEquipment'],
  accessories: ['systemAccessories', 'industrialCleaning', 'shipyardMaintenance'],
  certificates: ['certificateRequest', 'technicalDocumentation', 'procurementQuality'],
};

export type LocalizedUhpProduct = UhpProduct & {
  familyLabel: string;
  pressureText: string;
  shortDescription: string;
  description: string;
  applicationIds: ApplicationKey[];
  applications: string[];
  benefits: string[];
};

function template(value: string, variables: Record<string, string>) {
  return Object.entries(variables).reduce((result, [key, replacement]) => result.replaceAll(`{${key}}`, replacement), value);
}

function formatBar(locale: Locale, value: number) {
  const numberLocale = locale === 'ar' ? 'en-US' : locale === 'en' ? 'en-US' : locale === 'ru' ? 'ru-RU' : 'tr-TR';
  return new Intl.NumberFormat(numberLocale).format(value);
}

export function localizeProduct(product: UhpProduct, locale: Locale, messages: Messages): LocalizedUhpProduct {
  const family = messages.Products.families[product.family];
  const applicationIds = familyApplications[product.family];
  const pressureText = product.pressureBar
    ? template(messages.Products.pressure.upTo, { bar: formatBar(locale, product.pressureBar) })
    : product.family === 'certificates'
      ? messages.Products.pressure.documentRequest
      : messages.Products.pressure.technical;

  return {
    ...product,
    familyLabel: family.label,
    pressureText,
    shortDescription: template(family.short, { name: product.name }),
    description: template(family.description, { name: product.name }),
    applicationIds,
    applications: applicationIds.map((key) => messages.Products.applications[key]),
    benefits: family.benefits,
  };
}

export function localizeProducts(products: UhpProduct[], locale: Locale, messages: Messages) {
  return products.map((product) => localizeProduct(product, locale, messages));
}
