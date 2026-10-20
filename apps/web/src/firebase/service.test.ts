import { Effect, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { type Callable, makeCall } from './service'

const Pong = Schema.Struct({ message: Schema.String, at: Schema.String })

const resolving =
  (data: unknown): Callable =>
  () =>
  () =>
    Promise.resolve({ data })

const rejecting =
  (error: unknown): Callable =>
  () =>
  () =>
    Promise.reject(error)

describe('makeCall', () => {
  test('decodes a successful response', async () => {
    const result = await Effect.runPromise(
      makeCall(resolving({ message: 'pong', at: 't' }))('ping', {}, Pong),
    )
    expect(result).toEqual({ message: 'pong', at: 't' })
  })

  test('fails with invalid-response when the response does not match the schema', async () => {
    const error = await Effect.runPromise(
      Effect.flip(makeCall(resolving({ message: 1 }))('ping', {}, Pong)),
    )
    expect(error._tag).toBe('FirebaseCallError')
    expect(error.code).toBe('invalid-response')
  })

  test('keeps the code and message of a Firebase error', async () => {
    const error = await Effect.runPromise(
      Effect.flip(
        makeCall(
          rejecting({ code: 'functions/unavailable', message: 'down' }),
        )('ping', {}, Pong),
      ),
    )
    expect(error).toMatchObject({
      code: 'functions/unavailable',
      message: 'down',
    })
  })

  test('uses unknown for errors without a code', async () => {
    const error = await Effect.runPromise(
      Effect.flip(makeCall(rejecting(new Error('boom')))('ping', {}, Pong)),
    )
    expect(error).toMatchObject({ code: 'unknown', message: 'boom' })
  })

  test('passes the function name and data to the callable', async () => {
    const calls: Array<[string, unknown]> = []
    const callable: Callable = name => data => {
      calls.push([name, data])
      return Promise.resolve({ data: { message: 'pong', at: 't' } })
    }
    await Effect.runPromise(makeCall(callable)('ping', { a: 1 }, Pong))
    expect(calls).toEqual([['ping', { a: 1 }]])
  })
})
