/** Sector landing pages are independent of the existing UHP application filters. */
export const sectorSlugs = ['offshore', 'savunma-sanayi', 'endustriyel-tesisler', 'rafineriler'] as const;

export type SectorSlug = (typeof sectorSlugs)[number];
export type Sector = { slug: SectorSlug; relatedRoutes: string[] };

/** Existing catalogue categories, not blanket declarations of sector suitability. */
export const sectors: Sector[] = [
  { slug: 'offshore', relatedRoutes: ['/hidrolik', '/uhp/helix-hoses', '/uhp/fittings'] },
  { slug: 'savunma-sanayi', relatedRoutes: ['/hidrolik/high-pressure', '/baglanti-elemanlari/standard-inserts', '/uhp/helix-hoses'] },
  { slug: 'endustriyel-tesisler', relatedRoutes: ['/endustriyel/industrial-automation', '/endustriyel/water', '/uhp/helix-hoses'] },
  { slug: 'rafineriler', relatedRoutes: ['/endustriyel/chemicals', '/endustriyel/water', '/uhp/adapters'] },
];

export function getSector(slug: string): Sector | undefined {
  return sectors.find((sector) => sector.slug === slug);
}

export function sectorRoute(slug: SectorSlug): string {
  return `/sektorler/${slug}`;
}
