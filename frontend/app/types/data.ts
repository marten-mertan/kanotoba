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
