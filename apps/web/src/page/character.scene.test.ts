import { expect, given, role, scene, text } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { type CharacterSheet, emptySheet } from '@ryutama/character'

import { Sheet, update, view } from './character'

const lulu: CharacterSheet = {
  ...emptySheet,
  characterName: 'ルル',
  playerName: 'たろう',
  level: 6,
  classes: ['ミンストレル', 'ヒーラー'],
  types: ['テクニックタイプ'],
  abilities: { strength: 4, dexterity: 8, intelligence: 6, spirit: 12 },
  hp: { max: '8', current: '5' },
  classAbilities: [
    { name: '旅の歌', checkAbilities: '精神＋知力', effect: '' },
  ],
  weapons: [
    {
      name: '短剣',
      accuracy: '敏捷＋知力',
      damage: '知力',
      durability: '3',
      notes: '',
    },
  ],
  terrainBonuses: { ...emptySheet.terrainBonuses, 草原: '+1' },
  memo: '一行目\n二行目',
}

describe('character page view', () => {
  test('shows the sheet', () => {
    scene(
      { update, view },
      given(Sheet.Loaded({ id: 'lulu', sheet: lulu })),
      expect(role('heading', { name: 'ルル' })).toExist(),
      expect(text('たろう')).toExist(),
      expect(text('ミンストレル／ヒーラー')).toExist(),
      expect(text('テクニックタイプ')).toExist(),
      expect(text('d12')).toExist(),
      expect(text('5 / 8')).toExist(),
      expect(role('cell', { name: '旅の歌' })).toExist(),
      expect(role('cell', { name: '短剣' })).toExist(),
      expect(role('cell', { name: '+1' })).toExist(),
      expect(text('一行目\n二行目')).toExist(),
    )
  })

  test('links to the edit page and back to the list', () => {
    scene(
      { update, view },
      given(Sheet.Loaded({ id: 'lulu', sheet: lulu })),
      expect(role('link', { name: '編集' })).toHaveAttr(
        'href',
        '/characters/lulu/edit',
      ),
      expect(role('link', { name: '一覧に戻る' })).toHaveAttr('href', '/'),
    )
  })

  test('marks blank fields and empty tables', () => {
    scene(
      { update, view },
      given(Sheet.Loaded({ id: 'empty', sheet: emptySheet })),
      expect(role('heading', { name: '名前のないキャラクター' })).toExist(),
      expect(text('—')).toExist(),
      expect(text('なし')).toExist(),
    )
  })

  test('says so when the character does not exist', () => {
    scene(
      { update, view },
      given(Sheet.NotFound({ id: 'nope' })),
      expect(
        role('heading', { name: 'キャラクターが見つかりません' }),
      ).toExist(),
      expect(role('link', { name: '一覧に戻る' })).toHaveAttr('href', '/'),
    )
  })

  test('shows loading and failure', () => {
    scene(
      { update, view },
      given(Sheet.Loading({ id: 'lulu' })),
      expect(text('読み込み中…')).toExist(),
    )
    scene(
      { update, view },
      given(Sheet.Failed({ id: 'lulu', message: 'offline' })),
      expect(text('キャラクターを読み込めませんでした: offline')).toExist(),
      expect(role('button', { name: '再読み込み' })).toExist(),
    )
  })
})
