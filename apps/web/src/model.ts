import { Schema } from 'effect'

import { Top } from './page'
import { AppRoute } from './route'

export const Model = Schema.Struct({
  route: AppRoute,
  topPage: Top.Model,
})
export type Model = typeof Model.Type
