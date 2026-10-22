import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { type CharacterSheet, emptySheet } from '@ryutama/character'

import { FetchCharacter, Message, Sheet, init, load, update } from './character'

const lulu: CharacterSheet = { ...emptySheet, characterName: 'ルル' }

describe('character page', () => {
  test('init loads the character', () => {
    const init_ = init('a')
    expect(init_.model).toEqual(Sheet.Loading({ id: 'a' }))
    expect(init_.commands).toHaveLength(1)
  })

  test('SucceededFetchCharacter shows the sheet', () => {
    story(
      update,
      given(init('a').model),
      message(Message.SucceededFetchCharacter({ id: 'a', sheet: lulu })),
      model(model => {
        expect(model).toEqual(Sheet.Loaded({ id: 'a', sheet: lulu }))
      }),
    )
  })

  test('MissingCharacter shows not found', () => {
    story(
      update,
      given(init('a').model),
      message(Message.MissingCharacter({ id: 'a' })),
      model(model => {
        expect(model).toEqual(Sheet.NotFound({ id: 'a' }))
      }),
    )
  })

  test('FailedFetchCharacter keeps the error and ClickedRetry fetches again', () => {
    story(
      update,
      given(init('a').model),
      message(Message.FailedFetchCharacter({ id: 'a', message: 'offline' })),
      model(model => {
        expect(model).toEqual(Sheet.Failed({ id: 'a', message: 'offline' }))
      }),
      message(Message.ClickedRetry()),
      Command.expectExact(FetchCharacter({ id: 'a' })),
      model(model => {
        expect(model).toEqual(Sheet.Loading({ id: 'a' }))
      }),
      Command.resolve(
        FetchCharacter({ id: 'a' }),
        Message.MissingCharacter({ id: 'a' }),
      ),
    )
  })

  test('ignores the result for a character that is no longer shown', () => {
    story(
      update,
      given(load('b').model),
      message(Message.SucceededFetchCharacter({ id: 'a', sheet: lulu })),
      message(Message.MissingCharacter({ id: 'a' })),
      message(Message.FailedFetchCharacter({ id: 'a', message: 'offline' })),
      model(model => {
        expect(model).toEqual(Sheet.Loading({ id: 'b' }))
      }),
    )
  })
})
