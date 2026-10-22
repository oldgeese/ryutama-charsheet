import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'

import { Message } from './message'
import type { Model } from './model'
import { CharacterPage, Top } from './page'
import { AppRoute, topRouter } from './route'

const TITLE = 'りゅうたま キャラクターシート'

const placeholderView = (heading: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('space-y-4')],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-800')], [heading]),
      h.p([h.Class('text-gray-600')], ['この画面は準備中です。']),
      h.a(
        [h.Href(topRouter()), h.Class('text-gray-700 underline')],
        ['一覧に戻る'],
      ),
    ],
  )

const pageView = (model: Model, h: HtmlBuilder<Message>): Html =>
  AppRoute.match(model.route, {
    Top: () =>
      h.submodel({
        slotId: 'top',
        model: model.topPage,
        view: Top.view,
        toParentMessage: message => Message.GotTopMessage({ message }),
      }),
    NewCharacter: () => placeholderView('キャラクターの新規作成', h),
    Character: () =>
      h.submodel({
        slotId: 'character',
        model: model.characterPage,
        view: CharacterPage.view,
        toParentMessage: message =>
          Message.GotCharacterPageMessage({ message }),
      }),
    EditCharacter: () => placeholderView('キャラクターの編集', h),
    NotFound: () =>
      h.div(
        [h.Class('space-y-4')],
        [
          h.h2(
            [h.Class('text-2xl font-bold text-gray-800')],
            ['ページが見つかりません'],
          ),
          h.a(
            [h.Href(topRouter()), h.Class('text-gray-700 underline')],
            ['一覧に戻る'],
          ),
        ],
      ),
  })

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: TITLE,
  body: h.div(
    [h.Class('min-h-screen bg-white')],
    [
      h.header(
        [h.Class('border-b border-gray-200 px-4 py-4')],
        [
          h.h1(
            [h.Class('max-w-4xl mx-auto text-2xl font-bold text-gray-800')],
            [h.a([h.Href(topRouter())], [TITLE])],
          ),
        ],
      ),
      h.main([h.Class('max-w-4xl mx-auto px-4 py-6')], [pageView(model, h)]),
    ],
  ),
})
