import { Array, Effect, Option, Schema, String } from 'effect'
import { Command, Submodel, Update } from 'foldkit'
import { type ChildAttribute, type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Dialog, Input } from '@foldkit/ui'

import { ListedCharacter, searchCharacters } from '../character'
import {
  callErrorMessage,
  duplicateCharacter,
  fetchListedCharacters,
} from '../firebase/characters'
import type { FirebaseCallError, FirebaseService } from '../firebase/service'
import {
  characterRouter,
  editCharacterRouter,
  newCharacterRouter,
} from '../route'
import { isDevSite } from '../title'

// MODEL

export const Characters = defineTaggedUnion({
  NotLoaded: {},
  Loading: {},
  Loaded: { characters: Schema.Array(ListedCharacter) },
  Failed: { message: Schema.String },
})
export type Characters = typeof Characters.Type

export const Submission = defineTaggedUnion({
  Idle: {},
  Duplicating: {},
  Failed: { message: Schema.String },
})
export type Submission = typeof Submission.Type

// NOTE: ダイアログはページに 1 つだけ置き、開くたびに複製元を入れ替える
export const Duplication = Schema.Struct({
  source: Schema.Option(ListedCharacter),
  password: Schema.String,
  submission: Submission,
  dialog: Dialog.Model,
})
export type Duplication = typeof Duplication.Type

export const Model = Schema.Struct({
  searchInput: Schema.String,
  characters: Characters,
  duplication: Duplication,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedSearchInput: { value: Schema.String },
  ClickedRetry: {},
  SucceededFetchCharacters: { characters: Schema.Array(ListedCharacter) },
  FailedFetchCharacters: { message: Schema.String },
  ClickedDuplicate: { character: ListedCharacter },
  UpdatedDuplicatePassword: { value: Schema.String },
  SubmittedDuplicate: {},
  SucceededDuplicate: { id: Schema.String },
  FailedDuplicate: { message: Schema.String },
  GotDuplicateDialogMessage: { message: Dialog.Message },
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

export const DuplicateCharacter = Command.define('DuplicateCharacter', {
  args: { id: Schema.String, password: Schema.String },
  messages: [Message.SucceededDuplicate, Message.FailedDuplicate],
  execute: request =>
    duplicateCharacter(request).pipe(
      Effect.match({
        onSuccess: ({ id }) => Message.SucceededDuplicate({ id }),
        onFailure: (error: FirebaseCallError) =>
          Message.FailedDuplicate({
            message: callErrorMessage('複製', error),
          }),
      }),
    ),
})

// INIT

export type UpdateReturn = Update.Return<Model, Message, FirebaseService>

const DUPLICATE_DIALOG_ID = 'duplicate-dialog'

export const notLoaded: Model = {
  searchInput: '',
  characters: Characters.NotLoaded(),
  duplication: {
    source: Option.none(),
    password: '',
    submission: Submission.Idle(),
    dialog: Dialog.init({ id: DUPLICATE_DIALOG_ID }),
  },
}

export const reload = (model: Model): UpdateReturn => ({
  model: modifyFields(model, { characters: () => Characters.Loading() }),
  commands: [FetchCharacters()],
})

export const init = (): UpdateReturn => reload(notLoaded)

// UPDATE

const toDuplicateDialogMessage = (message: Dialog.Message) =>
  Message.GotDuplicateDialogMessage({ message })

const duplicateDialogChild = {
  read: (model: Model) => Option.some(model.duplication.dialog),
  write: (model: Model, dialog: Dialog.Model) =>
    modifyFields(model, {
      duplication: duplication =>
        modifyFields(duplication, { dialog: () => dialog }),
    }),
  toParentMessage: toDuplicateDialogMessage,
  foldOutMessage: Dialog.OutMessage.match({
    Opened: () => (model: Model) => ({ model }),
    Closed: () => (model: Model) => ({ model }),
  }),
}

const foldDuplicateDialog = Update.foldChild({
  update: Dialog.update,
  ...duplicateDialogChild,
})

const openDuplicateDialog = Update.foldChildStep({
  update: Dialog.open,
  ...duplicateDialogChild,
})

const closeDuplicateDialog = Update.foldChildStep({
  update: Dialog.close,
  ...duplicateDialogChild,
})

const modifyDuplication = (
  model: Model,
  fields: Partial<{
    [K in keyof Duplication]: (value: Duplication[K]) => Duplication[K]
  }>,
): Model =>
  modifyFields(model, {
    duplication: duplication => modifyFields(duplication, fields),
  })

const isDuplicating = (model: Model): boolean =>
  model.duplication.submission._tag === 'Duplicating'

const failDuplicate = (model: Model, message: string): UpdateReturn => ({
  model: modifyDuplication(model, {
    submission: () => Submission.Failed({ message }),
  }),
})

const startDuplicate = (
  model: Model,
  character: ListedCharacter,
): UpdateReturn =>
  Update.combine(
    modifyDuplication(model, {
      source: () => Option.some(character),
      password: () => '',
      submission: () => Submission.Idle(),
    }),
    [openDuplicateDialog],
  )

// 送信するのは、複製元があってパスワードが空でないときだけ
const submitDuplicate = (model: Model): UpdateReturn => {
  const { source, password } = model.duplication
  if (isDuplicating(model) || Option.isNone(source)) {
    return { model }
  }
  if (String.isEmpty(password)) {
    return failDuplicate(model, 'パスワードを入力してください')
  }
  return {
    model: modifyDuplication(model, {
      submission: () => Submission.Duplicating(),
    }),
    commands: [DuplicateCharacter({ id: source.value.id, password })],
  }
}

const finishDuplicate = (model: Model): UpdateReturn => {
  const closed = closeDuplicateDialog(
    modifyDuplication(model, { submission: () => Submission.Idle() }),
  )
  const reloaded = reload(closed.model)
  return {
    model: reloaded.model,
    commands: [...(closed.commands ?? []), ...(reloaded.commands ?? [])],
  }
}

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

    ClickedDuplicate: ({ character }) => startDuplicate(model, character),
    UpdatedDuplicatePassword: ({ value }) => ({
      model: modifyDuplication(model, { password: () => value }),
    }),
    SubmittedDuplicate: () => submitDuplicate(model),
    SucceededDuplicate: () =>
      isDuplicating(model) ? finishDuplicate(model) : { model },
    FailedDuplicate: ({ message }) =>
      isDuplicating(model) ? failDuplicate(model, message) : { model },
    GotDuplicateDialogMessage: ({ message }) =>
      foldDuplicateDialog(model, message),
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
      Button.view(
        {
          onClick: Message.ClickedDuplicate({ character }),
          toView: ({ button }) =>
            h.button(
              [
                ...button,
                h.AriaLabel(`${character.characterName}を複製`),
                h.Class(
                  'relative z-10 px-3 py-1 border border-gray-300 rounded hover:bg-white',
                ),
              ],
              ['複製'],
            ),
        },
        h,
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

const passwordInputView = (
  password: string,
  h: HtmlBuilder<Message>,
  extra: ReadonlyArray<ChildAttribute>,
): Html =>
  Input.view(
    {
      id: 'duplicate-password',
      type: 'password',
      value: password,
      onInput: value => Message.UpdatedDuplicatePassword({ value }),
      toView: attributes =>
        h.div(
          [],
          [
            h.label(
              [...attributes.label, h.Class('block text-sm text-gray-600')],
              ['パスワード'],
            ),
            h.input([
              ...attributes.input,
              ...extra,
              h.Autocomplete('current-password'),
              h.Class(
                'w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500',
              ),
            ]),
          ],
        ),
    },
    h,
  )

const duplicateErrorView = (
  submission: Submission,
  h: HtmlBuilder<Message>,
): Html =>
  submission._tag === 'Failed'
    ? h.p([h.Role('alert'), h.Class('text-red-700')], [submission.message])
    : h.empty

const duplicateButtonView = (
  submission: Submission,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      type: 'submit',
      isDisabled: submission._tag === 'Duplicating',
      toView: ({ button }) =>
        h.button(
          [...button, h.Class(primaryButtonStyle)],
          [submission._tag === 'Duplicating' ? '複製中…' : '複製'],
        ),
    },
    h,
  )

const duplicateDialogView = (
  duplication: Duplication,
  h: HtmlBuilder<Message>,
): Html =>
  h.submodel({
    slotId: DUPLICATE_DIALOG_ID,
    model: duplication.dialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({
        dialog,
        backdrop,
        panel,
        title,
        initialFocus,
        closeButton,
        isVisible,
      }) =>
        h.dialog(
          [...dialog, h.Class('bg-transparent')],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 bg-black/40')]),
                h.div(
                  [
                    ...panel,
                    h.Class(
                      'fixed inset-x-4 top-1/3 mx-auto max-w-sm rounded-lg bg-white p-6 shadow-lg',
                    ),
                  ],
                  [
                    h.form(
                      [
                        h.OnSubmit(Message.SubmittedDuplicate()),
                        h.Class('space-y-4'),
                      ],
                      [
                        h.h2(
                          [
                            ...title,
                            h.Class('text-lg font-bold text-gray-800'),
                          ],
                          [
                            Option.match(duplication.source, {
                              onNone: () => '複製',
                              onSome: ({ characterName }) =>
                                `「${characterName}」を複製`,
                            }),
                          ],
                        ),
                        h.p(
                          [h.Class('text-sm text-gray-600')],
                          ['複製先のパスワードは複製元と同じになります。'],
                        ),
                        passwordInputView(
                          duplication.password,
                          h,
                          initialFocus,
                        ),
                        duplicateErrorView(duplication.submission, h),
                        h.div(
                          [h.Class('flex justify-end gap-2')],
                          [
                            h.button(
                              [...closeButton, h.Class(secondaryButtonStyle)],
                              ['キャンセル'],
                            ),
                            duplicateButtonView(duplication.submission, h),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: toDuplicateDialogMessage,
  })

const IS_DEV_SITE = isDevSite(import.meta.env)

const devSiteNoticeView = (h: HtmlBuilder<Message>): Html =>
  IS_DEV_SITE
    ? h.p(
        [
          h.Role('note'),
          h.Class(
            'border border-yellow-300 bg-yellow-50 text-yellow-900 rounded-lg px-4 py-2',
          ),
        ],
        ['このサイトは開発用であり、予告なくデータが消えることがあります。'],
      )
    : h.empty

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [h.Class('space-y-6')],
    [
      devSiteNoticeView(h),
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
      duplicateDialogView(model.duplication, h),
    ],
  ),
)

// STYLE

const primaryButtonStyle =
  'bg-black text-white hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded transition'

const secondaryButtonStyle =
  'border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded transition'
