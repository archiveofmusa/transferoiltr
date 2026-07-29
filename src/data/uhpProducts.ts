import { finalTransferOilAssets } from './finalTransferOilAssets';

export type UhpProductFamily = 'helix' | 'inserts' | 'adapters' | 'ferrules' | 'accessories' | 'certificates';

export type UhpProduct = {
  slug: string;
  name: string;
  family: UhpProductFamily;
  category: 'uhp';
  pressureBar?: number;
  pressurePsi?: string;
  image: string;
  sourceUrl: string;
  catalogueUrl?: string;
  certificateUrl?: string;
  related?: string[];
};

export const uhpFamilies: UhpProductFamily[] = ['helix', 'inserts', 'adapters', 'ferrules', 'accessories', 'certificates'];

const image = (slug: keyof typeof finalTransferOilAssets.products) => finalTransferOilAssets.products[slug] ?? finalTransferOilAssets.placeholder;

export const uhpProducts: UhpProduct[] = [
  { slug: 'helix-2-spiral', name: 'HELIX 2 Spiral', family: 'helix', category: 'uhp', pressureBar: 1500, pressurePsi: '21.7k psi', image: image('helix-2-spiral'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/2-spiral.aspx', related: ['helix-4-spiral', 'bspp', 'adapter-male-male'] },
  { slug: 'helix-4-spiral', name: 'HELIX 4 Spiral', family: 'helix', category: 'uhp', pressureBar: 2200, pressurePsi: '31.9k psi', image: image('helix-4-spiral'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/4-spiral.aspx', related: ['helix-2-spiral', 'dkos', 'adapter-male-female'] },
  { slug: 'helix-6-spiral', name: 'HELIX 6 Spiral', family: 'helix', category: 'uhp', image: image('helix-6-spiral'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/6-spiral.aspx', related: ['helix-4-spiral', 'helix-8-spiral', 'type-m'] },
  { slug: 'helix-8-spiral', name: 'HELIX 8 Spiral', family: 'helix', category: 'uhp', image: image('helix-8-spiral'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/helix(r)-hoses/8-spiral/208---8sw-helix.aspx', related: ['helix-6-spiral', 'hp-mp', 'adapter-proof-test'] },
  { slug: 'bspp', name: 'BSPP', family: 'inserts', category: 'uhp', image: image('bspp'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-british-standard-pipe-parallel-(bspp).aspx', related: ['metric-24-60', 'nptf', 'helix-2-spiral'] },
  { slug: 'metric-24-60', name: 'Metric 24° - 60', family: 'inserts', category: 'uhp', image: image('metric-24-60'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-metric-24---60/hc---female-metric-24---60.aspx', related: ['bspp', 'dkos', 'jic'] },
  { slug: 'nptf', name: 'NPTF', family: 'inserts', category: 'uhp', image: image('nptf'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-national-pipe-tapered-fuel-(nptf).aspx', related: ['bspp', 'gas', 'hp-mp'] },
  { slug: 'hp-mp', name: 'HP/MP', family: 'inserts', category: 'uhp', image: image('hp-mp'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/hp--mp.aspx', related: ['nptf', 'metric', 'adapter-proof-test'] },
  { slug: 'metric', name: 'Metric', family: 'inserts', category: 'uhp', image: image('metric'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/metric/hk--m-met.aspx', related: ['metric-24-60', 'din-3852', 'usit'] },
  { slug: 'usit', name: 'USIT', family: 'inserts', category: 'uhp', image: image('usit'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/usit/hr---m-usit.aspx', related: ['metric', 'flat-seal', 'din-3852'] },
  { slug: 'din-3852', name: 'DIN 3852', family: 'inserts', category: 'uhp', image: image('din-3852'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/din-3852/ht---male-din3852.aspx', related: ['metric', 'usit', 'dkos'] },
  { slug: 'dkos', name: 'DKOS', family: 'inserts', category: 'uhp', image: image('dkos'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-din-2353--3865-24/hd---female-dkos.aspx', related: ['metric-24-60', 'jic', 'din-3852'] },
  { slug: 'jic', name: 'JIC', family: 'inserts', category: 'uhp', image: image('jic'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/uhp-sae-j514-370-(jic)/he---female-jic.aspx', related: ['dkos', 'type-m', 'metric-24-60'] },
  { slug: 'type-m', name: 'TYPE-M', family: 'inserts', category: 'uhp', image: image('type-m'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/type-m/hf---female-type-m.aspx', related: ['jic', 'gas', 'helix-6-spiral'] },
  { slug: 'gas', name: 'GAS', family: 'inserts', category: 'uhp', image: image('gas'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/gas.aspx', related: ['nptf', 'gas100-external-cone', 'type-m'] },
  { slug: 'gas100-external-cone', name: 'GAS100 External Cone', family: 'inserts', category: 'uhp', image: image('gas100-external-cone'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/gas100-external-cone/hq---m-gas100-ec.aspx', related: ['gas', 'flat-seal', 'adapter-male-female'] },
  { slug: 'flat-seal', name: 'Flat Seal', family: 'inserts', category: 'uhp', image: image('flat-seal'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/flat-seal.aspx', related: ['flat-seal-metric', 'usit', 'gas100-external-cone'] },
  { slug: 'flat-seal-metric', name: 'Flat Seal Metric', family: 'inserts', category: 'uhp', image: image('flat-seal-metric'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-inserts/flat-seal-metric.aspx', related: ['flat-seal', 'metric', 'din-3852'] },
  { slug: 'adapter-male-male', name: 'Male | Male', family: 'adapters', category: 'uhp', image: image('adapter-male-male'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/adapters/male-%7C-male.aspx', related: ['adapter-male-female', 'adapter-female-female', 'bspp'] },
  { slug: 'adapter-male-female', name: 'Male | Female', family: 'adapters', category: 'uhp', image: image('adapter-male-female'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/adapters/male-%7C-female.aspx', related: ['adapter-male-male', 'adapter-female-female', 'gas100-external-cone'] },
  { slug: 'adapter-female-female', name: 'Female | Female', family: 'adapters', category: 'uhp', image: image('adapter-female-female'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/adapters/female-%7C-female.aspx', related: ['adapter-male-male', 'adapter-male-female', 'adapter-proof-test'] },
  { slug: 'adapter-proof-test', name: 'Proof Test', family: 'adapters', category: 'uhp', image: image('adapter-proof-test'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/adapters/proof-test.aspx', related: ['adapter-female-female', 'hp-mp', 'helix-8-spiral'] },
  { slug: 'ferrules', name: 'UHP Ferrules', family: 'ferrules', category: 'uhp', image: image('ferrules'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-ferrules.aspx', related: ['bspp', 'helix-2-spiral', 'accessories'] },
  { slug: 'accessories', name: 'UHP Accessories', family: 'accessories', category: 'uhp', image: image('accessories'), sourceUrl: 'https://www.transferoil.com/en/to-uhp-products/uhp-accessories.aspx', related: ['ferrules', 'adapter-male-male', 'helix-4-spiral'] },
  { slug: 'uhp-certificates', name: 'UHP Certificates', family: 'certificates', category: 'uhp', image: image('certificates'), sourceUrl: 'https://www.transferoil.com/en/about-us/rd-quality-certificates.aspx#certificates', related: ['helix-2-spiral', 'ferrules', 'accessories'] },
];

export const findUhpProduct = (slug: string) => uhpProducts.find((product) => product.slug === slug);
