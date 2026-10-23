import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { emptySheet } from '@ryutama/character'

import { type Model } from './model'
import { CharacterPage, EditorPage, Top } from './page'
import { AppRoute } from './route'
import { update } from './update'
import { view } from './view'

const on = (route: AppRoute): Model => ({
  route,
  topPage: Top.notLoaded,
  characterPage: CharacterPage.notLoaded,
  editorPage: EditorPage.notLoaded,
})

describe('view', () => {
  test('the site title links to the top page', () => {
    scene(
      { update, view },
      given(on(AppRoute.Character({ id: 'a' }))),
      expect(
        role('link', { name: 'りゅうたま キャラクターシート' }),
      ).toHaveAttr('href', '/'),
    )
  })

  test('the top page shows the character list', () => {
    scene(
      { update, view },
      given({
        route: AppRoute.Top(),
        topPage: {
          ...Top.notLoaded,
          characters: Top.Characters.Loaded({ characters: [] }),
        },
        characterPage: CharacterPage.notLoaded,
        editorPage: EditorPage.notLoaded,
      }),
      expect(role('link', { name: '新規作成' })).toExist(),
      expect(text('まだキャラクターがいません')).toExist(),
    )
  })

  test('a character page shows the sheet', () => {
    scene(
      { update, view },
      given({
        ...on(AppRoute.Character({ id: 'a' })),
        characterPage: CharacterPage.Sheet.Loaded({
          id: 'a',
          sheet: { ...emptySheet, characterName: 'ルル' },
        }),
      }),
      expect(role('heading', { name: 'ルル' })).toExist(),
    )
  })

  test('the new character page shows the form', () => {
    scene(
      { update, view },
      given({
        ...on(AppRoute.NewCharacter()),
        editorPage: EditorPage.initNew().model,
      }),
      expect(role('heading', { name: 'キャラクターの新規作成' })).toExist(),
    )
  })

  test('the edit page shows the form', () => {
    scene(
      { update, view },
      given({
        ...on(AppRoute.EditCharacter({ id: 'a' })),
        editorPage: EditorPage.update(
          EditorPage.load('a').model,
          EditorPage.Message.SucceededFetchCharacter({
            id: 'a',
            sheet: { ...emptySheet, characterName: 'ルル' },
          }),
        ).model,
      }),
      expect(role('heading', { name: 'キャラクターの編集' })).toExist(),
      expect(role('textbox', { name: 'キャラクター名' })).toHaveValue('ルル'),
    )
  })

  test('an unknown url shows not found', () => {
    scene(
      { update, view },
      given(on(AppRoute.NotFound({ path: '/nope' }))),
      expect(role('heading', { name: 'ページが見つかりません' })).toExist(),
      expect(role('link', { name: '一覧に戻る' })).toHaveAttr('href', '/'),
    )
  })
})
