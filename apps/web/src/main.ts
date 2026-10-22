import { Update } from 'foldkit'
import type { Runtime } from 'foldkit'
import type { Url } from 'foldkit/url'

import type { FirebaseService } from './firebase/service'
import { Message } from './message'
import type { Model } from './model'
import { Top } from './page'
import { AppRoute, urlToAppRoute } from './route'

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  void,
  FirebaseService
> = (url: Url) => {
  const route = urlToAppRoute(url)
  return AppRoute.guards.Top(route)
    ? Update.foldChildInit(Top.init(), {
        toParentModel: topPage => ({ route, topPage }),
        toParentMessage: message => Message.GotTopMessage({ message }),
      })
    : { model: { route, topPage: Top.notLoaded } }
}
