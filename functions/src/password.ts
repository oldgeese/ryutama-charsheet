import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

// characterSecrets に保存する形。どちらも base64
export type PasswordHash = {
  readonly salt: string
  readonly hash: string
}

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password.normalize('NFC'), salt, KEY_LENGTH, (error, key) =>
      error === null ? resolve(key) : reject(error),
    ),
  )

export const hashPassword = async (password: string): Promise<PasswordHash> => {
  const salt = randomBytes(16)
  const hash = await derive(password, salt)
  return { salt: salt.toString('base64'), hash: hash.toString('base64') }
}

export const verifyPassword = async (
  password: string,
  secret: PasswordHash,
): Promise<boolean> => {
  const expected = Buffer.from(secret.hash, 'base64')
  const actual = await derive(password, Buffer.from(secret.salt, 'base64'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
