import { Effect, Schema } from 'effect'
import { Command } from 'foldkit'

import { FirebaseService } from './firebase/service'
import { Message } from './message'

const PingResponse = Schema.Struct({
  message: Schema.String,
  at: Schema.String,
})

export const CallPing = Command.define('CallPing', {
  messages: [Message.SucceededPing, Message.FailedPing],
  execute: Effect.gen(function* () {
    const firebase = yield* FirebaseService
    const response = yield* firebase.call('ping', {}, PingResponse)
    return Message.SucceededPing(response)
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        Message.FailedPing({ code: error.code, message: error.message }),
      ),
    ),
  ),
})
