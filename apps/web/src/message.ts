import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { CharacterPage, EditorPage, Top } from './page'

export const Message = defineMessageUnion({
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  GotTopMessage: { message: Top.Message },
  GotCharacterPageMessage: { message: CharacterPage.Message },
  GotEditorPageMessage: { message: EditorPage.Message },
})
export type Message = typeof Message.Type
