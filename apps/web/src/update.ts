import { Option } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import { LoadExternal, NavigateInternal } from './command'
import type { FirebaseService } from './firebase/service'
import { Message } from './message'
import type { Model } from './model'
import { CharacterPage, Top } from './page'
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

const toCharacterPageMessage = (message: CharacterPage.Message) =>
  Message.GotCharacterPageMessage({ message })

const readCharacterPage = (model: Model) => Option.some(model.characterPage)

const writeCharacterPage = (
  model: Model,
  nextCharacterPage: CharacterPage.Model,
): Model => modifyFields(model, { characterPage: () => nextCharacterPage })

const foldCharacterPage = Update.foldChild({
  update: CharacterPage.update,
  read: readCharacterPage,
  write: writeCharacterPage,
  toParentMessage: toCharacterPageMessage,
})

const loadCharacterPage = Update.foldChild({
  update: (_characterPage: CharacterPage.Model, id: string) =>
    CharacterPage.load(id),
  read: readCharacterPage,
  write: writeCharacterPage,
  toParentMessage: toCharacterPageMessage,
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
      return AppRoute.match(nextRoute, {
        Top: () => Update.combine(model, [setRoute(nextRoute), reloadTop]),
        Character: ({ id }) =>
          Update.combine(model, [setRoute(nextRoute), loadCharacterPage(id)]),
        NewCharacter: () => setRoute(nextRoute)(model),
        EditCharacter: () => setRoute(nextRoute)(model),
        NotFound: () => setRoute(nextRoute)(model),
      })
    },

    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    GotTopMessage: ({ message }) => foldTop(model, message),
    GotCharacterPageMessage: ({ message }) => foldCharacterPage(model, message),
  })
