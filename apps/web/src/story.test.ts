import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { CallPing } from './command'
import { Message } from './message'
import { type Model, Ping } from './model'
import { update } from './update'

const idle: Model = { ping: Ping.PingIdle() }

describe('update', () => {
  test('ClickedPing starts loading and calls ping', () => {
    story(
      update,
      given(idle),
      message(Message.ClickedPing()),
      Command.expectExact(CallPing),
      model(model => {
        expect(model.ping._tag).toBe('PingLoading')
      }),
      Command.resolve(
        CallPing,
        Message.SucceededPing({ message: 'pong', at: 't' }),
      ),
    )
  })

  test('SucceededPing shows the response', () => {
    story(
      update,
      given(idle),
      message(Message.ClickedPing()),
      Command.resolve(
        CallPing,
        Message.SucceededPing({
          message: 'pong',
          at: '2026-10-20T00:00:00.000Z',
        }),
      ),
      model(model => {
        expect(model.ping).toEqual(
          Ping.PingSuccess({ message: 'pong', at: '2026-10-20T00:00:00.000Z' }),
        )
      }),
    )
  })

  test('FailedPing keeps the error and allows another ping', () => {
    story(
      update,
      given(idle),
      message(Message.ClickedPing()),
      Command.resolve(
        CallPing,
        Message.FailedPing({ code: 'functions/unavailable', message: 'down' }),
      ),
      model(model => {
        expect(model.ping).toEqual(
          Ping.PingFailure({ code: 'functions/unavailable', message: 'down' }),
        )
      }),
      message(Message.ClickedPing()),
      Command.expectExact(CallPing),
      model(model => {
        expect(model.ping._tag).toBe('PingLoading')
      }),
      Command.resolve(
        CallPing,
        Message.SucceededPing({ message: 'pong', at: 't' }),
      ),
    )
  })

  test('ClickedPing while loading is ignored', () => {
    story(
      update,
      given({ ping: Ping.PingLoading() }),
      message(Message.ClickedPing()),
      Command.expectNone(),
      model(model => {
        expect(model.ping._tag).toBe('PingLoading')
      }),
    )
  })
})
