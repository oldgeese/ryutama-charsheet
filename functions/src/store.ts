import { Schema } from 'effect'
import { type Firestore, Timestamp } from 'firebase-admin/firestore'

import {
  CHARACTERS,
  CHARACTER_SECRETS,
  CHARACTER_SUMMARIES,
  CharacterSheet,
  CharacterSummary,
} from '@ryutama/character'

import { type CharacterStore } from './characters.js'

const StoredSecret = Schema.Struct({ salt: Schema.String, hash: Schema.String })
const decodeSheet = Schema.decodeUnknownSync(CharacterSheet)
const decodeSummary = Schema.decodeUnknownSync(CharacterSummary)
const decodeSecret = Schema.decodeUnknownSync(StoredSecret)

// characters/{id}         … { sheet }
// characterSummaries/{id} … 一覧用の項目と createdAt
// characterSecrets/{id}   … { salt, hash }
export const firestoreStore = (db: Firestore): CharacterStore => {
  const refs = (id: string) => ({
    character: db.collection(CHARACTERS).doc(id),
    summary: db.collection(CHARACTER_SUMMARIES).doc(id),
    secret: db.collection(CHARACTER_SECRETS).doc(id),
  })

  return {
    create: async ({ sheet, summary, secret, createdAt }) => {
      const { id } = db.collection(CHARACTERS).doc()
      const ref = refs(id)
      await db
        .batch()
        .create(ref.character, { sheet })
        .create(ref.summary, {
          ...summary,
          createdAt: Timestamp.fromDate(createdAt),
        })
        .create(ref.secret, { ...secret })
        .commit()
      return id
    },

    find: async id => {
      const ref = refs(id)
      const [character, summary, secret] = await db.getAll(
        ref.character,
        ref.summary,
        ref.secret,
      )
      if (!character?.exists || !summary?.exists || !secret?.exists) {
        return undefined
      }
      const createdAt: unknown = summary.get('createdAt')
      if (!(createdAt instanceof Timestamp)) {
        return undefined
      }
      const { createdAt: _, ...summaryFields } = summary.data() ?? {}
      return {
        sheet: decodeSheet(character.get('sheet')),
        summary: decodeSummary(summaryFields),
        secret: decodeSecret(secret.data()),
        createdAt: createdAt.toDate(),
      }
    },

    update: async (id, { sheet, summary }) => {
      const ref = refs(id)
      await db
        .batch()
        .update(ref.character, { sheet })
        .update(ref.summary, { ...summary })
        .commit()
    },
  }
}
