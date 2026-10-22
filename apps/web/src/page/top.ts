import { Array, Effect, Schema } from 'effect'
import { Command, Submodel, type Update } from 'foldkit'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Input } from '@foldkit/ui'

import { ListedCharacter, searchCharacters } from '../character'
import { fetchListedCharacters } from '../firebase/characters'
import type { FirebaseService } from '../firebase/service'
import {
  characterRouter,
  editCharacterRouter,
  newCharacterRouter,
} from '../route'

// MODEL

export const Characters = defineTaggedUnion({
  NotLoaded: {},
  Loading: {},
  Loaded: { characters: Schema.Array(ListedCharacter) },
  Failed: { message: Schema.String },
})
export type Characters = typeof Characters.Type

export const Model = Schema.Struct({
  searchInput: Schema.String,
  characters: Characters,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedSearchInput: { value: Schema.String },
  ClickedRetry: {},
  SucceededFetchCharacters: { characters: Schema.Array(ListedCharacter) },
  FailedFetchCharacters: { message: Schema.String },
})
export type Message = typeof Message.Type

// COMMAND

export const FetchCharacters = Command.define('FetchCharacters', {
  messages: [Message.SucceededFetchCharacters, Message.FailedFetchCharacters],
  execute: fetchListedCharacters.pipe(
    Effect.map(characters => Message.SucceededFetchCharacters({ characters })),
    Effect.catch(error =>
      Effect.succeed(Message.FailedFetchCharacters({ message: error.message })),
    ),
  ),
})

// INIT

export type UpdateReturn = Update.Return<Model, Message, FirebaseService>

export const notLoaded: Model = {
  searchInput: '',
  characters: Characters.NotLoaded(),
}

export const reload = (model: Model): UpdateReturn => ({
  model: modifyFields(model, { characters: () => Characters.Loading() }),
  commands: [FetchCharacters()],
})

export const init = (): UpdateReturn => reload(notLoaded)

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    UpdatedSearchInput: ({ value }) => ({
      model: modifyFields(model, { searchInput: () => value }),
    }),
    ClickedRetry: () => reload(model),
    SucceededFetchCharacters: ({ characters }) => ({
      model: modifyFields(model, {
        characters: () => Characters.Loaded({ characters }),
      }),
    }),
    FailedFetchCharacters: ({ message }) => ({
      model: modifyFields(model, {
        characters: () => Characters.Failed({ message }),
      }),
    }),
  })

// VIEW

const joinNames = (names: ReadonlyArray<string>): string =>
  Array.join(names, '／')

const characterRowView = (
  character: ListedCharacter,
  h: HtmlBuilder<Message>,
): Html =>
  h.keyed('li')(
    character.id,
    [
      h.Class(
        'relative flex flex-wrap items-center gap-x-6 gap-y-1 border border-gray-200 rounded-lg p-4 hover:bg-gray-50',
      ),
    ],
    [
      h.div(
        [h.Class('flex-1 min-w-40')],
        [
          h.a(
            [
              h.Href(characterRouter({ id: character.id })),
              h.Class(
                'text-lg font-semibold text-gray-900 after:absolute after:inset-0',
              ),
            ],
            [character.characterName],
          ),
          h.p([h.Class('text-sm text-gray-600')], [character.playerName]),
        ],
      ),
      h.p([h.Class('text-gray-800')], [`Lv.${character.level}`]),
      h.p([h.Class('text-gray-800')], [joinNames(character.classes)]),
      h.p([h.Class('text-gray-800')], [joinNames(character.types)]),
      h.a(
        [
          h.Href(editCharacterRouter({ id: character.id })),
          h.AriaLabel(`${character.characterName}を編集`),
          h.Class(
            'relative z-10 px-3 py-1 border border-gray-300 rounded hover:bg-white',
          ),
        ],
        ['編集'],
      ),
    ],
  )

const characterListView = (
  characters: ReadonlyArray<ListedCharacter>,
  searchInput: string,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(characters, {
    onEmpty: () =>
      h.p([h.Class('text-gray-600')], ['まだキャラクターがいません']),
    onNonEmpty: () =>
      Array.match(searchCharacters(characters, searchInput), {
        onEmpty: () =>
          h.p([h.Class('text-gray-600')], ['一致するキャラクターはいません']),
        onNonEmpty: found =>
          h.ul(
            [h.Class('space-y-3')],
            Array.map(found, character => characterRowView(character, h)),
          ),
      }),
  })

const charactersView = (model: Model, h: HtmlBuilder<Message>): Html =>
  Characters.match(model.characters, {
    NotLoaded: () => h.empty,
    Loading: () => h.p([h.Class('text-gray-600')], ['読み込み中…']),
    Failed: ({ message }) =>
      h.div(
        [h.Class('space-y-2')],
        [
          h.p(
            [h.Class('text-red-700')],
            [`一覧を読み込めませんでした: ${message}`],
          ),
          Button.view(
            {
              onClick: Message.ClickedRetry(),
              toView: ({ button }) =>
                h.button(
                  [...button, h.Class(secondaryButtonStyle)],
                  ['再読み込み'],
                ),
            },
            h,
          ),
        ],
      ),
    Loaded: ({ characters }) =>
      characterListView(characters, model.searchInput, h),
  })

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center gap-4')],
        [
          h.a(
            [h.Href(newCharacterRouter()), h.Class(primaryButtonStyle)],
            ['新規作成'],
          ),
          h.search(
            [h.Class('flex-1 min-w-48')],
            [
              Input.view(
                {
                  id: 'character-search',
                  type: 'search',
                  value: model.searchInput,
                  placeholder: 'キャラクター名・PL名・クラス・タイプ',
                  onInput: value => Message.UpdatedSearchInput({ value }),
                  toView: ({ input, label }) =>
                    h.div(
                      [],
                      [
                        h.label(
                          [...label, h.Class('sr-only')],
                          ['キャラクターを検索'],
                        ),
                        h.input([
                          ...input,
                          h.Autocomplete('off'),
                          h.Class(
                            'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500',
                          ),
                        ]),
                      ],
                    ),
                },
                h,
              ),
            ],
          ),
        ],
      ),
      charactersView(model, h),
    ],
  ),
)

// STYLE

const primaryButtonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 rounded transition'

const secondaryButtonStyle =
  'border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded transition'
