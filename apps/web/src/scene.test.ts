import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { type Model } from './model'
import { Top } from './page'
import { AppRoute } from './route'
import { update } from './update'
import { view } from './view'

const on = (route: AppRoute): Model => ({ route, topPage: Top.notLoaded })

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
          searchInput: '',
          characters: Top.Characters.Loaded({ characters: [] }),
        },
      }),
      expect(role('link', { name: '新規作成' })).toExist(),
      expect(text('まだキャラクターがいません')).toExist(),
    )
  })

  test('pages that are not built yet say so', () => {
    scene(
      { update, view },
      given(on(AppRoute.NewCharacter())),
      expect(role('heading', { name: 'キャラクターの新規作成' })).toExist(),
      expect(text('この画面は準備中です。')).toExist(),
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
