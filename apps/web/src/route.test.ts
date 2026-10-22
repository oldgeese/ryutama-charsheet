import { Option } from 'effect'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { AppRoute, urlToAppRoute } from './route'

const parse = (path: string) =>
  urlToAppRoute(
    Option.getOrThrowWith(
      fromString(`http://localhost${path}`),
      () => new Error(`Failed to parse url: ${path}`),
    ),
  )

describe('urlToAppRoute', () => {
  test('parses every page', () => {
    expect(parse('/')).toEqual(AppRoute.Top())
    expect(parse('/characters/new')).toEqual(AppRoute.NewCharacter())
    expect(parse('/characters/abc123')).toEqual(
      AppRoute.Character({ id: 'abc123' }),
    )
    expect(parse('/characters/abc123/edit')).toEqual(
      AppRoute.EditCharacter({ id: 'abc123' }),
    )
  })

  test('falls back to NotFound', () => {
    expect(parse('/nope')._tag).toBe('NotFound')
    expect(parse('/characters')._tag).toBe('NotFound')
    expect(parse('/characters/abc123/delete')._tag).toBe('NotFound')
  })
})
