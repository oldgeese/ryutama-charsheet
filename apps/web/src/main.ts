import { Update } from 'foldkit'
import type { Runtime } from 'foldkit'
import type { Url } from 'foldkit/url'

import type { FirebaseService } from './firebase/service'
import { Message } from './message'
import type { Model } from './model'
import { CharacterPage, EditorPage, Top } from './page'
import { AppRoute, urlToAppRoute } from './route'

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  void,
  FirebaseService
> = (url: Url) => {
  const route = urlToAppRoute(url)
  const pages = {
    topPage: Top.notLoaded,
    characterPage: CharacterPage.notLoaded,
    editorPage: EditorPage.notLoaded,
  }
  return AppRoute.match(route, {
    Top: () =>
      Update.foldChildInit(Top.init(), {
        toParentModel: topPage => ({ ...pages, route, topPage }),
        toParentMessage: message => Message.GotTopMessage({ message }),
      }),
    Character: ({ id }) =>
      Update.foldChildInit(CharacterPage.init(id), {
        toParentModel: characterPage => ({ ...pages, route, characterPage }),
        toParentMessage: message =>
          Message.GotCharacterPageMessage({ message }),
      }),
    NewCharacter: () =>
      Update.foldChildInit(EditorPage.initNew(), {
        toParentModel: editorPage => ({ ...pages, route, editorPage }),
        toParentMessage: message => Message.GotEditorPageMessage({ message }),
      }),
    EditCharacter: ({ id }) =>
      Update.foldChildInit(EditorPage.initEdit(id), {
        toParentModel: editorPage => ({ ...pages, route, editorPage }),
        toParentMessage: message => Message.GotEditorPageMessage({ message }),
      }),
    NotFound: () => ({ model: { ...pages, route } }),
  })
}
