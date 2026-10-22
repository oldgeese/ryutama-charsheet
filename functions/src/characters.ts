import { Schema } from 'effect'
import { HttpsError } from 'firebase-functions/v2/https'

import {
  type CharacterIdResponse,
  type CharacterSheet,
  type CharacterSummary,
  CreateCharacterRequest,
  DuplicateCharacterRequest,
  UpdateCharacterRequest,
  toSummary,
} from '@ryutama/character'

import { type PasswordHash, hashPassword, verifyPassword } from './password.js'

export type StoredCharacter = {
  readonly sheet: CharacterSheet
  readonly summary: CharacterSummary
  readonly secret: PasswordHash
  readonly createdAt: Date
}

// characters / characterSummaries / characterSecrets をまとめて扱う保存先
export type CharacterStore = {
  readonly create: (record: StoredCharacter) => Promise<string>
  readonly find: (id: string) => Promise<StoredCharacter | undefined>
  readonly update: (
    id: string,
    record: Pick<StoredCharacter, 'sheet' | 'summary'>,
  ) => Promise<void>
}

const decode = <S extends Schema.Top & { readonly DecodingServices: never }>(
  schema: S,
  data: unknown,
): S['Type'] => {
  const exit = Schema.decodeUnknownExit(schema)(data)
  if (exit._tag === 'Failure') {
    throw new HttpsError('invalid-argument', '入力が正しくありません')
  }
  return exit.value
}

const findVerified = async (
  store: CharacterStore,
  id: string,
  password: string,
): Promise<StoredCharacter> => {
  const record = await store.find(id)
  if (record === undefined) {
    throw new HttpsError('not-found', 'キャラクターが見つかりません')
  }
  if (!(await verifyPassword(password, record.secret))) {
    throw new HttpsError('permission-denied', 'パスワードが違います')
  }
  return record
}

export const createCharacter = async (
  store: CharacterStore,
  data: unknown,
  now: Date,
): Promise<CharacterIdResponse> => {
  const { sheet, password } = decode(CreateCharacterRequest, data)
  const id = await store.create({
    sheet,
    summary: toSummary(sheet),
    secret: await hashPassword(password),
    createdAt: now,
  })
  return { id }
}

export const updateCharacter = async (
  store: CharacterStore,
  data: unknown,
): Promise<CharacterIdResponse> => {
  const { id, sheet, password } = decode(UpdateCharacterRequest, data)
  await findVerified(store, id, password)
  await store.update(id, { sheet, summary: toSummary(sheet) })
  return { id }
}

export const duplicateCharacter = async (
  store: CharacterStore,
  data: unknown,
  now: Date,
): Promise<CharacterIdResponse> => {
  const { id, password } = decode(DuplicateCharacterRequest, data)
  const original = await findVerified(store, id, password)
  const copyId = await store.create({ ...original, createdAt: now })
  return { id: copyId }
}
