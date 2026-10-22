import { Array, Schema, String, pipe } from 'effect'

import { CharacterSummary } from '@ryutama/character'

export const ListedCharacter = Schema.Struct({
  id: Schema.String,
  ...CharacterSummary.fields,
})
export type ListedCharacter = typeof ListedCharacter.Type

const normalize = (text: string): string => text.normalize('NFKC').toLowerCase()

const searchableTexts = (character: ListedCharacter): ReadonlyArray<string> => [
  character.characterName,
  character.playerName,
  ...character.classes,
  ...character.types,
]

export const searchCharacters = (
  characters: ReadonlyArray<ListedCharacter>,
  query: string,
): ReadonlyArray<ListedCharacter> => {
  const normalizedQuery = normalize(String.trim(query))
  if (String.isEmpty(normalizedQuery)) {
    return characters
  }
  return Array.filter(characters, character =>
    pipe(
      searchableTexts(character),
      Array.some(text => normalize(text).includes(normalizedQuery)),
    ),
  )
}
