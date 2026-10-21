import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Top: {},
  NewCharacter: {},
  Character: { id: Schema.String },
  EditCharacter: { id: Schema.String },
  NotFound: { path: Schema.String },
})
export type AppRoute = typeof AppRoute.Type

export const topRouter = pipe(Route.root, Route.mapTo(AppRoute.Top))

export const newCharacterRouter = pipe(
  literal('characters'),
  slash(literal('new')),
  Route.mapTo(AppRoute.NewCharacter),
)

export const characterRouter = pipe(
  literal('characters'),
  slash(string('id')),
  Route.mapTo(AppRoute.Character),
)

export const editCharacterRouter = pipe(
  literal('characters'),
  slash(string('id')),
  slash(literal('edit')),
  Route.mapTo(AppRoute.EditCharacter),
)

const routeParser = Route.oneOf(
  newCharacterRouter,
  editCharacterRouter,
  characterRouter,
  topRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)
