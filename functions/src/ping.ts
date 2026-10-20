export type PingResponse = {
  readonly message: 'pong'
  readonly at: string
}

export const ping = (now: Date): PingResponse => ({
  message: 'pong',
  at: now.toISOString(),
})
