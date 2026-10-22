import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { type Url, fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { emptySheet } from '@ryutama/character'

import { NavigateInternal } from './command'
import { init } from './main'
import { Message } from './message'
import { type Model } from './model'
import { CharacterPage, Top } from './page'
import { AppRoute } from './route'
import { update } from './update'

const url = (path: string): Url =>
  Option.getOrThrowWith(
    fromString(`http://localhost${path}`),
    () => new Error(`Failed to parse url: ${path}`),
  )

const onCharacter: Model = {
  route: AppRoute.Character({ id: 'a' }),
  topPage: {
    searchInput: 'ル',
    characters: Top.Characters.Loaded({ characters: [] }),
  },
  characterPage: CharacterPage.Sheet.Loaded({ id: 'a', sheet: emptySheet }),
}

describe('init', () => {
  test('loads the character list on the top page', () => {
    const init_ = init(url('/'))
    expect(init_.model.route).toEqual(AppRoute.Top())
    expect(init_.model.topPage.characters).toEqual(Top.Characters.Loading())
    expect(init_.commands).toHaveLength(1)
  })

  test('loads the character on its page', () => {
    const init_ = init(url('/characters/a'))
    expect(init_.model.route).toEqual(AppRoute.Character({ id: 'a' }))
    expect(init_.model.topPage.characters).toEqual(Top.Characters.NotLoaded())
    expect(init_.model.characterPage).toEqual(
      CharacterPage.Sheet.Loading({ id: 'a' }),
    )
    expect(init_.commands).toHaveLength(1)
  })

  test('loads nothing on pages that are not built yet', () => {
    const init_ = init(url('/characters/a/edit'))
    expect(init_.model.route).toEqual(AppRoute.EditCharacter({ id: 'a' }))
    expect(init_.model.topPage.characters).toEqual(Top.Characters.NotLoaded())
    expect(init_.model.characterPage).toEqual(CharacterPage.Sheet.NotLoaded())
    expect(init_.commands).toBeUndefined()
  })
})

describe('update', () => {
  test('ClickedLink to an internal url pushes it', () => {
    story(
      update,
      given(onCharacter),
      message(
        Message.ClickedLink({
          request: { _tag: 'Internal', url: url('/characters/new') },
        }),
      ),
      Command.expectExact(
        NavigateInternal({ url: 'http://localhost/characters/new' }),
      ),
      Command.resolve(
        NavigateInternal({ url: 'http://localhost/characters/new' }),
        Message.CompletedNavigateInternal(),
      ),
    )
  })

  test('coming back to the top page reloads the list and keeps the search', () => {
    story(
      update,
      given(onCharacter),
      message(Message.ChangedUrl({ url: url('/') })),
      model(model => {
        expect(model.route).toEqual(AppRoute.Top())
        expect(model.topPage).toEqual({
          searchInput: 'ル',
          characters: Top.Characters.Loading(),
        })
      }),
      Command.expectExact(Top.FetchCharacters),
      Command.resolve(
        Top.FetchCharacters,
        Top.Message.SucceededFetchCharacters({ characters: [] }),
      ),
    )
  })

  test('moving to a character page loads that character', () => {
    story(
      update,
      given(onCharacter),
      message(Message.ChangedUrl({ url: url('/characters/b') })),
      model(model => {
        expect(model.route).toEqual(AppRoute.Character({ id: 'b' }))
        expect(model.characterPage).toEqual(
          CharacterPage.Sheet.Loading({ id: 'b' }),
        )
      }),
      Command.expectExact(CharacterPage.FetchCharacter({ id: 'b' })),
      Command.resolve(
        CharacterPage.FetchCharacter({ id: 'b' }),
        CharacterPage.Message.MissingCharacter({ id: 'b' }),
      ),
      model(model => {
        expect(model.characterPage).toEqual(
          CharacterPage.Sheet.NotFound({ id: 'b' }),
        )
      }),
    )
  })

  test('moving to another page only changes the route', () => {
    story(
      update,
      given(onCharacter),
      message(Message.ChangedUrl({ url: url('/characters/a/edit') })),
      Command.expectNone(),
      model(model => {
        expect(model.route).toEqual(AppRoute.EditCharacter({ id: 'a' }))
        expect(model.topPage).toEqual(onCharacter.topPage)
        expect(model.characterPage).toEqual(onCharacter.characterPage)
      }),
    )
  })
})
