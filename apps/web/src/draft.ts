import { Option, Result, Schema, String } from 'effect'

import { CharacterSheet, emptySheet } from '@ryutama/character'

// 入力中のシート。EXP は入力欄の文字のまま持ち、保存するときに数に直す
export const Draft = Schema.Struct({
  ...CharacterSheet.fields,
  exp: Schema.String,
})
export type Draft = typeof Draft.Type

export const fromSheet = (sheet: CharacterSheet): Draft => ({
  ...sheet,
  exp: `${sheet.exp}`,
})

export const emptyDraft: Draft = fromSheet(emptySheet)

const parseExp = (exp: string): Option.Option<number> => {
  const digits = String.trim(exp.normalize('NFKC'))
  return /^\d+$/.test(digits) ? Option.some(Number(digits)) : Option.none()
}

const decodeSheet = Schema.decodeUnknownOption(CharacterSheet)

export const toSheet = (draft: Draft): Result.Result<CharacterSheet, string> =>
  Option.match(parseExp(draft.exp), {
    onNone: () => Result.fail('EXP は 0 以上の整数で入力してください'),
    onSome: exp =>
      Option.match(decodeSheet({ ...draft, exp }), {
        onNone: () => Result.fail('入力が正しくありません'),
        onSome: Result.succeed,
      }),
  })
