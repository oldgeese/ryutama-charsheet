import { Document, type Html, type HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Message } from './message'
import { type Model, Ping } from './model'

const TITLE = 'りゅうたま キャラクターシート'

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const isLoading = Ping.guards.PingLoading(model.ping)
  return {
    title: TITLE,
    body: h.main(
      [
        h.Class(
          'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
        ),
      ],
      [
        h.h1([h.Class('text-3xl font-bold text-gray-800')], [TITLE]),
        Button.view(
          {
            onClick: Message.ClickedPing(),
            isDisabled: isLoading,
            toView: attributes =>
              h.button(
                [...attributes.button, h.Class(buttonStyle)],
                [isLoading ? '送信中…' : 'Ping'],
              ),
          },
          h,
        ),
        pingResultView(model.ping, h),
      ],
    ),
  }
}

const pingResultView = (ping: Ping, h: HtmlBuilder<Message>): Html =>
  Ping.match(ping, {
    PingIdle: () => h.empty,
    PingLoading: () => h.empty,
    PingSuccess: ({ message, at }) =>
      h.p([h.Class('text-gray-800')], [`${message} (${at})`]),
    PingFailure: ({ code, message }) =>
      h.p([h.Class('text-red-700')], [`エラー: ${code} ${message}`]),
  })

// STYLE

const buttonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 transition disabled:opacity-50'
