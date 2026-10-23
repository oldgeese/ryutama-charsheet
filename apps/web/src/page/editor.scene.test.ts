import {
  Command,
  Mount,
  click,
  expect,
  given,
  inside,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Dialog } from '@foldkit/ui'
import { type CharacterSheet, emptySheet } from '@ryutama/character'

import {
  CreateCharacter,
  Editor,
  FetchCharacterToEdit,
  Message,
  type Model,
  UpdateCharacter,
  initNew,
  load,
  update,
  view,
} from './editor'

const lulu: CharacterSheet = {
  ...emptySheet,
  characterName: 'ルル',
  classes: ['ミンストレル', 'ヒーラー'],
  weapons: [
    {
      name: '短剣',
      accuracy: '敏捷＋知力',
      damage: '知力',
      durability: '3',
      notes: '',
    },
  ],
}

const editingLulu = (): Model =>
  update(
    load('a').model,
    Message.SucceededFetchCharacter({ id: 'a', sheet: lulu }),
  ).model

describe('editor page view', () => {
  test('a new character has a password field', () => {
    scene(
      { update, view },
      given(initNew().model),
      expect(role('heading', { name: 'キャラクターの新規作成' })).toExist(),
      expect(role('textbox', { name: 'キャラクター名' })).toHaveValue(''),
      expect(role('combobox', { name: 'レベル' })).toHaveValue('1'),
      expect(text('パスワード')).toExist(),
      expect(role('button', { name: '保存' })).toExist(),
      expect(role('link', { name: '一覧に戻る' })).toHaveAttr('href', '/'),
    )
  })

  test('editing shows the loaded sheet without a password field', () => {
    scene(
      { update, view },
      given(editingLulu()),
      expect(role('heading', { name: 'キャラクターの編集' })).toExist(),
      expect(role('textbox', { name: 'キャラクター名' })).toHaveValue('ルル'),
      expect(role('textbox', { name: '武器 1 の名前' })).toHaveValue('短剣'),
      expect(role('checkbox', { name: 'ヒーラー' })).toBeChecked(),
      expect(role('checkbox', { name: 'ハンター' })).toBeDisabled(),
      expect(text('パスワード')).not.toExist(),
      expect(role('link', { name: 'キャラクターに戻る' })).toHaveAttr(
        'href',
        '/characters/a',
      ),
    )
  })

  test('typing and adding rows update the form', () => {
    scene(
      { update, view },
      given(initNew().model),
      type(role('textbox', { name: 'キャラクター名' }), 'ルル'),
      click(role('button', { name: '旅装を追加' })),
      type(role('textbox', { name: '旅装 1 の名前' }), '寝袋'),
      expect(role('textbox', { name: 'キャラクター名' })).toHaveValue('ルル'),
      expect(role('textbox', { name: '旅装 1 の名前' })).toHaveValue('寝袋'),
      click(role('button', { name: '旅装 1 を削除' })),
      expect(role('textbox', { name: '旅装 1 の名前' })).not.toExist(),
    )
  })

  test('creating without a password shows an error', () => {
    scene(
      { update, view },
      given(initNew().model),
      click(role('button', { name: '保存' })),
      expect(role('alert')).toHaveText('パスワードを入力してください'),
    )
  })

  test('saving creates the character', () => {
    scene(
      { update, view },
      given(initNew().model),
      type(role('textbox', { name: 'キャラクター名' }), 'ルル'),
      type(label('パスワード'), 'secret'),
      click(role('button', { name: '保存' })),
      expect(role('button', { name: '保存中…' })).toBeDisabled(),
      Command.resolve(
        CreateCharacter({
          sheet: { ...emptySheet, characterName: 'ルル' },
          password: 'secret',
        }),
        Message.FailedSave({ message: 'internal' }),
      ),
      expect(role('alert')).toHaveText('internal'),
    )
  })

  test('the password dialog shows a wrong password and keeps the input', () => {
    scene(
      { update, view },
      given(editingLulu()),
      click(role('button', { name: '保存' })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      Mount.resolve(
        Dialog.AcquireResources,
        Dialog.Message.SucceededAcquireResources(),
      ),
      expect(role('heading', { name: 'パスワードを入力して保存' })).toExist(),
      inside(
        role('dialog'),
        type(label('パスワード'), 'wrong'),
        click(role('button', { name: '保存' })),
      ),
      Command.resolve(
        UpdateCharacter({ id: 'a', sheet: lulu, password: 'wrong' }),
        Message.FailedSave({ message: 'パスワードが違います' }),
      ),
      expect(role('alert')).toHaveText('パスワードが違います'),
      expect(role('textbox', { name: 'キャラクター名' })).toHaveValue('ルル'),
      expect(role('button', { name: 'キャンセル' })).toExist(),
    )
  })

  test('shows loading, not found and load failures', () => {
    scene(
      { update, view },
      given(Editor.Loading({ id: 'a' })),
      expect(text('読み込み中…')).toExist(),
    )
    scene(
      { update, view },
      given(Editor.NotFound({ id: 'a' })),
      expect(
        role('heading', { name: 'キャラクターが見つかりません' }),
      ).toExist(),
    )
    scene(
      { update, view },
      given(Editor.LoadFailed({ id: 'a', message: 'offline' })),
      expect(text('キャラクターを読み込めませんでした: offline')).toExist(),
      click(role('button', { name: '再読み込み' })),
      Command.resolve(
        FetchCharacterToEdit({ id: 'a' }),
        Message.MissingCharacter({ id: 'a' }),
      ),
    )
  })
})
