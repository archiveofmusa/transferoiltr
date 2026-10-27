/** Website identity, separate from manufacturer and product media. */
export const brand = {
  name: 'UHPHORTUM',
  primaryColor: '#C95016',
  navyColor: '#102033',
} as const;

export const brandAssets = {
  logo: '/assets/brand/uhphortum-logo.svg',
  logoWhite: '/assets/brand/uhphortum-logo-white.svg',
  // These existing icons contain only the unchanged emblem, not a wordmark.
  mark: '/assets/brand/uhpflex-mark.svg',
  appleTouchIcon: '/assets/brand/uhpflex-apple-touch-icon.png',
  openGraph: '/assets/brand/uhphortum-og.png',
} as const;

/** Rebrand the former distributor name without changing manufacturer/product names. */
export function rebrandSiteText(value: string): string {
  return value.replace(/\bUHPFLEX\b|Transfer Oil Türkiye|TRANSFER OIL TÜRKİYE/g, brand.name);
}
