import type { FirebaseEnv } from './firebase/config'

const SITE_TITLE = 'りゅうたま キャラクターシート'

export const DEV_PROJECT_ID = 'ryutama-charsheet-dev'

export const isDevSite = (env: FirebaseEnv): boolean =>
  env['VITE_FIREBASE_PROJECT_ID'] === DEV_PROJECT_ID

// 開発環境のサイトは本番と見分けられるよう、タイトルに印を付ける
export const siteTitle = (env: FirebaseEnv): string =>
  isDevSite(env) ? `${SITE_TITLE}（開発用）` : SITE_TITLE
