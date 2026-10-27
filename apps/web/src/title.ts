import type { FirebaseEnv } from './firebase/config'

const SITE_TITLE = 'りゅうたま キャラクターシート'

export const DEV_PROJECT_ID = 'ryutama-charsheet-dev'

// 開発環境のサイトは本番と見分けられるよう、タイトルに印を付ける
export const siteTitle = (env: FirebaseEnv): string =>
  env['VITE_FIREBASE_PROJECT_ID'] === DEV_PROJECT_ID
    ? `${SITE_TITLE}（開発用）`
    : SITE_TITLE
