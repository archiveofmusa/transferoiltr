/** Canonical production origin; setting this does not bind DNS or redirect visitors. */
export const productionSiteUrl = 'https://uhphortum.com';

function normalizeOrigin(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The site URL must use HTTP or HTTPS.');
  }
  return url.origin;
}

/** Preview metadata may use its own origin; internal navigation stays relative. */
export function resolveSiteUrl(environment: Readonly<Record<string, string | undefined>> = process.env): string {
  const explicitUrl = environment.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicitUrl) return normalizeOrigin(explicitUrl);

  const previewContext = environment.CONTEXT === 'deploy-preview' || environment.CONTEXT === 'branch-deploy';
  const previewUrl = environment.DEPLOY_PRIME_URL?.trim() || environment.DEPLOY_URL?.trim();
  if (previewContext && previewUrl) return normalizeOrigin(previewUrl);

  // Netlify's generic URL can still point at the old hosting name before DNS is bound.
  return productionSiteUrl;
}

export const siteUrl = resolveSiteUrl();
