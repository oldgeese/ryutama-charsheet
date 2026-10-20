import { Context, Effect, Layer, Option, Schema } from 'effect'
import { initializeApp } from 'firebase/app'
import {
  type Firestore,
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore'
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from 'firebase/functions'

import { FUNCTIONS_REGION, makeConfig } from './config'

export class FirebaseCallError extends Schema.TaggedError<FirebaseCallError>()(
  'FirebaseCallError',
  { code: Schema.String, message: Schema.String },
) {}

export type Callable = (
  name: string,
) => (data: unknown) => Promise<{ readonly data: unknown }>

const decodeCode = Schema.decodeUnknownOption(
  Schema.Struct({ code: Schema.String }),
)
const decodeMessage = Schema.decodeUnknownOption(
  Schema.Struct({ message: Schema.String }),
)

const toCallError = (error: unknown) =>
  new FirebaseCallError({
    code: Option.match(decodeCode(error), {
      onNone: () => 'unknown',
      onSome: ({ code }) => code,
    }),
    message: Option.match(decodeMessage(error), {
      onNone: () => String(error),
      onSome: ({ message }) => message,
    }),
  })

export const makeCall =
  (callable: Callable) =>
  <A, I>(
    name: string,
    data: unknown,
    response: Schema.Codec<A, I>,
  ): Effect.Effect<A, FirebaseCallError> =>
    Effect.tryPromise({
      try: () => callable(name)(data),
      catch: toCallError,
    }).pipe(
      Effect.flatMap(result =>
        Schema.decodeUnknownEffect(response)(result.data).pipe(
          Effect.mapError(
            error =>
              new FirebaseCallError({
                code: 'invalid-response',
                message: error.message,
              }),
          ),
        ),
      ),
    )

const EMULATOR_HOST = '127.0.0.1'
const FIRESTORE_EMULATOR_PORT = 8080
const FUNCTIONS_EMULATOR_PORT = 5001

const make = Effect.sync(() => {
  const config = makeConfig(import.meta.env)
  const app = initializeApp(config.options)
  const firestore = getFirestore(app)
  const functions = getFunctions(app, FUNCTIONS_REGION)
  if (config.useEmulators) {
    connectFirestoreEmulator(firestore, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT)
    connectFunctionsEmulator(functions, EMULATOR_HOST, FUNCTIONS_EMULATOR_PORT)
  }
  return {
    firestore,
    call: makeCall(name => httpsCallable(functions, name)),
  }
})

export class FirebaseService extends Context.Service<
  FirebaseService,
  {
    readonly firestore: Firestore
    readonly call: ReturnType<typeof makeCall>
  }
>()('FirebaseService') {
  static readonly Default = Layer.effect(this, make)
}
