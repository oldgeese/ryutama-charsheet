import { Command, click, expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { CallPing } from './command'
import { Message } from './message'
import { Ping } from './model'
import { update } from './update'
import { view } from './view'

describe('view', () => {
  test('idle shows an enabled Ping button and no result', () => {
    scene(
      { update, view },
      given({ ping: Ping.PingIdle() }),
      expect(role('button', { name: 'Ping' })).not.toBeDisabled(),
      expect(text('pong', { exact: false })).not.toExist(),
      expect(text('エラー:', { exact: false })).not.toExist(),
    )
  })

  test('clicking Ping shows the loading state, then the result', () => {
    scene(
      { update, view },
      given({ ping: Ping.PingIdle() }),
      click(role('button', { name: 'Ping' })),
      expect(role('button', { name: '送信中…' })).toBeDisabled(),
      Command.resolve(
        CallPing,
        Message.SucceededPing({
          message: 'pong',
          at: '2026-10-20T00:00:00.000Z',
        }),
      ),
      expect(text('pong (2026-10-20T00:00:00.000Z)')).toExist(),
      expect(role('button', { name: 'Ping' })).not.toBeDisabled(),
    )
  })

  test('failure shows the code and message', () => {
    scene(
      { update, view },
      given({
        ping: Ping.PingFailure({
          code: 'functions/unavailable',
          message: 'down',
        }),
      }),
      expect(text('エラー: functions/unavailable down')).toExist(),
      expect(role('button', { name: 'Ping' })).not.toBeDisabled(),
    )
  })
})
