import { Option } from 'effect'
import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { Dialog } from '@foldkit/ui'
import { type CharacterSheet, emptySheet } from '@ryutama/character'

import { emptyDraft, fromSheet } from '../draft'
import {
  CreateCharacter,
  Editor,
  FetchCharacterToEdit,
  Message,
  type Model,
  NavigateToCharacter,
  Submission,
  Target,
  UpdateCharacter,
  initNew,
  load,
  update,
} from './editor'

const lulu: CharacterSheet = { ...emptySheet, characterName: 'ルル' }

const editing = (model: Model) => {
  if (model._tag !== 'Editing') {
    throw new Error(`expected Editing but got ${model._tag}`)
  }
  return model
}

const editingLulu = (): Model =>
  update(
    load('a').model,
    Message.SucceededFetchCharacter({ id: 'a', sheet: lulu }),
  ).model

const showedDialog = Dialog.Message.SucceededShowDialog()
const closedDialog = Dialog.Message.CompletedCloseDialog()

describe('editor page: loading', () => {
  test('a new character starts from an empty sheet', () => {
    const init_ = initNew()
    expect(init_.commands ?? []).toHaveLength(0)
    expect(editing(init_.model)).toMatchObject({
      target: Target.New(),
      draft: emptyDraft,
      password: '',
      submission: Submission.Idle(),
    })
  })

  test('editing loads the character into the form', () => {
    story(
      update,
      given(load('a').model),
      model(model => {
        expect(model).toEqual(Editor.Loading({ id: 'a' }))
      }),
      message(Message.ClickedRetry()),
      Command.expectExact(FetchCharacterToEdit({ id: 'a' })),
      Command.resolve(
        FetchCharacterToEdit({ id: 'a' }),
        Message.SucceededFetchCharacter({ id: 'a', sheet: lulu }),
      ),
      model(model => {
        expect(editing(model)).toMatchObject({
          target: Target.Existing({ id: 'a' }),
          draft: fromSheet(lulu),
        })
      }),
    )
  })

  test('shows not found and load failures', () => {
    story(
      update,
      given(load('a').model),
      message(Message.MissingCharacter({ id: 'a' })),
      model(model => {
        expect(model).toEqual(Editor.NotFound({ id: 'a' }))
      }),
    )
    story(
      update,
      given(load('a').model),
      message(Message.FailedFetchCharacter({ id: 'a', message: 'offline' })),
      model(model => {
        expect(model).toEqual(
          Editor.LoadFailed({ id: 'a', message: 'offline' }),
        )
      }),
    )
  })

  test('ignores the result for a character that is no longer edited', () => {
    story(
      update,
      given(load('b').model),
      message(Message.SucceededFetchCharacter({ id: 'a', sheet: lulu })),
      message(Message.MissingCharacter({ id: 'a' })),
      message(Message.FailedFetchCharacter({ id: 'a', message: 'offline' })),
      model(model => {
        expect(model).toEqual(Editor.Loading({ id: 'b' }))
      }),
    )
  })
})

describe('editor page: inputs', () => {
  test('updates text, level, EXP, abilities and points', () => {
    story(
      update,
      given(initNew().model),
      message(Message.UpdatedText({ field: 'characterName', value: 'ルル' })),
      message(Message.SelectedLevel({ level: 6 })),
      message(Message.UpdatedText({ field: 'exp', value: '30' })),
      message(Message.SelectedAbility({ ability: 'spirit', die: 12 })),
      message(Message.UpdatedPoints({ pool: 'hp', part: 'max', value: '8' })),
      model(model => {
        expect(editing(model).draft).toEqual({
          ...emptyDraft,
          characterName: 'ルル',
          level: 6,
          exp: '30',
          abilities: { ...emptyDraft.abilities, spirit: 12 },
          hp: { max: '8', current: '' },
        })
      }),
    )
  })

  test('selects the same class or type in both slots', () => {
    story(
      update,
      given(initNew().model),
      message(
        Message.SelectedClass({ slot: 0, maybeName: Option.some('ハンター') }),
      ),
      message(
        Message.SelectedClass({ slot: 1, maybeName: Option.some('ハンター') }),
      ),
      message(
        Message.SelectedType({
          slot: 0,
          maybeName: Option.some('マジックタイプ'),
        }),
      ),
      message(
        Message.SelectedType({
          slot: 1,
          maybeName: Option.some('マジックタイプ'),
        }),
      ),
      model(model => {
        expect(editing(model).draft.classes).toEqual(['ハンター', 'ハンター'])
        expect(editing(model).draft.types).toEqual([
          'マジックタイプ',
          'マジックタイプ',
        ])
      }),
    )
  })

  test('selecting replaces only the chosen slot', () => {
    story(
      update,
      given(initNew().model),
      message(
        Message.SelectedClass({ slot: 0, maybeName: Option.some('ヒーラー') }),
      ),
      message(
        Message.SelectedClass({ slot: 1, maybeName: Option.some('ハンター') }),
      ),
      message(
        Message.SelectedClass({ slot: 1, maybeName: Option.some('ノーブル') }),
      ),
      model(model => {
        expect(editing(model).draft.classes).toEqual(['ヒーラー', 'ノーブル'])
      }),
    )
  })

  test('clearing the first slot moves the second one up', () => {
    story(
      update,
      given(initNew().model),
      message(
        Message.SelectedClass({ slot: 0, maybeName: Option.some('ヒーラー') }),
      ),
      message(
        Message.SelectedClass({ slot: 1, maybeName: Option.some('ハンター') }),
      ),
      message(Message.SelectedClass({ slot: 0, maybeName: Option.none() })),
      model(model => {
        expect(editing(model).draft.classes).toEqual(['ハンター'])
      }),
    )
  })

  test('adds, edits and removes rows', () => {
    story(
      update,
      given(initNew().model),
      message(Message.AddedRow({ table: 'weapons' })),
      message(Message.AddedRow({ table: 'weapons' })),
      message(
        Message.UpdatedWeapon({ index: 1, field: 'name', value: '短剣' }),
      ),
      message(Message.RemovedRow({ table: 'weapons', index: 0 })),
      message(Message.AddedRow({ table: 'classAbilities' })),
      message(
        Message.UpdatedClassAbility({
          index: 0,
          field: 'name',
          value: '旅の歌',
        }),
      ),
      message(Message.AddedRow({ table: 'armors' })),
      message(Message.UpdatedArmor({ index: 0, field: 'defense', value: '1' })),
      message(Message.AddedRow({ table: 'travelGear' })),
      message(
        Message.UpdatedTravelGear({ index: 0, field: 'notes', value: '水' }),
      ),
      model(model => {
        const { draft } = editing(model)
        expect(draft.weapons).toEqual([
          { name: '短剣', accuracy: '', damage: '', durability: '', notes: '' },
        ])
        expect(draft.classAbilities).toEqual([
          { name: '旅の歌', checkAbilities: '', effect: '' },
        ])
        expect(draft.armors).toEqual([
          { name: '', defense: '1', penalty: '', durability: '', notes: '' },
        ])
        expect(draft.travelGear).toEqual([{ name: '', notes: '水' }])
      }),
    )
  })

  test('updates terrain, weather and status effects', () => {
    story(
      update,
      given(initNew().model),
      message(Message.UpdatedTerrainBonus({ terrain: '森', value: '+1' })),
      message(Message.UpdatedWeatherPenalty({ weather: '雪', value: '-2' })),
      message(Message.UpdatedStatusEffect({ effect: '毒', value: '4' })),
      model(model => {
        const { draft } = editing(model)
        expect(draft.terrainBonuses.森).toBe('+1')
        expect(draft.weatherPenalties.雪).toBe('-2')
        expect(draft.statusEffects.毒).toBe('4')
      }),
    )
  })
})

describe('editor page: creating', () => {
  test('requires a password', () => {
    story(
      update,
      given(initNew().model),
      message(Message.ClickedSave()),
      Command.expectNone(),
      model(model => {
        expect(editing(model).submission).toEqual(
          Submission.Failed({ message: 'パスワードを入力してください' }),
        )
      }),
    )
  })

  test('rejects an invalid EXP before sending', () => {
    story(
      update,
      given(initNew().model),
      message(Message.UpdatedPassword({ value: 'secret' })),
      message(Message.UpdatedText({ field: 'exp', value: 'abc' })),
      message(Message.ClickedSave()),
      Command.expectNone(),
      model(model => {
        expect(editing(model).submission).toEqual(
          Submission.Failed({
            message: 'EXP は 0 以上の整数で入力してください',
          }),
        )
      }),
    )
  })

  test('creates the character and moves to it', () => {
    story(
      update,
      given(initNew().model),
      message(Message.UpdatedText({ field: 'characterName', value: 'ルル' })),
      message(Message.UpdatedPassword({ value: 'secret' })),
      message(Message.ClickedSave()),
      model(model => {
        expect(editing(model).submission).toEqual(Submission.Saving())
      }),
      Command.expectExact(CreateCharacter({ sheet: lulu, password: 'secret' })),
      Command.resolve(
        CreateCharacter({ sheet: lulu, password: 'secret' }),
        Message.SucceededSave({ id: 'new' }),
      ),
      Command.expectExact(NavigateToCharacter({ id: 'new' })),
      Command.resolve(
        NavigateToCharacter({ id: 'new' }),
        Message.CompletedNavigateToCharacter(),
      ),
    )
  })

  test('keeps the input when saving fails', () => {
    story(
      update,
      given(initNew().model),
      message(Message.UpdatedText({ field: 'characterName', value: 'ルル' })),
      message(Message.UpdatedPassword({ value: 'secret' })),
      message(Message.ClickedSave()),
      Command.resolve(
        CreateCharacter({ sheet: lulu, password: 'secret' }),
        Message.FailedSave({ message: 'internal' }),
      ),
      model(model => {
        expect(editing(model)).toMatchObject({
          draft: fromSheet(lulu),
          password: 'secret',
          submission: Submission.Failed({ message: 'internal' }),
        })
      }),
    )
  })

  test('does not send twice while saving', () => {
    const saving = update(
      update(initNew().model, Message.UpdatedPassword({ value: 'secret' }))
        .model,
      Message.ClickedSave(),
    ).model
    story(
      update,
      given(saving),
      message(Message.ClickedSave()),
      Command.expectNone(),
      model(model => {
        expect(editing(model).submission).toEqual(Submission.Saving())
      }),
    )
  })

  test('ignores a save result when not saving', () => {
    story(
      update,
      given(initNew().model),
      message(Message.SucceededSave({ id: 'new' })),
      Command.expectNone(),
    )
  })
})

describe('editor page: editing', () => {
  test('asks for the password in a dialog and keeps the input when it is wrong', () => {
    story(
      update,
      given(editingLulu()),
      message(Message.ClickedSave()),
      model(model => {
        expect(editing(model).passwordDialog.isOpen).toBe(true)
      }),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.UpdatedPassword({ value: 'wrong' })),
      message(Message.SubmittedPassword()),
      Command.expectExact(
        UpdateCharacter({ id: 'a', sheet: lulu, password: 'wrong' }),
      ),
      Command.resolve(
        UpdateCharacter({ id: 'a', sheet: lulu, password: 'wrong' }),
        Message.FailedSave({ message: 'パスワードが違います' }),
      ),
      model(model => {
        expect(editing(model)).toMatchObject({
          draft: fromSheet(lulu),
          submission: Submission.Failed({ message: 'パスワードが違います' }),
        })
        expect(editing(model).passwordDialog.isOpen).toBe(true)
      }),
    )
  })

  test('saves with the right password and moves to the character', () => {
    story(
      update,
      given(editingLulu()),
      message(Message.ClickedSave()),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.UpdatedPassword({ value: 'secret' })),
      message(Message.SubmittedPassword()),
      Command.resolve(
        UpdateCharacter({ id: 'a', sheet: lulu, password: 'secret' }),
        Message.SucceededSave({ id: 'a' }),
      ),
      Command.expectExact(Dialog.CloseDialog, NavigateToCharacter({ id: 'a' })),
      Command.resolve(Dialog.CloseDialog, closedDialog),
      Command.resolve(
        NavigateToCharacter({ id: 'a' }),
        Message.CompletedNavigateToCharacter(),
      ),
    )
  })

  test('rejects an empty password in the dialog', () => {
    story(
      update,
      given(editingLulu()),
      message(Message.ClickedSave()),
      Command.resolve(Dialog.ShowDialog, showedDialog),
      message(Message.SubmittedPassword()),
      Command.expectNone(),
      model(model => {
        expect(editing(model).submission).toEqual(
          Submission.Failed({ message: 'パスワードを入力してください' }),
        )
      }),
    )
  })

  test('does not open the dialog when the input is invalid', () => {
    story(
      update,
      given(editingLulu()),
      message(Message.UpdatedText({ field: 'exp', value: '' })),
      message(Message.ClickedSave()),
      Command.expectNone(),
      model(model => {
        expect(editing(model).passwordDialog.isOpen).toBe(false)
      }),
    )
  })
})
