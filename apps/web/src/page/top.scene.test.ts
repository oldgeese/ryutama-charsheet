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

import { type ListedCharacter } from '../character'
import {
  Characters,
  DuplicateCharacter,
  FetchCharacters,
  Message,
  type Model,
  notLoaded,
  update,
  view,
} from './top'

const lulu: ListedCharacter = {
  id: 'lulu',
  characterName: 'ルル',
  playerName: 'たろう',
  level: 3,
  classes: ['ミンストレル'],
  types: ['アタックタイプ'],
}
const bob: ListedCharacter = {
  id: 'bob',
  characterName: 'ボブ',
  playerName: 'はなこ',
  level: 6,
  classes: ['ハンター', 'ヒーラー'],
  types: ['テクニックタイプ', 'マジックタイプ'],
}

const loaded = (searchInput: string): Model => ({
  ...notLoaded,
  searchInput,
  characters: Characters.Loaded({ characters: [lulu, bob] }),
})

describe('top page view', () => {
  test('lists every character with a link to its page', () => {
    scene(
      { update, view },
      given(loaded('')),
      expect(role('link', { name: '新規作成' })).toHaveAttr(
        'href',
        '/characters/new',
      ),
      expect(role('link', { name: 'ルル' })).toHaveAttr(
        'href',
        '/characters/lulu',
      ),
      expect(text('たろう')).toExist(),
      expect(text('ミンストレル')).toExist(),
      expect(text('アタックタイプ')).toExist(),
      expect(text('Lv.3')).toExist(),
      expect(text('ハンター／ヒーラー')).toExist(),
      expect(text('テクニックタイプ／マジックタイプ')).toExist(),
    )
  })

  test('each row has an edit link', () => {
    scene(
      { update, view },
      given(loaded('')),
      expect(role('link', { name: 'ルルを編集' })).toHaveAttr(
        'href',
        '/characters/lulu/edit',
      ),
    )
  })

  test('the duplicate button opens a password dialog for that character', () => {
    scene(
      { update, view },
      given(loaded('')),
      click(role('button', { name: 'ボブを複製' })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      Mount.resolve(
        Dialog.AcquireResources,
        Dialog.Message.SucceededAcquireResources(),
      ),
      expect(role('heading', { name: '「ボブ」を複製' })).toExist(),
      expect(text('複製先のパスワードは複製元と同じになります。')).toExist(),
      inside(
        role('dialog'),
        click(role('button', { name: '複製' })),
        expect(role('alert')).toHaveText('パスワードを入力してください'),
        type(label('パスワード'), 'wrong'),
        click(role('button', { name: '複製' })),
        expect(role('button', { name: '複製中…' })).toBeDisabled(),
      ),
      Command.resolve(
        DuplicateCharacter({ id: 'bob', password: 'wrong' }),
        Message.FailedDuplicate({ message: 'パスワードが違います' }),
      ),
      inside(
        role('dialog'),
        expect(role('alert')).toHaveText('パスワードが違います'),
        expect(label('パスワード')).toHaveValue('wrong'),
        expect(role('button', { name: 'キャンセル' })).toExist(),
      ),
    )
  })

  test('a successful duplicate reloads the list', () => {
    scene(
      { update, view },
      given(loaded('')),
      click(role('button', { name: 'ルルを複製' })),
      Command.resolve(Dialog.ShowDialog, Dialog.Message.SucceededShowDialog()),
      Mount.resolve(
        Dialog.AcquireResources,
        Dialog.Message.SucceededAcquireResources(),
      ),
      inside(
        role('dialog'),
        type(label('パスワード'), 'secret'),
        click(role('button', { name: '複製' })),
      ),
      Command.resolve(
        DuplicateCharacter({ id: 'lulu', password: 'secret' }),
        Message.SucceededDuplicate({ id: 'copy' }),
      ),
      Command.resolve(
        Dialog.CloseDialog,
        Dialog.Message.CompletedCloseDialog(),
      ),
      Mount.expectEnded(Dialog.AcquireResources),
      expect(role('heading', { name: '「ルル」を複製' })).not.toExist(),
      expect(text('読み込み中…')).toExist(),
      Command.resolve(
        FetchCharacters,
        Message.SucceededFetchCharacters({ characters: [lulu, lulu, bob] }),
      ),
      expect(role('button', { name: 'ルルを複製' })).toExist(),
    )
  })

  test('typing in the search box filters the list', () => {
    scene(
      { update, view },
      given(loaded('')),
      type(role('searchbox', { name: 'キャラクターを検索' }), 'ヒーラー'),
      expect(role('link', { name: 'ボブ' })).toExist(),
      expect(role('link', { name: 'ルル' })).not.toExist(),
    )
  })

  test('says so when nothing matches', () => {
    scene(
      { update, view },
      given(loaded('ゾンビ')),
      expect(text('一致するキャラクターはいません')).toExist(),
    )
  })

  test('says so when there are no characters yet', () => {
    scene(
      { update, view },
      given({
        ...notLoaded,
        characters: Characters.Loaded({ characters: [] }),
      }),
      expect(text('まだキャラクターがいません')).toExist(),
    )
  })

  test('shows loading and failure', () => {
    scene(
      { update, view },
      given({ ...notLoaded, characters: Characters.Loading() }),
      expect(text('読み込み中…')).toExist(),
    )
    scene(
      { update, view },
      given({
        ...notLoaded,
        characters: Characters.Failed({ message: 'offline' }),
      }),
      expect(text('一覧を読み込めませんでした: offline')).toExist(),
      expect(role('button', { name: '再読み込み' })).toExist(),
    )
  })
})
