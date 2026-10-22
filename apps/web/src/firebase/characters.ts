import { Array, Effect, Schema } from 'effect'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

import { CHARACTER_SUMMARIES } from '@ryutama/character'

import { ListedCharacter } from '../character'
import { FirebaseService } from './service'

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
    Array.map(snapshot.docs, doc =>
      decodeListedCharacter({ ...doc.data(), id: doc.id }),
    ),
  )
})
