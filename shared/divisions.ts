/** Federal scope levels for motions (Geltungsbereich) and user affiliation. */
export const FEDERAL_DIVISIONS = [
  { slug: 'bund', name: 'Bund', parentSlug: null },
  { slug: 'baden-wuerttemberg', name: 'Baden-Württemberg', parentSlug: 'bund' },
  { slug: 'bayern', name: 'Bayern', parentSlug: 'bund' },
  { slug: 'berlin', name: 'Berlin', parentSlug: 'bund' },
  { slug: 'brandenburg', name: 'Brandenburg', parentSlug: 'bund' },
  { slug: 'bremen', name: 'Bremen', parentSlug: 'bund' },
  { slug: 'hamburg', name: 'Hamburg', parentSlug: 'bund' },
  { slug: 'hessen', name: 'Hessen', parentSlug: 'bund' },
  {
    slug: 'mecklenburg-vorpommern',
    name: 'Mecklenburg-Vorpommern',
    parentSlug: 'bund',
  },
  { slug: 'niedersachsen', name: 'Niedersachsen', parentSlug: 'bund' },
  { slug: 'nrw', name: 'Nordrhein-Westfalen', parentSlug: 'bund' },
  { slug: 'rheinland-pfalz', name: 'Rheinland-Pfalz', parentSlug: 'bund' },
  { slug: 'saarland', name: 'Saarland', parentSlug: 'bund' },
  { slug: 'sachsen', name: 'Sachsen', parentSlug: 'bund' },
  { slug: 'sachsen-anhalt', name: 'Sachsen-Anhalt', parentSlug: 'bund' },
  { slug: 'schleswig-holstein', name: 'Schleswig-Holstein', parentSlug: 'bund' },
  { slug: 'thueringen', name: 'Thüringen', parentSlug: 'bund' },
] as const

export type DivisionSlug = (typeof FEDERAL_DIVISIONS)[number]['slug']

export const DIVISION_SLUGS = FEDERAL_DIVISIONS.map((d) => d.slug)
