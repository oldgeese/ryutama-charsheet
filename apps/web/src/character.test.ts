import { describe, expect, test } from 'vitest'

import { type ListedCharacter, searchCharacters } from './character'

const lulu: ListedCharacter = {
  id: 'a',
  characterName: 'ルル',
  playerName: 'Taro',
  level: 3,
  classes: ['ミンストレル'],
  types: ['アタックタイプ'],
}
const bob: ListedCharacter = {
  id: 'b',
  characterName: 'ボブ',
  playerName: 'はなこ',
  level: 6,
  classes: ['ハンター', 'ヒーラー'],
  types: ['テクニックタイプ', 'マジックタイプ'],
}
const characters = [lulu, bob]

describe('searchCharacters', () => {
  test('returns everything for an empty or blank query', () => {
    expect(searchCharacters(characters, '')).toEqual(characters)
    expect(searchCharacters(characters, '  ')).toEqual(characters)
  })

  test('matches part of the character name or player name', () => {
    expect(searchCharacters(characters, 'ル')).toEqual([lulu])
    expect(searchCharacters(characters, 'はな')).toEqual([bob])
  })

  test('matches any of the classes and types', () => {
    expect(searchCharacters(characters, 'ヒーラー')).toEqual([bob])
    expect(searchCharacters(characters, 'マジック')).toEqual([bob])
    expect(searchCharacters(characters, 'タイプ')).toEqual(characters)
  })

  test('ignores case and full-width letters', () => {
    expect(searchCharacters(characters, 'taro')).toEqual([lulu])
    expect(searchCharacters(characters, 'ＴＡＲ')).toEqual([lulu])
  })

  test('does not match the level', () => {
    expect(searchCharacters(characters, '3')).toEqual([])
  })
})
