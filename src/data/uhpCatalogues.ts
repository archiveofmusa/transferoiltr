export type UhpDocumentKey = 'catalogue' | 'helix' | 'fittings' | 'certificates';
export type UhpDocument = { key: UhpDocumentKey; fileUrl: string };

export const uhpDocuments: UhpDocument[] = [
  { key: 'catalogue', fileUrl: '' },
  { key: 'helix', fileUrl: '' },
  { key: 'fittings', fileUrl: '' },
  { key: 'certificates', fileUrl: '' },
];
