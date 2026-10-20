import { describe, expect, test } from 'vitest'

import { makeConfig } from './config'

describe('makeConfig', () => {
  test('falls back to demo-ryutama when no env is given', () => {
    const config = makeConfig({})
    expect(config.options.projectId).toBe('demo-ryutama')
    expect(config.useEmulators).toBe(false)
  })

  test('uses the given project settings', () => {
    const config = makeConfig({
      VITE_FIREBASE_PROJECT_ID: 'ryutama-prod',
      VITE_FIREBASE_API_KEY: 'key',
      VITE_FIREBASE_APP_ID: 'app',
    })
    expect(config.options).toMatchObject({
      projectId: 'ryutama-prod',
      apiKey: 'key',
      appId: 'app',
    })
  })

  test('omits settings that are not given', () => {
    expect(Object.keys(makeConfig({}).options)).toEqual(['projectId'])
  })

  test('connects to the emulators only when VITE_USE_EMULATORS is exactly "true"', () => {
    expect(makeConfig({ VITE_USE_EMULATORS: 'true' }).useEmulators).toBe(true)
    for (const value of ['TRUE', '1', '', 'false', undefined]) {
      expect(makeConfig({ VITE_USE_EMULATORS: value }).useEmulators).toBe(
        false,
      )
    }
  })
})
