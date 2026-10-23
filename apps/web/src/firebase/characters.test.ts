import { describe, expect, test } from 'vitest'

import { saveErrorMessage } from './characters'
import { FirebaseCallError } from './service'

const error = (code: string, message: string) =>
  new FirebaseCallError({ code, message })

describe('saveErrorMessage', () => {
  test('says the password is wrong on permission-denied', () => {
    expect(
      saveErrorMessage(
        error('functions/permission-denied', 'パスワードが違います [403]'),
      ),
    ).toBe('パスワードが違います')
  })

  test('says the character is gone on not-found', () => {
    expect(saveErrorMessage(error('functions/not-found', 'x'))).toBe(
      'キャラクターが見つかりません',
    )
  })

  test('keeps the message of other errors', () => {
    expect(saveErrorMessage(error('functions/internal', 'internal'))).toBe(
      '保存できませんでした: internal',
    )
  })
})
