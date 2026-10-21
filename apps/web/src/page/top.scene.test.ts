import { expect, given, role, scene, text, type } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { type ListedCharacter } from '../character'
import { Characters, type Model, update, view } from './top'

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
        searchInput: '',
        characters: Characters.Loaded({ characters: [] }),
      }),
      expect(text('まだキャラクターがいません')).toExist(),
    )
  })

  test('shows loading and failure', () => {
    scene(
      { update, view },
      given({ searchInput: '', characters: Characters.Loading() }),
      expect(text('読み込み中…')).toExist(),
    )
    scene(
      { update, view },
      given({
        searchInput: '',
        characters: Characters.Failed({ message: 'offline' }),
      }),
      expect(text('一覧を読み込めませんでした: offline')).toExist(),
      expect(role('button', { name: '再読み込み' })).toExist(),
    )
  })
})
