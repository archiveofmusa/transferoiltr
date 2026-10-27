import { brandAssets } from './brand';
import {
  transferOilHdRuntimeAssetPathMap,
  transferOilHdSemanticAssets,
} from './transferoil/hd-assets.generated';

const hd = (currentPath: string): string => (
  transferOilHdRuntimeAssetPathMap as Record<string, string>
)[currentPath] ?? currentPath;

export const finalTransferOilAssets = {
  "logoWhite": brandAssets.logoWhite,
  "logoOriginal": brandAssets.logo,
  "hero": hd("/assets/transfer-oil/final/hero/reference-hero.webp"),
  "corporate": transferOilHdSemanticAssets.corporateOverview ?? hd("/assets/transfer-oil/final/corporate/corporate-reference.webp"),
  "exhibitions": hd("/assets/transfer-oil/final/exhibitions/exhibitions-reference.webp"),
  "news": hd("/assets/transfer-oil/final/news/news-reference.webp"),
  "certificates": hd("/assets/transfer-oil/final/certificates/certificates-reference.webp"),
  "contact": hd("/assets/transfer-oil/final/contact/contact-reference.webp"),
  "products": {
    "helix-2-spiral": hd("/assets/transfer-oil/final/uhp/helix-2-spiral.webp"),
    "helix-4-spiral": hd("/assets/transfer-oil/final/uhp/helix-4-spiral.webp"),
    "helix-6-spiral": hd("/assets/transfer-oil/final/uhp/helix-6-spiral.webp"),
    "helix-8-spiral": hd("/assets/transfer-oil/final/uhp/helix-8-spiral.webp"),
    "bspp": hd("/assets/transfer-oil/final/uhp/bspp.webp"),
    "metric-24-60": hd("/assets/transfer-oil/final/uhp/metric-24-60.webp"),
    "nptf": hd("/assets/transfer-oil/final/uhp/nptf.webp"),
    "hp-mp": hd("/assets/transfer-oil/final/uhp/hp-mp.webp"),
    "metric": hd("/assets/transfer-oil/final/uhp/metric.webp"),
    "usit": hd("/assets/transfer-oil/final/uhp/usit.webp"),
    "din-3852": hd("/assets/transfer-oil/final/uhp/din-3852.webp"),
    "dkos": hd("/assets/transfer-oil/final/uhp/dkos.webp"),
    "jic": hd("/assets/transfer-oil/final/uhp/jic.webp"),
    "type-m": hd("/assets/transfer-oil/final/uhp/type-m.webp"),
    "gas": hd("/assets/transfer-oil/final/uhp/gas.webp"),
    "gas100-external-cone": hd("/assets/transfer-oil/final/uhp/gas100-external-cone.webp"),
    "flat-seal": hd("/assets/transfer-oil/final/uhp/flat-seal.webp"),
    "flat-seal-metric": hd("/assets/transfer-oil/final/uhp/flat-seal-metric.webp"),
    "adapter-male-male": hd("/assets/transfer-oil/final/uhp/adapter-male-male.webp"),
    "adapter-male-female": hd("/assets/transfer-oil/final/uhp/adapter-male-female.webp"),
    "adapter-female-female": hd("/assets/transfer-oil/final/uhp/adapter-female-female.webp"),
    "adapter-proof-test": hd("/assets/transfer-oil/final/uhp/adapter-proof-test.webp"),
    "ferrules": hd("/assets/transfer-oil/final/uhp/ferrules.webp"),
    "accessories": hd("/assets/transfer-oil/final/uhp/accessories.webp"),
    "certificates": hd("/assets/transfer-oil/final/certificates/certificates-reference.webp")
  },
  "placeholder": "/assets/transfer-oil/final/placeholders/transfer-oil-placeholder.svg"
} as const;
