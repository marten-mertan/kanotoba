export type KanjiData = {
  id: number
  character: string
  strokeCount: number
  meaningEn: string
  schoolGrade: number | null
}

export type AttributionObject = {
  dataset: string
  license: string
  licenseUrl: string
  notice: string
  repository: string
  revision: string
}

export type ExampleObject = {
  meaningEn: string
  order: number
  word: string
}

export type RadicalObject = {
  character: string
  meaningEn: string
  nameJa: string
  nameRomaji: string
  oreder: number
  positionJa: string
  positionRomaji: string
  strokeCount: number
}

export type YomiObject = {
  kana: string
  order: number
  romaji: string
}

export type KanjiItemReadingsData = {
  kunyomi: YomiObject[]
  onyomi: YomiObject[]
}

export type KanjiItemData = {
  id: number
  character: string
  sourceKey: string
  strokeCount: number
  meaningEn: string
  schoolGrade: number | null
  readings: KanjiItemReadingsData
  radical: RadicalObject
  examples: ExampleObject[]
  attribution: AttributionObject
}

export type GrammarTagLabel = {
  slug: string
  label_en: string
  label_ru: string
}

export type GrammarCategory = {
  slug: string
  nameEn: string
  nameRu: string
}

export type GrammarItemData = {
  id: number
  slug: string
  pattern: string
  reading: string
  romaji: string
  meaningEn: string
  meaningRu: string
  explanationEn: string
  explanationRu: string
  jlptLevel: string
  jlptLevelBasis: string
  register: string[]
  registerLabelEn: string
  registerLabelRu: string
  learningPriority: number
  isCore: boolean
  contentTier: string
  publicationStatus: string
  editorialReviewStatus: string
  tags: string[]
  tagLabels: GrammarTagLabel[]
  category: GrammarCategory
}

export type Pagination = {
  limit: number
  offset: number
  returned: number
}

export type GrammarCollectionResponse = {
  items: GrammarItemData[]
  pagination: Pagination
  previewMode?: boolean
}

export type Locale = 'en' | 'ru'
