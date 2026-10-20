import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ClickedPing: {},
  SucceededPing: { message: Schema.String, at: Schema.String },
  FailedPing: { code: Schema.String, message: Schema.String },
})
export type Message = typeof Message.Type
