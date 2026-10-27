import type { MetadataRoute } from 'next';
import { brand, brandAssets } from '@/data/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: brand.name,
    short_name: brand.name,
    start_url: '/tr',
    scope: '/',
    display: 'standalone',
    background_color: '#F4F6F8',
    theme_color: brand.primaryColor,
    icons: [{ src: brandAssets.mark, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
