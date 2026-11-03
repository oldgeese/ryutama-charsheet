import { Schema, SchemaTransformation } from 'effect'

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
  // 「地形+天候」を目標値とするチェックの、装備による修正値
  terrainGearModifiers: Schema.Record(Terrain, Schema.String),
  weatherGearModifiers: Schema.Record(Weather, Schema.String),
  // 同じ音楽を重ねて憶えることはないので、地形や天候ごとの有無で持つ
  learnedTerrainMusic: Schema.Record(Terrain, Schema.Boolean),
  learnedWeatherMusic: Schema.Record(Weather, Schema.Boolean),
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
  terrainGearModifiers: {
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
  weatherGearModifiers: {
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
  learnedTerrainMusic: {
    草原: false,
    荒野: false,
    林: false,
    丘陵: false,
    岩場: false,
    森: false,
    湿地: false,
    山: false,
    砂漠: false,
    密林: false,
    高山: false,
  },
  learnedWeatherMusic: {
    雨: false,
    強風: false,
    霧: false,
    暑い: false,
    寒い: false,
    豪雨: false,
    雪: false,
    濃霧: false,
    闇: false,
    大嵐: false,
    猛吹雪: false,
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

// 改名前の項目名（Issue #31）のシート。保存済みのドキュメントや、
// 改名前の画面から届く保存リクエストに残っている
const {
  terrainGearModifiers: terrainBonuses,
  weatherGearModifiers: weatherPenalties,
  ...unrenamedFields
} = CharacterSheet.fields

const LegacyCharacterSheet = Schema.Struct({
  ...unrenamedFields,
  terrainBonuses,
  weatherPenalties,
}).pipe(
  Schema.decodeTo(
    CharacterSheet,
    SchemaTransformation.transform({
      decode: ({ terrainBonuses, weatherPenalties, ...rest }) => ({
        ...rest,
        terrainGearModifiers: terrainBonuses,
        weatherGearModifiers: weatherPenalties,
      }),
      encode: ({ terrainGearModifiers, weatherGearModifiers, ...rest }) => ({
        ...rest,
        terrainBonuses: terrainGearModifiers,
        weatherPenalties: weatherGearModifiers,
      }),
    }),
  ),
)

// 今の項目名と改名前の項目名のどちらのシートも CharacterSheet にデコードする。
// 外から届くシート（Firestore のドキュメント、保存リクエスト）はこれでデコードする。
// 今の項目名を先に試すので、両方の名前を持つシートは今の項目名の値を使う
export const CharacterSheetFromAnyVersion = Schema.Union([
  CharacterSheet,
  LegacyCharacterSheet,
])
