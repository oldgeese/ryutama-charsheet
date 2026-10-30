import { Array, Effect, Option, Record, Result, Schema, String } from 'effect'
import { Command, Submodel, Update } from 'foldkit'
import { type ChildAttribute, type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { pushUrl } from 'foldkit/navigation'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Dialog, Input, Select, Textarea } from '@foldkit/ui'
import {
  AbilityDie,
  CharacterClass,
  CharacterSheet,
  CharacterType,
  MAX_CLASSES,
  MAX_LEVEL,
  MAX_TYPES,
  MIN_LEVEL,
  StatusEffect,
  Terrain,
  Weather,
} from '@ryutama/character'

import { Draft, emptyDraft, fromSheet, toSheet } from '../draft'
import {
  callErrorMessage,
  createCharacter,
  fetchCharacter,
  updateCharacter,
} from '../firebase/characters'
import type { FirebaseCallError, FirebaseService } from '../firebase/service'
import { characterRouter, topRouter } from '../route'

// MODEL

export const Target = defineTaggedUnion({
  New: {},
  Existing: { id: Schema.String },
})
export type Target = typeof Target.Type

export const Submission = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Failed: { message: Schema.String },
})
export type Submission = typeof Submission.Type

export const Editor = defineTaggedUnion({
  NotLoaded: {},
  Loading: { id: Schema.String },
  NotFound: { id: Schema.String },
  LoadFailed: { id: Schema.String, message: Schema.String },
  Editing: {
    target: Target,
    draft: Draft,
    password: Schema.String,
    submission: Submission,
    passwordDialog: Dialog.Model,
  },
})
export type Editor = typeof Editor.Type
type Editing = typeof Editor.Editing.Type

export const Model = Editor
export type Model = Editor

// 入力欄の種類
const TextField = Schema.Literals([
  'dragonName',
  'createdOn',
  'characterName',
  'playerName',
  'exp',
  'gender',
  'age',
  'weaponProficiency',
  'favoredTerrainAndWeather',
  'favoriteItem',
  'appearance',
  'hometownAndReason',
  'memo',
  'condition',
  'fumblePoints',
  'initiative',
])
type TextField = typeof TextField.Type

const Ability = Schema.Literals([
  'strength',
  'dexterity',
  'intelligence',
  'spirit',
])
type Ability = typeof Ability.Type

const Pool = Schema.Literals(['hp', 'mp'])
type Pool = typeof Pool.Type

const PoolPart = Schema.Literals(['max', 'current'])
type PoolPart = typeof PoolPart.Type

const Table = Schema.Literals([
  'classAbilities',
  'weapons',
  'armors',
  'travelGear',
])
type Table = typeof Table.Type

const ClassAbilityField = Schema.Literals(['name', 'checkAbilities', 'effect'])
type ClassAbilityField = typeof ClassAbilityField.Type

const WeaponField = Schema.Literals([
  'name',
  'accuracy',
  'damage',
  'durability',
  'notes',
])
type WeaponField = typeof WeaponField.Type

const ArmorField = Schema.Literals([
  'name',
  'defense',
  'penalty',
  'durability',
  'notes',
])
type ArmorField = typeof ArmorField.Type

const TravelGearField = Schema.Literals(['name', 'notes'])
type TravelGearField = typeof TravelGearField.Type

// MESSAGE

const Level = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_LEVEL, maximum: MAX_LEVEL }),
)

export const Message = defineMessageUnion({
  ClickedRetry: {},
  SucceededFetchCharacter: { id: Schema.String, sheet: CharacterSheet },
  MissingCharacter: { id: Schema.String },
  FailedFetchCharacter: { id: Schema.String, message: Schema.String },
  UpdatedText: { field: TextField, value: Schema.String },
  SelectedLevel: { level: Level },
  SelectedAbility: { ability: Ability, die: AbilityDie },
  UpdatedPoints: { pool: Pool, part: PoolPart, value: Schema.String },
  SelectedClass: { slot: Schema.Int, maybeName: Schema.Option(CharacterClass) },
  SelectedType: { slot: Schema.Int, maybeName: Schema.Option(CharacterType) },
  AddedRow: { table: Table },
  RemovedRow: { table: Table, index: Schema.Int },
  UpdatedClassAbility: {
    index: Schema.Int,
    field: ClassAbilityField,
    value: Schema.String,
  },
  UpdatedWeapon: {
    index: Schema.Int,
    field: WeaponField,
    value: Schema.String,
  },
  UpdatedArmor: { index: Schema.Int, field: ArmorField, value: Schema.String },
  UpdatedTravelGear: {
    index: Schema.Int,
    field: TravelGearField,
    value: Schema.String,
  },
  UpdatedTerrainBonus: { terrain: Terrain, value: Schema.String },
  UpdatedWeatherPenalty: { weather: Weather, value: Schema.String },
  UpdatedStatusEffect: { effect: StatusEffect, value: Schema.String },
  UpdatedPassword: { value: Schema.String },
  ClickedSave: {},
  SubmittedPassword: {},
  SucceededSave: { id: Schema.String },
  FailedSave: { message: Schema.String },
  CompletedNavigateToCharacter: {},
  GotPasswordDialogMessage: { message: Dialog.Message },
})
export type Message = typeof Message.Type

// COMMAND

export const FetchCharacterToEdit = Command.define('FetchCharacterToEdit', {
  args: { id: Schema.String },
  messages: [
    Message.SucceededFetchCharacter,
    Message.MissingCharacter,
    Message.FailedFetchCharacter,
  ],
  execute: ({ id }) =>
    fetchCharacter(id).pipe(
      Effect.map(
        Option.match({
          onNone: () => Message.MissingCharacter({ id }),
          onSome: sheet => Message.SucceededFetchCharacter({ id, sheet }),
        }),
      ),
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedFetchCharacter({ id, message: error.message }),
        ),
      ),
    ),
})

const toSaveMessage = Effect.match({
  onSuccess: ({ id }: { readonly id: string }) => Message.SucceededSave({ id }),
  onFailure: (error: FirebaseCallError) =>
    Message.FailedSave({ message: callErrorMessage('保存', error) }),
})

export const CreateCharacter = Command.define('CreateCharacter', {
  args: { sheet: CharacterSheet, password: Schema.String },
  messages: [Message.SucceededSave, Message.FailedSave],
  execute: request => toSaveMessage(createCharacter(request)),
})

export const UpdateCharacter = Command.define('UpdateCharacter', {
  args: { id: Schema.String, sheet: CharacterSheet, password: Schema.String },
  messages: [Message.SucceededSave, Message.FailedSave],
  execute: request => toSaveMessage(updateCharacter(request)),
})

export const NavigateToCharacter = Command.define('NavigateToCharacter', {
  args: { id: Schema.String },
  messages: [Message.CompletedNavigateToCharacter],
  execute: ({ id }) =>
    pushUrl(characterRouter({ id })).pipe(
      Effect.as(Message.CompletedNavigateToCharacter()),
    ),
})

// INIT

export type UpdateReturn = Update.Return<Model, Message, FirebaseService>

export const notLoaded: Model = Editor.NotLoaded()

const PASSWORD_DIALOG_ID = 'password-dialog'

const startEditing = (target: Target, draft: Draft): Model =>
  Editor.Editing({
    target,
    draft,
    password: '',
    submission: Submission.Idle(),
    passwordDialog: Dialog.init({ id: PASSWORD_DIALOG_ID }),
  })

export const initNew = (): UpdateReturn => ({
  model: startEditing(Target.New(), emptyDraft),
})

export const load = (id: string): UpdateReturn => ({
  model: Editor.Loading({ id }),
  commands: [FetchCharacterToEdit({ id })],
})

export const initEdit = load

// UPDATE

const loadingId = (model: Model): Option.Option<string> =>
  Editor.match(model, {
    NotLoaded: () => Option.none(),
    Loading: ({ id }) => Option.some(id),
    NotFound: ({ id }) => Option.some(id),
    LoadFailed: ({ id }) => Option.some(id),
    Editing: () => Option.none(),
  })

// NOTE: 読み込み中に別のキャラクターへ移ったときは、前のキャラクターの結果を捨てる
const whenLoading = (
  model: Model,
  id: string,
  next: () => Model,
): UpdateReturn =>
  model._tag === 'Loading' && model.id === id ? { model: next() } : { model }

const whenEditing = (
  model: Model,
  f: (editing: Editing) => UpdateReturn,
): UpdateReturn => (model._tag === 'Editing' ? f(model) : { model })

const editDraft = (model: Model, f: (draft: Draft) => Draft): UpdateReturn =>
  whenEditing(model, editing => ({
    model: modifyFields(editing, { draft: f }),
  }))

const modifyAt = <A>(
  rows: ReadonlyArray<A>,
  index: number,
  f: (row: A) => A,
): ReadonlyArray<A> =>
  Option.getOrElse(Array.modify(rows, index, f), () => rows)

const selectName = <A>(
  names: ReadonlyArray<A>,
  slot: number,
  maybeName: Option.Option<A>,
  max: number,
): ReadonlyArray<A> =>
  Array.getSomes(
    Array.makeBy(max, index =>
      index === slot ? maybeName : Array.get(names, index),
    ),
  )

const addRow = (draft: Draft, table: Table): Draft => {
  switch (table) {
    case 'classAbilities':
      return {
        ...draft,
        classAbilities: Array.append(draft.classAbilities, {
          name: '',
          checkAbilities: '',
          effect: '',
        }),
      }
    case 'weapons':
      return {
        ...draft,
        weapons: Array.append(draft.weapons, {
          name: '',
          accuracy: '',
          damage: '',
          durability: '',
          notes: '',
        }),
      }
    case 'armors':
      return {
        ...draft,
        armors: Array.append(draft.armors, {
          name: '',
          defense: '',
          penalty: '',
          durability: '',
          notes: '',
        }),
      }
    case 'travelGear':
      return {
        ...draft,
        travelGear: Array.append(draft.travelGear, { name: '', notes: '' }),
      }
  }
}

const removeRow = (draft: Draft, table: Table, index: number): Draft => {
  switch (table) {
    case 'classAbilities':
      return {
        ...draft,
        classAbilities: Array.remove(draft.classAbilities, index),
      }
    case 'weapons':
      return { ...draft, weapons: Array.remove(draft.weapons, index) }
    case 'armors':
      return { ...draft, armors: Array.remove(draft.armors, index) }
    case 'travelGear':
      return { ...draft, travelGear: Array.remove(draft.travelGear, index) }
  }
}

const failWith = (editing: Editing, message: string): UpdateReturn => ({
  model: modifyFields(editing, {
    submission: () => Submission.Failed({ message }),
  }),
})

const toPasswordDialogMessage = (message: Dialog.Message) =>
  Message.GotPasswordDialogMessage({ message })

const readPasswordDialog = (model: Model) =>
  model._tag === 'Editing' ? Option.some(model.passwordDialog) : Option.none()

const writePasswordDialog = (model: Model, passwordDialog: Dialog.Model) =>
  model._tag === 'Editing'
    ? modifyFields(model, { passwordDialog: () => passwordDialog })
    : model

const foldPasswordDialog = Update.foldChild({
  update: Dialog.update,
  read: readPasswordDialog,
  write: writePasswordDialog,
  toParentMessage: toPasswordDialogMessage,
  foldOutMessage: Dialog.OutMessage.match({
    Opened: () => (model: Model) => ({ model }),
    Closed: () => (model: Model) => ({ model }),
  }),
})

const openPasswordDialog = Update.foldChildStep({
  update: Dialog.open,
  read: readPasswordDialog,
  write: writePasswordDialog,
  toParentMessage: toPasswordDialogMessage,
  foldOutMessage: Dialog.OutMessage.match({
    Opened: () => (model: Model) => ({ model }),
    Closed: () => (model: Model) => ({ model }),
  }),
})

const closePasswordDialog = Update.foldChildStep({
  update: Dialog.close,
  read: readPasswordDialog,
  write: writePasswordDialog,
  toParentMessage: toPasswordDialogMessage,
  foldOutMessage: Dialog.OutMessage.match({
    Opened: () => (model: Model) => ({ model }),
    Closed: () => (model: Model) => ({ model }),
  }),
})

const closeAndNavigate = (editing: Editing, id: string): UpdateReturn => {
  const closed = closePasswordDialog(editing)
  return {
    model: closed.model,
    commands: [...(closed.commands ?? []), NavigateToCharacter({ id })],
  }
}

// 送信するのは、入力が正しくパスワードが空でないときだけ
const submit = (editing: Editing): UpdateReturn => {
  if (editing.submission._tag === 'Saving') {
    return { model: editing }
  }
  if (String.isEmpty(editing.password)) {
    return failWith(editing, 'パスワードを入力してください')
  }
  return Result.match(toSheet(editing.draft), {
    onFailure: message => failWith(editing, message),
    onSuccess: sheet => ({
      model: modifyFields(editing, { submission: () => Submission.Saving() }),
      commands: [
        Target.match(editing.target, {
          New: () => CreateCharacter({ sheet, password: editing.password }),
          Existing: ({ id }) =>
            UpdateCharacter({ id, sheet, password: editing.password }),
        }),
      ],
    }),
  })
}

// 編集では、入力が正しいときだけパスワードのダイアログを開く
const askPassword = (editing: Editing): UpdateReturn =>
  Result.match(toSheet(editing.draft), {
    onFailure: message => failWith(editing, message),
    onSuccess: () =>
      Update.combine(
        modifyFields(editing, {
          password: () => '',
          submission: () => Submission.Idle(),
        }),
        [openPasswordDialog],
      ),
  })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedRetry: () =>
      Option.match(loadingId(model), {
        onNone: () => ({ model }),
        onSome: load,
      }),
    SucceededFetchCharacter: ({ id, sheet }) =>
      whenLoading(model, id, () =>
        startEditing(Target.Existing({ id }), fromSheet(sheet)),
      ),
    MissingCharacter: ({ id }) =>
      whenLoading(model, id, () => Editor.NotFound({ id })),
    FailedFetchCharacter: ({ id, message }) =>
      whenLoading(model, id, () => Editor.LoadFailed({ id, message })),

    UpdatedText: ({ field, value }) =>
      editDraft(model, draft => ({ ...draft, [field]: value })),
    SelectedLevel: ({ level }) =>
      editDraft(model, draft => ({ ...draft, level })),
    SelectedAbility: ({ ability, die }) =>
      editDraft(model, draft => ({
        ...draft,
        abilities: { ...draft.abilities, [ability]: die },
      })),
    UpdatedPoints: ({ pool, part, value }) =>
      editDraft(model, draft => ({
        ...draft,
        [pool]: { ...draft[pool], [part]: value },
      })),
    SelectedClass: ({ slot, maybeName }) =>
      editDraft(model, draft => ({
        ...draft,
        classes: selectName(draft.classes, slot, maybeName, MAX_CLASSES),
      })),
    SelectedType: ({ slot, maybeName }) =>
      editDraft(model, draft => ({
        ...draft,
        types: selectName(draft.types, slot, maybeName, MAX_TYPES),
      })),
    AddedRow: ({ table }) => editDraft(model, draft => addRow(draft, table)),
    RemovedRow: ({ table, index }) =>
      editDraft(model, draft => removeRow(draft, table, index)),
    UpdatedClassAbility: ({ index, field, value }) =>
      editDraft(model, draft => ({
        ...draft,
        classAbilities: modifyAt(draft.classAbilities, index, row => ({
          ...row,
          [field]: value,
        })),
      })),
    UpdatedWeapon: ({ index, field, value }) =>
      editDraft(model, draft => ({
        ...draft,
        weapons: modifyAt(draft.weapons, index, row => ({
          ...row,
          [field]: value,
        })),
      })),
    UpdatedArmor: ({ index, field, value }) =>
      editDraft(model, draft => ({
        ...draft,
        armors: modifyAt(draft.armors, index, row => ({
          ...row,
          [field]: value,
        })),
      })),
    UpdatedTravelGear: ({ index, field, value }) =>
      editDraft(model, draft => ({
        ...draft,
        travelGear: modifyAt(draft.travelGear, index, row => ({
          ...row,
          [field]: value,
        })),
      })),
    UpdatedTerrainBonus: ({ terrain, value }) =>
      editDraft(model, draft => ({
        ...draft,
        terrainBonuses: { ...draft.terrainBonuses, [terrain]: value },
      })),
    UpdatedWeatherPenalty: ({ weather, value }) =>
      editDraft(model, draft => ({
        ...draft,
        weatherPenalties: { ...draft.weatherPenalties, [weather]: value },
      })),
    UpdatedStatusEffect: ({ effect, value }) =>
      editDraft(model, draft => ({
        ...draft,
        statusEffects: { ...draft.statusEffects, [effect]: value },
      })),
    UpdatedPassword: ({ value }) =>
      whenEditing(model, editing => ({
        model: modifyFields(editing, { password: () => value }),
      })),

    ClickedSave: () =>
      whenEditing(model, editing =>
        Target.match(editing.target, {
          New: () => submit(editing),
          Existing: () => askPassword(editing),
        }),
      ),
    SubmittedPassword: () => whenEditing(model, submit),
    SucceededSave: ({ id }) =>
      whenEditing(model, editing =>
        editing.submission._tag === 'Saving'
          ? closeAndNavigate(editing, id)
          : { model },
      ),
    FailedSave: ({ message }) =>
      whenEditing(model, editing =>
        editing.submission._tag === 'Saving'
          ? failWith(editing, message)
          : { model },
      ),
    CompletedNavigateToCharacter: () => ({ model }),

    GotPasswordDialogMessage: ({ message }) =>
      foldPasswordDialog(model, message),
  })

// VIEW

const CLASSES = CharacterClass.literals
const TYPES = CharacterType.literals
const DICE = AbilityDie.literals
const LEVELS = Array.range(MIN_LEVEL, MAX_LEVEL)

const sectionView = (
  heading: string,
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('space-y-3')],
    [
      h.h3(
        [h.Class('text-lg font-bold text-gray-800 border-b border-gray-200')],
        [heading],
      ),
      ...children,
    ],
  )

const fieldGridView = (
  fields: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html => h.div([h.Class('grid gap-3 sm:grid-cols-2')], fields)

const labelStyle = 'block text-sm text-gray-600'

const textInputView = (
  id: string,
  label: string,
  value: string,
  onInput: (value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  Input.view(
    {
      id,
      value,
      onInput,
      toView: attributes =>
        h.div(
          [],
          [
            h.label([...attributes.label, h.Class(labelStyle)], [label]),
            h.input([...attributes.input, h.Class(inputStyle)]),
          ],
        ),
    },
    h,
  )

const textFieldView = (
  field: TextField,
  label: string,
  draft: Draft,
  h: HtmlBuilder<Message>,
): Html =>
  textInputView(
    `field-${field}`,
    label,
    draft[field],
    value => Message.UpdatedText({ field, value }),
    h,
  )

const textareaFieldView = (
  field: TextField,
  label: string,
  draft: Draft,
  h: HtmlBuilder<Message>,
): Html =>
  Textarea.view(
    {
      id: `field-${field}`,
      value: draft[field],
      rows: 3,
      onInput: value => Message.UpdatedText({ field, value }),
      toView: attributes =>
        h.div(
          [h.Class('sm:col-span-2')],
          [
            h.label([...attributes.label, h.Class(labelStyle)], [label]),
            h.textarea([...attributes.textarea, h.Class(inputStyle)]),
          ],
        ),
    },
    h,
  )

const selectView = <A extends string | number>(
  id: string,
  label: string,
  value: A,
  options: ReadonlyArray<readonly [A, string]>,
  onChange: (value: A) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  Select.view(
    {
      id,
      value: `${value}`,
      onChange: selected =>
        onChange(
          Option.getOrElse(
            Array.findFirst(options, ([option]) => `${option}` === selected),
            () => [value, ''] as const,
          )[0],
        ),
      toView: attributes =>
        h.div(
          [],
          [
            h.label([...attributes.label, h.Class(labelStyle)], [label]),
            h.select(
              [...attributes.select, h.Class(inputStyle)],
              Array.map(options, ([option, text]) =>
                h.option([h.Value(`${option}`)], [text]),
              ),
            ),
          ],
        ),
    },
    h,
  )

const UNSELECTED = ''

const nameSelectViews = <A extends string>(
  label: string,
  idPrefix: string,
  names: ReadonlyArray<A>,
  selected: ReadonlyArray<A>,
  max: number,
  onSelect: (slot: number, maybeName: Option.Option<A>) => Message,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> =>
  Array.makeBy(max, slot =>
    selectView<A | typeof UNSELECTED>(
      `${idPrefix}-${slot}`,
      `${label}（${slot + 1}つ目）`,
      Option.getOrElse(Array.get(selected, slot), () => UNSELECTED),
      [
        [UNSELECTED, '未選択'],
        ...Array.map(names, name => [name, name] as const),
      ],
      name =>
        onSelect(slot, name === UNSELECTED ? Option.none() : Option.some(name)),
      h,
    ),
  )

// 表の列。見出しと、行のどのフィールドを入力するか
type Column<Field extends string> = readonly [header: string, field: Field]

const rowsEditorView = <Field extends string>(
  caption: string,
  table: Table,
  rows: ReadonlyArray<Readonly<Record<Field, string>>>,
  columns: ReadonlyArray<Column<Field>>,
  onInput: (index: number, field: Field, value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('space-y-2')],
    [
      h.div(
        [h.Class('overflow-x-auto')],
        [
          h.table(
            [h.Class('w-full text-left border-collapse')],
            [
              h.caption(
                [h.Class('text-left font-semibold text-gray-700 mb-1')],
                [caption],
              ),
              h.thead(
                [],
                [
                  h.tr(
                    [h.Class('border-b border-gray-300')],
                    [
                      ...Array.map(columns, ([header]) =>
                        h.th(
                          [h.Scope('col'), h.Class('px-1 py-1 text-gray-600')],
                          [header],
                        ),
                      ),
                      h.th(
                        [h.Scope('col')],
                        [h.span([h.Class('sr-only')], ['操作'])],
                      ),
                    ],
                  ),
                ],
              ),
              h.tbody(
                [],
                Array.map(rows, (row, index) =>
                  h.tr(
                    [],
                    [
                      ...Array.map(columns, ([header, field]) =>
                        h.td(
                          [h.Class('px-1 py-1')],
                          [
                            Input.view(
                              {
                                id: `${table}-${index}-${field}`,
                                value: row[field],
                                onInput: value => onInput(index, field, value),
                                toView: attributes =>
                                  h.div(
                                    [],
                                    [
                                      h.label(
                                        [
                                          ...attributes.label,
                                          h.Class('sr-only'),
                                        ],
                                        [`${caption} ${index + 1} の${header}`],
                                      ),
                                      h.input([
                                        ...attributes.input,
                                        h.Class(inputStyle),
                                      ]),
                                    ],
                                  ),
                              },
                              h,
                            ),
                          ],
                        ),
                      ),
                      h.td(
                        [h.Class('px-1 py-1')],
                        [
                          Button.view(
                            {
                              onClick: Message.RemovedRow({ table, index }),
                              toView: ({ button }) =>
                                h.button(
                                  [
                                    ...button,
                                    h.AriaLabel(
                                      `${caption} ${index + 1} を削除`,
                                    ),
                                    h.Class(smallButtonStyle),
                                  ],
                                  ['削除'],
                                ),
                            },
                            h,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      Button.view(
        {
          onClick: Message.AddedRow({ table }),
          toView: ({ button }) =>
            h.button(
              [...button, h.Class(smallButtonStyle)],
              [`${caption}を追加`],
            ),
        },
        h,
      ),
    ],
  )

const recordEditorView = <K extends string>(
  caption: string,
  idPrefix: string,
  record: Readonly<Record<K, string>>,
  onInput: (key: K, value: string) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.fieldset(
    [],
    [
      h.legend([h.Class('font-semibold text-gray-700 mb-1')], [caption]),
      h.div(
        [h.Class('grid gap-2 grid-cols-2 sm:grid-cols-4')],
        Array.map(Record.toEntries(record), ([key, value], index) =>
          textInputView(
            `${idPrefix}-${index}`,
            key,
            value,
            next => onInput(key, next),
            h,
          ),
        ),
      ),
    ],
  )

const pointsView = (
  pool: Pool,
  label: string,
  draft: Draft,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  textInputView(
    `${pool}-current`,
    `${label}（現在）`,
    draft[pool].current,
    value => Message.UpdatedPoints({ pool, part: 'current', value }),
    h,
  ),
  textInputView(
    `${pool}-max`,
    `${label}（最大）`,
    draft[pool].max,
    value => Message.UpdatedPoints({ pool, part: 'max', value }),
    h,
  ),
]

const abilityView = (
  ability: Ability,
  label: string,
  draft: Draft,
  h: HtmlBuilder<Message>,
): Html =>
  selectView(
    `ability-${ability}`,
    label,
    draft.abilities[ability],
    Array.map(DICE, die => [die, `d${die}`] as const),
    die => Message.SelectedAbility({ ability, die }),
    h,
  )

const sheetFormView = (draft: Draft, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Class('space-y-8')],
    [
      sectionView(
        '基本',
        [
          fieldGridView(
            [
              textFieldView('characterName', 'キャラクター名', draft, h),
              textFieldView('playerName', 'PL名', draft, h),
              selectView(
                'field-level',
                'レベル',
                draft.level,
                Array.map(LEVELS, level => [level, `${level}`] as const),
                level => Message.SelectedLevel({ level }),
                h,
              ),
              textFieldView('exp', 'EXP', draft, h),
              ...nameSelectViews(
                'クラス',
                'class',
                CLASSES,
                draft.classes,
                MAX_CLASSES,
                (slot, maybeName) => Message.SelectedClass({ slot, maybeName }),
                h,
              ),
              ...nameSelectViews(
                'タイプ',
                'type',
                TYPES,
                draft.types,
                MAX_TYPES,
                (slot, maybeName) => Message.SelectedType({ slot, maybeName }),
                h,
              ),
              textFieldView('gender', '性別', draft, h),
              textFieldView('age', '年齢', draft, h),
              textFieldView('dragonName', '竜人名', draft, h),
              textFieldView('createdOn', '作成日', draft, h),
            ],
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '能力値と状態',
        [
          fieldGridView(
            [
              abilityView('strength', '体力', draft, h),
              abilityView('dexterity', '敏捷', draft, h),
              abilityView('intelligence', '知力', draft, h),
              abilityView('spirit', '精神', draft, h),
              ...pointsView('hp', 'HP', draft, h),
              ...pointsView('mp', 'MP', draft, h),
              textFieldView('condition', 'コンディション', draft, h),
              textFieldView('fumblePoints', '1ゾロポイント', draft, h),
              textFieldView('initiative', 'イニシアティブ', draft, h),
            ],
            h,
          ),
        ],
        h,
      ),
      sectionView(
        'クラス能力',
        [
          rowsEditorView(
            'クラス能力',
            'classAbilities',
            draft.classAbilities,
            [
              ['名前', 'name'],
              ['判定', 'checkAbilities'],
              ['効果', 'effect'],
            ],
            (index, field, value) =>
              Message.UpdatedClassAbility({ index, field, value }),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '装備',
        [
          rowsEditorView(
            '武器',
            'weapons',
            draft.weapons,
            [
              ['名前', 'name'],
              ['命中', 'accuracy'],
              ['ダメージ', 'damage'],
              ['耐久', 'durability'],
              ['備考', 'notes'],
            ],
            (index, field, value) =>
              Message.UpdatedWeapon({ index, field, value }),
            h,
          ),
          rowsEditorView(
            '盾・鎧',
            'armors',
            draft.armors,
            [
              ['名前', 'name'],
              ['防御点', 'defense'],
              ['ペナルティ', 'penalty'],
              ['耐久', 'durability'],
              ['備考', 'notes'],
            ],
            (index, field, value) =>
              Message.UpdatedArmor({ index, field, value }),
            h,
          ),
          rowsEditorView(
            '旅装',
            'travelGear',
            draft.travelGear,
            [
              ['名前', 'name'],
              ['備考', 'notes'],
            ],
            (index, field, value) =>
              Message.UpdatedTravelGear({ index, field, value }),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '地形と天候',
        [
          recordEditorView(
            '地形ごとのチェックボーナス',
            'terrain',
            draft.terrainBonuses,
            (terrain, value) => Message.UpdatedTerrainBonus({ terrain, value }),
            h,
          ),
          recordEditorView(
            '天候ごとのチェックペナルティ',
            'weather',
            draft.weatherPenalties,
            (weather, value) =>
              Message.UpdatedWeatherPenalty({ weather, value }),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '状態異常',
        [
          recordEditorView(
            '状態異常の強度',
            'status',
            draft.statusEffects,
            (effect, value) => Message.UpdatedStatusEffect({ effect, value }),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        'プロフィール',
        [
          fieldGridView(
            [
              textFieldView('weaponProficiency', '習得武器', draft, h),
              textFieldView(
                'favoredTerrainAndWeather',
                '得意地形／天候',
                draft,
                h,
              ),
              textFieldView('favoriteItem', 'お気に入りアイテム', draft, h),
              textFieldView('appearance', 'イメージカラー／外見', draft, h),
              textareaFieldView(
                'hometownAndReason',
                '故郷／旅に出た理由',
                draft,
                h,
              ),
              textareaFieldView('memo', 'MEMO', draft, h),
            ],
            h,
          ),
        ],
        h,
      ),
    ],
  )

const passwordInputView = (
  id: string,
  password: string,
  h: HtmlBuilder<Message>,
  extra: ReadonlyArray<ChildAttribute> = [],
): Html =>
  Input.view(
    {
      id,
      type: 'password',
      value: password,
      onInput: value => Message.UpdatedPassword({ value }),
      toView: attributes =>
        h.div(
          [],
          [
            h.label([...attributes.label, h.Class(labelStyle)], ['パスワード']),
            h.input([
              ...attributes.input,
              ...extra,
              h.Autocomplete('current-password'),
              h.Class(inputStyle),
            ]),
          ],
        ),
    },
    h,
  )

const errorView = (submission: Submission, h: HtmlBuilder<Message>): Html =>
  submission._tag === 'Failed'
    ? h.p([h.Role('alert'), h.Class('text-red-700')], [submission.message])
    : h.empty

const saveButtonView = (
  submission: Submission,
  h: HtmlBuilder<Message>,
): Html =>
  Button.view(
    {
      type: 'submit',
      isDisabled: submission._tag === 'Saving',
      toView: ({ button }) =>
        h.button(
          [...button, h.Class(primaryButtonStyle)],
          [submission._tag === 'Saving' ? '保存中…' : '保存'],
        ),
    },
    h,
  )

const passwordDialogView = (editing: Editing, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: PASSWORD_DIALOG_ID,
    model: editing.passwordDialog,
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
                        h.OnSubmit(Message.SubmittedPassword()),
                        h.Class('space-y-4'),
                      ],
                      [
                        h.h2(
                          [
                            ...title,
                            h.Class('text-lg font-bold text-gray-800'),
                          ],
                          ['パスワードを入力して保存'],
                        ),
                        passwordInputView(
                          'edit-password',
                          editing.password,
                          h,
                          initialFocus,
                        ),
                        errorView(editing.submission, h),
                        h.div(
                          [h.Class('flex justify-end gap-2')],
                          [
                            h.button(
                              [...closeButton, h.Class(secondaryButtonStyle)],
                              ['キャンセル'],
                            ),
                            saveButtonView(editing.submission, h),
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
    toParentMessage: toPasswordDialogMessage,
  })

const editingView = (editing: Editing, h: HtmlBuilder<Message>): Html => {
  const isNew = editing.target._tag === 'New'
  return h.div(
    [h.Class('space-y-8')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center gap-4')],
        [
          h.h2(
            [h.Class('flex-1 text-2xl font-bold text-gray-800')],
            [isNew ? 'キャラクターの新規作成' : 'キャラクターの編集'],
          ),
          Target.match(editing.target, {
            New: () => backToTopView(h),
            Existing: ({ id }) =>
              h.a(
                [
                  h.Href(characterRouter({ id })),
                  h.Class('text-gray-700 underline'),
                ],
                ['キャラクターに戻る'],
              ),
          }),
        ],
      ),
      h.form(
        [h.OnSubmit(Message.ClickedSave()), h.Class('space-y-8')],
        [
          sheetFormView(editing.draft, h),
          h.div(
            [h.Class('space-y-3 border-t border-gray-200 pt-4')],
            [
              ...(isNew
                ? [
                    h.div(
                      [h.Class('max-w-sm')],
                      [passwordInputView('new-password', editing.password, h)],
                    ),
                    h.p(
                      [h.Class('text-sm text-gray-600')],
                      [
                        '編集・複製するときに使います。あとから変えられません。',
                      ],
                    ),
                  ]
                : []),
              editing.passwordDialog.isOpen
                ? h.empty
                : errorView(editing.submission, h),
              saveButtonView(editing.submission, h),
            ],
          ),
        ],
      ),
      ...(isNew ? [] : [passwordDialogView(editing, h)]),
    ],
  )
}

const backToTopView = (h: HtmlBuilder<Message>): Html =>
  h.a([h.Href(topRouter()), h.Class('text-gray-700 underline')], ['一覧に戻る'])

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  Editor.match(model, {
    NotLoaded: () => h.empty,
    Loading: () => h.p([h.Class('text-gray-600')], ['読み込み中…']),
    NotFound: () =>
      h.div(
        [h.Class('space-y-4')],
        [
          h.h2(
            [h.Class('text-2xl font-bold text-gray-800')],
            ['キャラクターが見つかりません'],
          ),
          backToTopView(h),
        ],
      ),
    LoadFailed: ({ message }) =>
      h.div(
        [h.Class('space-y-2')],
        [
          h.p(
            [h.Class('text-red-700')],
            [`キャラクターを読み込めませんでした: ${message}`],
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
          backToTopView(h),
        ],
      ),
    Editing: editing => editingView(editing, h),
  }),
)

// STYLE

const inputStyle =
  'w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500'

const primaryButtonStyle =
  'bg-black text-white hover:bg-gray-700 disabled:opacity-50 px-4 py-2 rounded transition'

const secondaryButtonStyle =
  'border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded transition'

const smallButtonStyle =
  'whitespace-nowrap border border-gray-300 hover:bg-gray-100 px-2 py-1 text-sm rounded transition'
