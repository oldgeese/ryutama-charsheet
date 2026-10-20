import type { Runtime } from 'foldkit'

import type { Message } from './message'
import { type Model, Ping } from './model'

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { ping: Ping.PingIdle() },
})
