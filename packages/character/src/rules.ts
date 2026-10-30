import { Schema } from 'effect'

// ルールブック（基本ルール）の用語。表記はルールブックのまま

export const CharacterClass = Schema.Literals([
  'ミンストレル',
  'マーチャント',
  'ハンター',
  'ヒーラー',
  'ファーマー',
  'クラフト',
  'ノーブル',
])
export type CharacterClass = typeof CharacterClass.Type

export const CharacterType = Schema.Literals([
  'アタックタイプ',
  'テクニックタイプ',
  'マジックタイプ',
])
export type CharacterType = typeof CharacterType.Type

export const AbilityDie = Schema.Literals([4, 6, 8, 10, 12])
export type AbilityDie = typeof AbilityDie.Type

export const Terrain = Schema.Literals([
  '草原',
  '荒野',
  '林',
  '丘陵',
  '岩場',
  '森',
  '湿地',
  '山',
  '砂漠',
  '密林',
  '高山',
])
export type Terrain = typeof Terrain.Type

export const Weather = Schema.Literals([
  '雨',
  '強風',
  '霧',
  '暑い',
  '寒い',
  '豪雨',
  '雪',
  '濃霧',
  '闇',
  '大嵐',
  '猛吹雪',
])
export type Weather = typeof Weather.Type

export const StatusEffect = Schema.Literals([
  '大ケガ',
  '毒',
  '病気',
  'だるい',
  'ハイ',
  'ショック',
])
export type StatusEffect = typeof StatusEffect.Type

export const MIN_LEVEL = 1
export const MAX_LEVEL = 10

// レベル 5 でクラス、レベル 6 でタイプを追加で取得する。すでに持っているものを重ねて取得してもよい
export const MAX_CLASSES = 2
export const MAX_TYPES = 2
