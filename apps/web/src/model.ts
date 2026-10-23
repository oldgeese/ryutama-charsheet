import { Schema } from 'effect'

import { CharacterPage, EditorPage, Top } from './page'
import { AppRoute } from './route'

export const Model = Schema.Struct({
  route: AppRoute,
  topPage: Top.Model,
  characterPage: CharacterPage.Model,
  editorPage: EditorPage.Model,
})
export type Model = typeof Model.Type
