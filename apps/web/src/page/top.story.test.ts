import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { type ListedCharacter } from '../character'
import {
  Characters,
  FetchCharacters,
  Message,
  type Model,
  init,
  reload,
  update,
} from './top'

const lulu: ListedCharacter = {
  id: 'a',
  characterName: 'ルル',
  playerName: 'たろう',
  level: 1,
  classes: [],
  types: [],
}

const loaded: Model = {
  searchInput: 'ル',
  characters: Characters.Loaded({ characters: [lulu] }),
}

describe('top page', () => {
  test('init loads the characters', () => {
    const init_ = init()
    expect(init_.model.characters).toEqual(Characters.Loading())
    expect(init_.commands).toHaveLength(1)
  })

  test('SucceededFetchCharacters shows the list', () => {
    story(
      update,
      given(init().model),
      message(Message.SucceededFetchCharacters({ characters: [lulu] })),
      model(model => {
        expect(model.characters).toEqual(
          Characters.Loaded({ characters: [lulu] }),
        )
      }),
    )
  })

  test('FailedFetchCharacters keeps the error and ClickedRetry fetches again', () => {
    story(
      update,
      given(init().model),
      message(Message.FailedFetchCharacters({ message: 'offline' })),
      model(model => {
        expect(model.characters).toEqual(
          Characters.Failed({ message: 'offline' }),
        )
      }),
      message(Message.ClickedRetry()),
      Command.expectExact(FetchCharacters),
      model(model => {
        expect(model.characters).toEqual(Characters.Loading())
      }),
      Command.resolve(
        FetchCharacters,
        Message.SucceededFetchCharacters({ characters: [] }),
      ),
    )
  })

  test('UpdatedSearchInput keeps the loaded list', () => {
    story(
      update,
      given(loaded),
      message(Message.UpdatedSearchInput({ value: 'ボ' })),
      Command.expectNone(),
      model(model => {
        expect(model.searchInput).toBe('ボ')
        expect(model.characters).toEqual(loaded.characters)
      }),
    )
  })

  test('reload fetches again and keeps the search input', () => {
    const reload_ = reload(loaded)
    expect(reload_.model).toEqual({
      searchInput: 'ル',
      characters: Characters.Loading(),
    })
    expect(reload_.commands).toHaveLength(1)
  })
})
