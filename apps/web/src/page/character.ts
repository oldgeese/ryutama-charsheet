import { Array, Effect, Option, Record, Schema, String } from 'effect'
import { Command, Submodel, type Update } from 'foldkit'
import { type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { Button } from '@foldkit/ui'
import { CharacterSheet } from '@ryutama/character'

import { fetchCharacter } from '../firebase/characters'
import type { FirebaseService } from '../firebase/service'
import { editCharacterRouter, topRouter } from '../route'

// MODEL

export const Sheet = defineTaggedUnion({
  NotLoaded: {},
  Loading: { id: Schema.String },
  Loaded: { id: Schema.String, sheet: CharacterSheet },
  NotFound: { id: Schema.String },
  Failed: { id: Schema.String, message: Schema.String },
})
export type Sheet = typeof Sheet.Type

export const Model = Sheet
export type Model = Sheet

// MESSAGE

export const Message = defineMessageUnion({
  ClickedRetry: {},
  SucceededFetchCharacter: { id: Schema.String, sheet: CharacterSheet },
  MissingCharacter: { id: Schema.String },
  FailedFetchCharacter: { id: Schema.String, message: Schema.String },
})
export type Message = typeof Message.Type

// COMMAND

export const FetchCharacter = Command.define('FetchCharacter', {
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

// INIT

export type UpdateReturn = Update.Return<Model, Message, FirebaseService>

export const notLoaded: Model = Sheet.NotLoaded()

export const load = (id: string): UpdateReturn => ({
  model: Sheet.Loading({ id }),
  commands: [FetchCharacter({ id })],
})

export const init = load

// UPDATE

const shownId = (model: Model): Option.Option<string> =>
  Sheet.match(model, {
    NotLoaded: () => Option.none(),
    Loading: ({ id }) => Option.some(id),
    Loaded: ({ id }) => Option.some(id),
    NotFound: ({ id }) => Option.some(id),
    Failed: ({ id }) => Option.some(id),
  })

// NOTE: 読み込み中に別のキャラクターへ移ったときは、前のキャラクターの結果を捨てる
const whenShown = (
  model: Model,
  id: string,
  next: () => Model,
): UpdateReturn =>
  Option.contains(shownId(model), id) ? { model: next() } : { model }

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedRetry: () =>
      Option.match(shownId(model), {
        onNone: () => ({ model }),
        onSome: load,
      }),
    SucceededFetchCharacter: ({ id, sheet }) =>
      whenShown(model, id, () => Sheet.Loaded({ id, sheet })),
    MissingCharacter: ({ id }) =>
      whenShown(model, id, () => Sheet.NotFound({ id })),
    FailedFetchCharacter: ({ id, message }) =>
      whenShown(model, id, () => Sheet.Failed({ id, message })),
  })

// VIEW

const orDash = (value: string): string =>
  String.isEmpty(String.trim(value)) ? '—' : value

const joinNames = (names: ReadonlyArray<string>): string =>
  orDash(Array.join(names, '／'))

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

const fieldsView = (
  fields: ReadonlyArray<readonly [string, string]>,
  h: HtmlBuilder<Message>,
): Html =>
  h.dl(
    [h.Class('grid grid-cols-[auto_1fr] gap-x-6 gap-y-2')],
    Array.flatMap(fields, ([label, value]) => [
      h.dt([h.Class('text-gray-600')], [label]),
      h.dd([h.Class('text-gray-900 whitespace-pre-wrap')], [orDash(value)]),
    ]),
  )

// NOTE: 見出しと同じ表題は画面には出さず、スクリーンリーダー向けにだけ残す
type Caption = Readonly<{ text: string; visible: boolean }>

const shownCaption = (text: string): Caption => ({ text, visible: true })
const hiddenCaption = (text: string): Caption => ({ text, visible: false })

const tableView = (
  caption: Caption,
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('overflow-x-auto')],
    [
      h.table(
        [h.Class('w-full text-left border-collapse')],
        [
          h.caption(
            [
              h.Class(
                caption.visible
                  ? 'text-left font-semibold text-gray-700 mb-1'
                  : 'sr-only',
              ),
            ],
            [caption.text],
          ),
          h.thead(
            [],
            [
              h.tr(
                [h.Class('border-b border-gray-300')],
                Array.map(headers, header =>
                  h.th(
                    [h.Scope('col'), h.Class('px-2 py-1 text-gray-600')],
                    [header],
                  ),
                ),
              ),
            ],
          ),
          h.tbody(
            [],
            Array.match(rows, {
              onEmpty: () => [
                h.tr(
                  [],
                  [
                    h.td(
                      [
                        h.Colspan(headers.length),
                        h.Class('px-2 py-1 text-gray-500'),
                      ],
                      ['なし'],
                    ),
                  ],
                ),
              ],
              onNonEmpty: Array.map(row =>
                h.tr(
                  [h.Class('border-b border-gray-100')],
                  Array.map(row, cell =>
                    h.td(
                      [h.Class('px-2 py-1 text-gray-900 whitespace-pre-wrap')],
                      [orDash(cell)],
                    ),
                  ),
                ),
              ),
            }),
          ),
        ],
      ),
    ],
  )

const recordTableView = (
  caption: Caption,
  keyHeader: string,
  valueHeader: string,
  record: Readonly<Record<string, string>>,
  h: HtmlBuilder<Message>,
): Html =>
  tableView(
    caption,
    [keyHeader, valueHeader],
    Array.map(Record.toEntries(record), ([key, value]) => [key, value]),
    h,
  )

const pointsText = ({
  max,
  current,
}: {
  readonly max: string
  readonly current: string
}): string => `${orDash(current)} / ${orDash(max)}`

const sheetView = (
  id: string,
  sheet: CharacterSheet,
  h: HtmlBuilder<Message>,
) =>
  h.div(
    [h.Class('space-y-8')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center gap-4')],
        [
          h.h2(
            [h.Class('flex-1 text-2xl font-bold text-gray-800')],
            [
              String.isEmpty(String.trim(sheet.characterName))
                ? '名前のないキャラクター'
                : sheet.characterName,
            ],
          ),
          h.a(
            [h.Href(editCharacterRouter({ id })), h.Class(primaryButtonStyle)],
            ['編集'],
          ),
          h.a(
            [h.Href(topRouter()), h.Class('text-gray-700 underline')],
            ['一覧に戻る'],
          ),
        ],
      ),
      sectionView(
        '基本',
        [
          fieldsView(
            [
              ['PL名', sheet.playerName],
              ['レベル', `${sheet.level}`],
              ['EXP', `${sheet.exp}`],
              ['クラス', joinNames(sheet.classes)],
              ['タイプ', joinNames(sheet.types)],
              ['性別', sheet.gender],
              ['年齢', sheet.age],
              ['竜人名', sheet.dragonName],
              ['作成日', sheet.createdOn],
            ],
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '能力値と状態',
        [
          fieldsView(
            [
              ['体力', `d${sheet.abilities.strength}`],
              ['敏捷', `d${sheet.abilities.dexterity}`],
              ['知力', `d${sheet.abilities.intelligence}`],
              ['精神', `d${sheet.abilities.spirit}`],
              ['HP（現在 / 最大）', pointsText(sheet.hp)],
              ['MP（現在 / 最大）', pointsText(sheet.mp)],
              ['コンディション', sheet.condition],
              ['1ゾロポイント', sheet.fumblePoints],
              ['イニシアティブ', sheet.initiative],
            ],
            h,
          ),
        ],
        h,
      ),
      sectionView(
        'クラス能力',
        [
          tableView(
            hiddenCaption('クラス能力'),
            ['名前', '判定', '効果'],
            Array.map(sheet.classAbilities, ability => [
              ability.name,
              ability.checkAbilities,
              ability.effect,
            ]),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '装備',
        [
          tableView(
            shownCaption('武器'),
            ['名前', '命中', 'ダメージ', '耐久', '備考'],
            Array.map(sheet.weapons, weapon => [
              weapon.name,
              weapon.accuracy,
              weapon.damage,
              weapon.durability,
              weapon.notes,
            ]),
            h,
          ),
          tableView(
            shownCaption('盾・鎧'),
            ['名前', '防御点', 'ペナルティ', '耐久', '備考'],
            Array.map(sheet.armors, armor => [
              armor.name,
              armor.defense,
              armor.penalty,
              armor.durability,
              armor.notes,
            ]),
            h,
          ),
          tableView(
            shownCaption('旅装'),
            ['名前', '備考'],
            Array.map(sheet.travelGear, gear => [gear.name, gear.notes]),
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '地形と天候',
        [
          recordTableView(
            shownCaption('地形ごとのチェックボーナス'),
            '地形',
            'ボーナス',
            sheet.terrainBonuses,
            h,
          ),
          recordTableView(
            shownCaption('天候ごとのチェックペナルティ'),
            '天候',
            'ペナルティ',
            sheet.weatherPenalties,
            h,
          ),
        ],
        h,
      ),
      sectionView(
        '状態異常',
        [
          recordTableView(
            hiddenCaption('状態異常'),
            '状態異常',
            '強度',
            sheet.statusEffects,
            h,
          ),
        ],
        h,
      ),
      sectionView(
        'プロフィール',
        [
          fieldsView(
            [
              ['習得武器', sheet.weaponProficiency],
              ['得意地形／天候', sheet.favoredTerrainAndWeather],
              ['お気に入りアイテム', sheet.favoriteItem],
              ['イメージカラー／外見', sheet.appearance],
              ['故郷／旅に出た理由', sheet.hometownAndReason],
              ['MEMO', sheet.memo],
            ],
            h,
          ),
        ],
        h,
      ),
    ],
  )

const backToTopView = (h: HtmlBuilder<Message>): Html =>
  h.a([h.Href(topRouter()), h.Class('text-gray-700 underline')], ['一覧に戻る'])

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  Sheet.match(model, {
    NotLoaded: () => h.empty,
    Loading: () => h.p([h.Class('text-gray-600')], ['読み込み中…']),
    Loaded: ({ id, sheet }) => sheetView(id, sheet, h),
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
    Failed: ({ message }) =>
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
  }),
)

// STYLE

const primaryButtonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 rounded transition'

const secondaryButtonStyle =
  'border border-gray-300 hover:bg-gray-100 px-4 py-2 rounded transition'
