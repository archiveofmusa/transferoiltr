/**
 * Presentation order only: never reorder the manufacturer registry itself.
 * Membership below uses stable manifest IDs, not translated product names.
 * Catalogue containers inherit the earliest kind represented by their branch.
 * New/unrecognised IDs remain visible at the end and are exposed to the audit.
 */
export const portfolioOrder = ['uhp', 'hydraulic', 'industrial', 'fittings', 'other'] as const;
export const productKindOrder = ['hose', 'fitting', 'adapter', 'ferrule', 'accessory', 'document', 'other'] as const;
export type PortfolioKey = (typeof portfolioOrder)[number];
export type ProductKind = (typeof productKindOrder)[number];
export type ProductPresentation = { portfolio: PortfolioKey; kind: ProductKind; known: boolean };

const registryGroups: ReadonlyArray<{ portfolio: PortfolioKey; kind: ProductKind; ids: readonly number[] }> = [
  { portfolio: 'uhp', kind: 'hose', ids: [233, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325, 326] },
  { portfolio: 'uhp', kind: 'fitting', ids: [275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294, 295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307] },
  { portfolio: 'uhp', kind: 'adapter', ids: [247, 248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263] },
  { portfolio: 'uhp', kind: 'ferrule', ids: [264, 265, 266, 267, 268, 269, 270, 271, 272, 273, 274] },
  { portfolio: 'uhp', kind: 'accessory', ids: [234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246] },
  { portfolio: 'hydraulic', kind: 'hose', ids: [86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 146, 147, 148, 149, 150, 151, 152] },
  { portfolio: 'hydraulic', kind: 'fitting', ids: [153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179] },
  { portfolio: 'hydraulic', kind: 'ferrule', ids: [143, 144, 145] },
  { portfolio: 'industrial', kind: 'hose', ids: [180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 194, 195, 196, 197, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231] },
  { portfolio: 'industrial', kind: 'fitting', ids: [198, 199, 200, 201, 202, 203, 204] },
  { portfolio: 'industrial', kind: 'ferrule', ids: [191, 192, 193] },
  { portfolio: 'fittings', kind: 'fitting', ids: [1, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 84] },
  { portfolio: 'fittings', kind: 'ferrule', ids: [8, 34, 35, 36, 37, 38, 39, 40, 83] },
  { portfolio: 'fittings', kind: 'accessory', ids: [2, 3, 4, 5, 6, 7] },
  { portfolio: 'other', kind: 'document', ids: [332, 338] },
  { portfolio: 'other', kind: 'other', ids: [85, 232, 327, 328, 329, 330, 331, 333, 334, 335, 336, 337, 339, 340, 341, 342, 343] },
];

const registry = new Map<number, ProductPresentation>();
for (const group of registryGroups) {
  for (const id of group.ids) {
    if (registry.has(id)) throw new Error(`Duplicate product presentation ID: ${id}`);
    registry.set(id, { portfolio: group.portfolio, kind: group.kind, known: true });
  }
}

const unknown: ProductPresentation = { portfolio: 'other', kind: 'other', known: false };

export function registryPresentation(id: number): ProductPresentation {
  return registry.get(id) ?? unknown;
}

export function unmappedRegistryIds(ids: readonly number[]): number[] {
  return [...new Set(ids)].filter((id) => !registry.has(id));
}

/** Source mainSection enum, not a visible/localised label. */
export function portfolioForSection(section: string): PortfolioKey {
  const sections: Record<string, PortfolioKey> = { UHP: 'uhp', Hydraulic: 'hydraulic', Industrial: 'industrial', Fittings: 'fittings' };
  return sections[section] ?? 'other';
}

export function sortPortfolio<T>(items: readonly T[], getPortfolio: (item: T) => string): T[] {
  const rank = (key: string) => {
    const index = portfolioOrder.indexOf(key as PortfolioKey);
    return index < 0 ? portfolioOrder.length : index;
  };
  return items.map((item, index) => ({ item, index, rank: rank(getPortfolio(item)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ item }) => item);
}

function sortPresentation<T>(items: readonly T[], getPresentation: (item: T) => ProductPresentation, withinGroup?: (a: T, b: T) => number): T[] {
  return items.map((item, index) => ({ item, index, presentation: getPresentation(item) }))
    .sort((a, b) => productKindOrder.indexOf(a.presentation.kind) - productKindOrder.indexOf(b.presentation.kind)
      || portfolioOrder.indexOf(a.presentation.portfolio) - portfolioOrder.indexOf(b.presentation.portfolio)
      || Number(b.presentation.known) - Number(a.presentation.known)
      || (withinGroup?.(a.item, b.item) ?? 0)
      || a.index - b.index)
    .map(({ item }) => item);
}

/** Apply to filtered results BEFORE slicing/pagination; ties retain source order. */
export function sortRegistryPresentation<T>(items: readonly T[], getId: (item: T) => number, withinGroup?: (a: T, b: T) => number): T[] {
  return sortPresentation(items, (item) => registryPresentation(getId(item)), withinGroup);
}

const uhpFamilyKinds: Record<string, ProductKind> = {
  helix: 'hose', inserts: 'fitting', adapters: 'adapter', ferrules: 'ferrule', accessories: 'accessory', certificates: 'document',
};

function uhpPresentation(family: string): ProductPresentation {
  return { portfolio: 'uhp', kind: uhpFamilyKinds[family] ?? 'other', known: Object.hasOwn(uhpFamilyKinds, family) };
}

export function sortUhpProducts<T extends { family: string }>(items: readonly T[], withinGroup?: (a: T, b: T) => number): T[] {
  return sortPresentation(items, (item) => uhpPresentation(item.family), withinGroup);
}

export function sortUhpFamilies<T extends string>(families: readonly T[]): T[] {
  return sortPresentation(families, uhpPresentation);
}
