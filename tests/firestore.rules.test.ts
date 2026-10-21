import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, test } from 'vitest'

import {
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ryutama',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  })
})

afterAll(() => env.cleanup())

const PUBLIC = ['characters', 'characterSummaries']

describe('firestore.rules', () => {
  test.each(PUBLIC)('anyone can read %s', async name => {
    const db = env.unauthenticatedContext().firestore()
    await assertSucceeds(getDoc(doc(db, `${name}/x`)))
    await assertSucceeds(getDocs(collection(db, name)))
  })

  test.each(PUBLIC)('anyone is denied writing %s', async name => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, `${name}/x`), { name: 'test' }))
  })

  test('anyone is denied reading a character secret', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'characterSecrets/x')))
    await assertFails(getDocs(collection(db, 'characterSecrets')))
  })

  test('anyone is denied writing a character secret', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(setDoc(doc(db, 'characterSecrets/x'), { hash: 'x' }))
  })

  test('anyone is denied other collections', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'others/x')))
  })
})
