import { Update } from 'foldkit'
import type { Runtime } from 'foldkit'
import type { Url } from 'foldkit/url'

import type { FirebaseService } from './firebase/service'
import { Message } from './message'
import type { Model } from './model'
import { CharacterPage, Top } from './page'
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
    NewCharacter: () => ({ model: { ...pages, route } }),
    EditCharacter: () => ({ model: { ...pages, route } }),
    NotFound: () => ({ model: { ...pages, route } }),
  })
}
