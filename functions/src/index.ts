import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { onCall } from 'firebase-functions/v2/https'

import {
  createCharacter as create,
  duplicateCharacter as duplicate,
  updateCharacter as update,
} from './characters.js'
import { ping as makePing } from './ping.js'
import { firestoreStore } from './store.js'

initializeApp()
const store = firestoreStore(getFirestore())

const options = { region: 'asia-northeast1' }

export const ping = onCall(options, () => makePing(new Date()))

export const createCharacter = onCall(options, request =>
  create(store, request.data, new Date()),
)

export const updateCharacter = onCall(options, request =>
  update(store, request.data),
)

export const duplicateCharacter = onCall(options, request =>
  duplicate(store, request.data, new Date()),
)
