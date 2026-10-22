import { Array, Effect, Option, Schema } from 'effect'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'

import {
  CHARACTERS,
  CHARACTER_SUMMARIES,
  CharacterIdResponse,
  CharacterSheet,
  type CreateCharacterRequest,
  type UpdateCharacterRequest,
} from '@ryutama/character'

import { ListedCharacter } from '../character'
import { type FirebaseCallError, FirebaseService } from './service'

export class FirestoreReadError extends Schema.TaggedError<FirestoreReadError>()(
  'FirestoreReadError',
  { message: Schema.String },
) {}

const decodeListedCharacter = Schema.decodeUnknownOption(ListedCharacter)

// NOTE: Schema に合わないドキュメントは一覧から外す。1 件の不正なデータで一覧全体が見られなくならないようにするため
export const fetchListedCharacters = Effect.gen(function* () {
  const { firestore } = yield* FirebaseService
  const snapshot = yield* Effect.tryPromise({
    try: () =>
      getDocs(
        query(
          collection(firestore, CHARACTER_SUMMARIES),
          orderBy('createdAt', 'desc'),
        ),
      ),
    catch: error => new FirestoreReadError({ message: String(error) }),
  })
  return Array.getSomes(
    Array.map(snapshot.docs, summary =>
      decodeListedCharacter({ ...summary.data(), id: summary.id }),
    ),
  )
})

const decodeStoredCharacter = Schema.decodeUnknownOption(
  Schema.Struct({ sheet: CharacterSheet }),
)

// ドキュメントがなければ Option.none を返す
export const fetchCharacter = (id: string) =>
  Effect.gen(function* () {
    const { firestore } = yield* FirebaseService
    const snapshot = yield* Effect.tryPromise({
      try: () => getDoc(doc(firestore, CHARACTERS, id)),
      catch: error => new FirestoreReadError({ message: String(error) }),
    })
    if (!snapshot.exists()) {
      return Option.none<CharacterSheet>()
    }
    const { sheet } = yield* Option.match(
      decodeStoredCharacter(snapshot.data()),
      {
        onNone: () =>
          Effect.fail(
            new FirestoreReadError({ message: 'シートのデータが壊れています' }),
          ),
        onSome: Effect.succeed,
      },
    )
    return Option.some(sheet)
  })

export const createCharacter = (request: CreateCharacterRequest) =>
  Effect.gen(function* () {
    const { call } = yield* FirebaseService
    return yield* call('createCharacter', request, CharacterIdResponse)
  })

export const updateCharacter = (request: UpdateCharacterRequest) =>
  Effect.gen(function* () {
    const { call } = yield* FirebaseService
    return yield* call('updateCharacter', request, CharacterIdResponse)
  })

// NOTE: Functions のメッセージには環境によって「 [403]」のような後ろ書きが付くので、決まったエラーは文言をこちらで持つ
export const saveErrorMessage = (error: FirebaseCallError): string => {
  switch (error.code) {
    case 'functions/permission-denied':
      return 'パスワードが違います'
    case 'functions/not-found':
      return 'キャラクターが見つかりません'
    default:
      return `保存できませんでした: ${error.message}`
  }
}
