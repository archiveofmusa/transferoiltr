export type UhpApplicationKey = 'waterJet' | 'industrialCleaning' | 'marine' | 'offshore' | 'heavyIndustry' | 'fluidTransfer';
export type UhpApplication = { slug: string; key: UhpApplicationKey };

export const uhpApplications: UhpApplication[] = [
  { slug: 'waterJet', key: 'waterJet' },
  { slug: 'industrialCleaning', key: 'industrialCleaning' },
  { slug: 'marine', key: 'marine' },
  { slug: 'offshore', key: 'offshore' },
  { slug: 'heavyIndustry', key: 'heavyIndustry' },
  { slug: 'fluidTransfer', key: 'fluidTransfer' },
];
