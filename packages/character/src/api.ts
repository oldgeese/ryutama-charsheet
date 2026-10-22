import { Schema } from 'effect'

import { CharacterSheet } from './sheet.js'

// Firestore のコレクション名。書き込みは Functions だけが行う
export const CHARACTERS = 'characters'
export const CHARACTER_SUMMARIES = 'characterSummaries'
export const CHARACTER_SECRETS = 'characterSecrets'

// callable Functions の入出力
export const CreateCharacterRequest = Schema.Struct({
  sheet: CharacterSheet,
  password: Schema.String.check(Schema.isMinLength(1)),
})
export type CreateCharacterRequest = typeof CreateCharacterRequest.Type

export const UpdateCharacterRequest = Schema.Struct({
  id: Schema.String,
  sheet: CharacterSheet,
  password: Schema.String,
})
export type UpdateCharacterRequest = typeof UpdateCharacterRequest.Type

export const DuplicateCharacterRequest = Schema.Struct({
  id: Schema.String,
  password: Schema.String,
})
export type DuplicateCharacterRequest = typeof DuplicateCharacterRequest.Type

export const CharacterIdResponse = Schema.Struct({ id: Schema.String })
export type CharacterIdResponse = typeof CharacterIdResponse.Type
