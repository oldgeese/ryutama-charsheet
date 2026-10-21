import { HttpsError } from 'firebase-functions/v2/https'
import { describe, expect, test } from 'vitest'

import { emptySheet } from '@ryutama/character'

import {
  type CharacterStore,
  type StoredCharacter,
  createCharacter,
  duplicateCharacter,
  updateCharacter,
} from './characters.js'

const NOW = new Date('2026-10-21T12:00:00.000Z')

const makeStore = () => {
  const records = new Map<string, StoredCharacter>()
  const store: CharacterStore = {
    create: async record => {
      const id = `id${records.size + 1}`
      records.set(id, record)
      return id
    },
    find: async id => records.get(id),
    update: async (id, { sheet, summary }) => {
      const record = records.get(id)
      if (record !== undefined) {
        records.set(id, { ...record, sheet, summary })
      }
    },
  }
  return { store, records }
}

const sheet = { ...emptySheet, characterName: 'ルル', playerName: 'たろう' }

const expectHttpsError = async (promise: Promise<unknown>, code: string) => {
  const error = await promise.then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(error).toBeInstanceOf(HttpsError)
  expect(error).toMatchObject({ code })
}

describe('createCharacter', () => {
  test('stores the sheet, its summary and a hashed password', async () => {
    const { store, records } = makeStore()
    const { id } = await createCharacter(
      store,
      { sheet, password: 'ひみつ' },
      NOW,
    )

    const record = records.get(id)
    expect(record?.sheet).toEqual(sheet)
    expect(record?.summary).toEqual({
      characterName: 'ルル',
      playerName: 'たろう',
      level: 1,
      classes: [],
      types: [],
    })
    expect(record?.createdAt).toEqual(NOW)
    expect(JSON.stringify(record?.secret)).not.toContain('ひみつ')
  })

  test('rejects an empty password', async () => {
    const { store, records } = makeStore()
    await expectHttpsError(
      createCharacter(store, { sheet, password: '' }, NOW),
      'invalid-argument',
    )
    expect(records.size).toBe(0)
  })

  test('rejects an invalid sheet', async () => {
    const { store } = makeStore()
    await expectHttpsError(
      createCharacter(
        store,
        { sheet: { ...sheet, level: 99 }, password: 'ひみつ' },
        NOW,
      ),
      'invalid-argument',
    )
  })
})

describe('updateCharacter', () => {
  test('overwrites the sheet and summary when the password matches', async () => {
    const { store, records } = makeStore()
    const { id } = await createCharacter(
      store,
      { sheet, password: 'ひみつ' },
      NOW,
    )
    const updated = { ...sheet, level: 2 }

    expect(
      await updateCharacter(store, { id, sheet: updated, password: 'ひみつ' }),
    ).toEqual({ id })
    expect(records.get(id)?.sheet).toEqual(updated)
    expect(records.get(id)?.summary.level).toBe(2)
    expect(records.get(id)?.createdAt).toEqual(NOW)
  })

  test('is denied with a wrong password and keeps the sheet', async () => {
    const { store, records } = makeStore()
    const { id } = await createCharacter(
      store,
      { sheet, password: 'ひみつ' },
      NOW,
    )

    await expectHttpsError(
      updateCharacter(store, {
        id,
        sheet: { ...sheet, level: 2 },
        password: 'ちがう',
      }),
      'permission-denied',
    )
    expect(records.get(id)?.sheet).toEqual(sheet)
  })

  test('fails with not-found for an unknown id', async () => {
    const { store } = makeStore()
    await expectHttpsError(
      updateCharacter(store, { id: 'nope', sheet, password: 'ひみつ' }),
      'not-found',
    )
  })
})

describe('duplicateCharacter', () => {
  test('copies the character with the same password', async () => {
    const { store, records } = makeStore()
    const { id } = await createCharacter(
      store,
      { sheet, password: 'ひみつ' },
      NOW,
    )
    const later = new Date('2026-10-22T00:00:00.000Z')

    const copy = await duplicateCharacter(
      store,
      { id, password: 'ひみつ' },
      later,
    )

    expect(copy.id).not.toBe(id)
    expect(records.get(copy.id)?.sheet).toEqual(sheet)
    expect(records.get(copy.id)?.createdAt).toEqual(later)
    expect(
      await updateCharacter(store, {
        id: copy.id,
        sheet,
        password: 'ひみつ',
      }),
    ).toEqual({ id: copy.id })
  })

  test('is denied with a wrong password', async () => {
    const { store, records } = makeStore()
    const { id } = await createCharacter(
      store,
      { sheet, password: 'ひみつ' },
      NOW,
    )

    await expectHttpsError(
      duplicateCharacter(store, { id, password: 'ちがう' }, NOW),
      'permission-denied',
    )
    expect(records.size).toBe(1)
  })

  test('fails with not-found for an unknown id', async () => {
    const { store } = makeStore()
    await expectHttpsError(
      duplicateCharacter(store, { id: 'nope', password: 'ひみつ' }, NOW),
      'not-found',
    )
  })
})
