import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const Ping = defineTaggedUnion({
  PingIdle: {},
  PingLoading: {},
  PingSuccess: { message: Schema.String, at: Schema.String },
  PingFailure: { code: Schema.String, message: Schema.String },
})
export type Ping = typeof Ping.Type

export const Model = Schema.Struct({ ping: Ping })
export type Model = typeof Model.Type
