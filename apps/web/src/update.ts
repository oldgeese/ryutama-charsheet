import type { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { CallPing } from './command'
import type { FirebaseService } from './firebase/service'
import { Message } from './message'
import { type Model, Ping } from './model'

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message, FirebaseService>>(message, {
    ClickedPing: () =>
      Ping.guards.PingLoading(model.ping)
        ? { model }
        : {
            model: modifyFields(model, { ping: () => Ping.PingLoading() }),
            commands: [CallPing()],
          },
    SucceededPing: ({ message, at }) => ({
      model: modifyFields(model, {
        ping: () => Ping.PingSuccess({ message, at }),
      }),
    }),
    FailedPing: ({ code, message }) => ({
      model: modifyFields(model, {
        ping: () => Ping.PingFailure({ code, message }),
      }),
    }),
  })
