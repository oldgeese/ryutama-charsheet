import { describe, expect, test } from 'vitest'

import { callErrorMessage } from './characters'
import { FirebaseCallError } from './service'

const error = (code: string, message: string) =>
  new FirebaseCallError({ code, message })

describe('callErrorMessage', () => {
  test('says the password is wrong on permission-denied', () => {
    expect(
      callErrorMessage(
        '保存',
        error('functions/permission-denied', 'パスワードが違います [403]'),
      ),
    ).toBe('パスワードが違います')
  })

  test('says the character is gone on not-found', () => {
    expect(callErrorMessage('複製', error('functions/not-found', 'x'))).toBe(
      'キャラクターが見つかりません',
    )
  })

  test('names the action for other errors', () => {
    expect(
      callErrorMessage('保存', error('functions/internal', 'internal')),
    ).toBe('保存できませんでした: internal')
    expect(
      callErrorMessage('複製', error('functions/internal', 'internal')),
    ).toBe('複製できませんでした: internal')
  })
})
