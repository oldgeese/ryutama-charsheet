import { Schema } from 'effect'

import { CharacterSheet } from './sheet.js'

const { fields } = CharacterSheet

// 一覧と検索に使う項目。シート本体とは別のフィールドに保存する
export const CharacterSummary = Schema.Struct({
  characterName: fields.characterName,
  playerName: fields.playerName,
  level: fields.level,
  classes: fields.classes,
  types: fields.types,
})
export type CharacterSummary = typeof CharacterSummary.Type

export const toSummary = (sheet: CharacterSheet): CharacterSummary => ({
  characterName: sheet.characterName,
  playerName: sheet.playerName,
  level: sheet.level,
  classes: sheet.classes,
  types: sheet.types,
})
