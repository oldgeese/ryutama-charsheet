import { onCall } from 'firebase-functions/v2/https'

import { ping as makePing } from './ping.js'

export const ping = onCall({ region: 'asia-northeast1' }, () =>
  makePing(new Date()),
)
