import { describe, expect, it } from 'vitest'
import { createRng } from './rng'

describe('rng', () => {
  it('continues the same sequence from its seed', () => {
    const rng = createRng(42)
    rng.next()
    rng.next()
    const resumed = createRng(rng.seed())
    const expected = [rng.next(), rng.next(), rng.next()]
    expect([resumed.next(), resumed.next(), resumed.next()]).toEqual(expected)
  })
})
