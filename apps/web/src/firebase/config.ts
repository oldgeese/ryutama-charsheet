import type { FirebaseOptions } from 'firebase/app'

export type FirebaseEnv = Readonly<Record<string, string | undefined>>

export type WebConfig = {
  readonly options: FirebaseOptions
  readonly useEmulators: boolean
}

export const DEMO_PROJECT_ID = 'demo-ryutama'
export const FUNCTIONS_REGION = 'asia-northeast1'

const OPTION_ENV_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  appId: 'VITE_FIREBASE_APP_ID',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
} as const

export const makeConfig = (env: FirebaseEnv): WebConfig => {
  const options: FirebaseOptions = {
    projectId: env['VITE_FIREBASE_PROJECT_ID'] ?? DEMO_PROJECT_ID,
  }
  for (const [option, key] of Object.entries(OPTION_ENV_KEYS)) {
    const value = env[key]
    if (value !== undefined) {
      Object.assign(options, { [option]: value })
    }
  }
  return { options, useEmulators: env['VITE_USE_EMULATORS'] === 'true' }
}
