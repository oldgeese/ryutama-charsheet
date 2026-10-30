import { Schema } from 'effect'

import {
  AbilityDie,
  CharacterClass,
  CharacterType,
  MAX_CLASSES,
  MAX_LEVEL,
  MAX_TYPES,
  MIN_LEVEL,
  StatusEffect,
  Terrain,
  Weather,
} from './rules.js'

// 旅人キャラクターシート（ルールブック p.174〜175）
// 一覧や検索に使う項目と値の範囲がルールで決まっている項目だけ型を付け、
// 残りはシートに書き込むのと同じように自由な文字列にする

const ClassAbility = Schema.Struct({
  name: Schema.String,
  checkAbilities: Schema.String,
  effect: Schema.String,
})
export type ClassAbility = typeof ClassAbility.Type

const Weapon = Schema.Struct({
  name: Schema.String,
  accuracy: Schema.String,
  damage: Schema.String,
  durability: Schema.String,
  notes: Schema.String,
})
export type Weapon = typeof Weapon.Type

const Armor = Schema.Struct({
  name: Schema.String,
  defense: Schema.String,
  penalty: Schema.String,
  durability: Schema.String,
  notes: Schema.String,
})
export type Armor = typeof Armor.Type

const TravelGear = Schema.Struct({
  name: Schema.String,
  notes: Schema.String,
})
export type TravelGear = typeof TravelGear.Type

export const CharacterSheet = Schema.Struct({
  // 1 ページ目
  dragonName: Schema.String,
  createdOn: Schema.String,
  characterName: Schema.String,
  playerName: Schema.String,
  level: Schema.Int.check(
    Schema.isBetween({ minimum: MIN_LEVEL, maximum: MAX_LEVEL }),
  ),
  exp: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  gender: Schema.String,
  age: Schema.String,
  classes: Schema.Array(CharacterClass).check(Schema.isMaxLength(MAX_CLASSES)),
  types: Schema.Array(CharacterType).check(Schema.isMaxLength(MAX_TYPES)),
  classAbilities: Schema.Array(ClassAbility),
  weaponProficiency: Schema.String,
  favoredTerrainAndWeather: Schema.String,
  favoriteItem: Schema.String,
  appearance: Schema.String,
  hometownAndReason: Schema.String,
  memo: Schema.String,

  // 2 ページ目
  abilities: Schema.Struct({
    strength: AbilityDie,
    dexterity: AbilityDie,
    intelligence: AbilityDie,
    spirit: AbilityDie,
  }),
  hp: Schema.Struct({ max: Schema.String, current: Schema.String }),
  mp: Schema.Struct({ max: Schema.String, current: Schema.String }),
  condition: Schema.String,
  fumblePoints: Schema.String,
  initiative: Schema.String,
  weapons: Schema.Array(Weapon),
  armors: Schema.Array(Armor),
  travelGear: Schema.Array(TravelGear),
  terrainBonuses: Schema.Record(Terrain, Schema.String),
  weatherPenalties: Schema.Record(Weather, Schema.String),
  statusEffects: Schema.Record(StatusEffect, Schema.String),
})
export type CharacterSheet = typeof CharacterSheet.Type

export const emptySheet: CharacterSheet = {
  dragonName: '',
  createdOn: '',
  characterName: '',
  playerName: '',
  level: MIN_LEVEL,
  exp: 0,
  gender: '',
  age: '',
  classes: [],
  types: [],
  classAbilities: [],
  weaponProficiency: '',
  favoredTerrainAndWeather: '',
  favoriteItem: '',
  appearance: '',
  hometownAndReason: '',
  memo: '',
  abilities: { strength: 6, dexterity: 6, intelligence: 6, spirit: 6 },
  hp: { max: '', current: '' },
  mp: { max: '', current: '' },
  condition: '',
  fumblePoints: '',
  initiative: '',
  weapons: [],
  armors: [],
  travelGear: [],
  terrainBonuses: {
    草原: '',
    荒野: '',
    林: '',
    丘陵: '',
    岩場: '',
    森: '',
    湿地: '',
    山: '',
    砂漠: '',
    密林: '',
    高山: '',
  },
  weatherPenalties: {
    雨: '',
    強風: '',
    霧: '',
    暑い: '',
    寒い: '',
    豪雨: '',
    雪: '',
    濃霧: '',
    闇: '',
    大嵐: '',
    猛吹雪: '',
  },
  statusEffects: {
    大ケガ: '',
    毒: '',
    病気: '',
    だるい: '',
    ハイ: '',
    ショック: '',
  },
}
