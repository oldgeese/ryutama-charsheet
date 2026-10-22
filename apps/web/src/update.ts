import { Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import type { FirebaseService } from './firebase/service'
import { Message } from './message'
import type { Model } from './model'
import { Top } from './page'
import { AppRoute, urlToAppRoute } from './route'

export type UpdateReturn = Update.Return<Model, Message, FirebaseService>

const toTopMessage = (message: Top.Message) =>
  Message.GotTopMessage({ message })

const foldTop = Update.foldChild({
  update: Top.update,
  read: (model: Model) => Option.some(model.topPage),
  write: (model: Model, nextTopPage: Top.Model) =>
    modifyFields(model, { topPage: () => nextTopPage }),
  toParentMessage: toTopMessage,
})

const reloadTop = Update.foldChildStep({
  update: Top.reload,
  read: (model: Model) => Option.some(model.topPage),
  write: (model: Model, nextTopPage: Top.Model) =>
    modifyFields(model, { topPage: () => nextTopPage }),
  toParentMessage: toTopMessage,
})

const setRoute =
  (nextRoute: AppRoute): Update.Step<Model, Message, FirebaseService> =>
  model => ({ model: modifyFields(model, { route: () => nextRoute }) })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => {
      const nextRoute = urlToAppRoute(url)
      return AppRoute.guards.Top(nextRoute)
        ? Update.combine(model, [setRoute(nextRoute), reloadTop])
        : setRoute(nextRoute)(model)
    },

    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    GotTopMessage: ({ message }) => foldTop(model, message),
  })
