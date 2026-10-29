import { describe, expect, it } from 'vitest'
import { DIRECTIONS } from '@/game/attacks'
import { FRAME_CELLS, terrainLayout, type Rect } from './terrain'

const f = FRAME_CELLS
const width = (r: Rect) => r.x2 - r.x1
const height = (r: Rect) => r.y2 - r.y1
const inside = (r: Rect, x: number, y: number) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2

describe('terrainLayout', () => {
  it('frames the city on every side', () => {
    const t = terrainLayout(4, 'north')
    expect(t.size).toBeCloseTo(4 + 2 * f)
    expect(t.city).toEqual({ x1: f, y1: f, x2: 4 + f, y2: 4 + f })
  })

  it('walls both flanks with cliffs the full depth of the board', () => {
    const t = terrainLayout(5, 'north')
    const [left, right] = t.cliffs
    expect(left).toEqual({ x1: 0, y1: 0, x2: f, y2: t.size })
    expect(right).toEqual({ x1: 5 + f, y1: 0, x2: t.size, y2: t.size })
  })

  it('opens the approach exactly as wide as the city', () => {
    const t = terrainLayout(6, 'north')
    expect(t.approach).toEqual({ x1: f, y1: 0, x2: 6 + f, y2: f })
  })

  it('puts the fields behind the city, between the cliffs', () => {
    const t = terrainLayout(4, 'north')
    expect(Math.min(...t.fields.map((p) => p.rect.x1))).toBeCloseTo(f)
    expect(Math.max(...t.fields.map((p) => p.rect.x2))).toBeCloseTo(4 + f)
    const covered = t.fields.reduce((sum, p) => sum + width(p.rect), 0)
    expect(covered).toBeCloseTo(4)
    for (const p of t.fields) expect(p.rect.y1).toBeCloseTo(4 + f)
  })

  it('rotates the approach onto the attack side', () => {
    const size = 4 + 2 * f
    expect(terrainLayout(4, 'south').approach.y1).toBeCloseTo(size - f)
    expect(terrainLayout(4, 'east').approach.x1).toBeCloseTo(size - f)
    expect(terrainLayout(4, 'west').approach.x2).toBeCloseTo(f)
  })

  it('turns the cliffs across a sideways attack', () => {
    const t = terrainLayout(4, 'east')
    for (const cliff of t.cliffs) {
      expect(width(cliff)).toBeCloseTo(t.size)
      expect(height(cliff)).toBeCloseTo(f)
    }
    expect(height(t.approach)).toBeCloseTo(4)
  })

  it('keeps every boulder inside a cliff', () => {
    for (const direction of DIRECTIONS) {
      const t = terrainLayout(5, direction)
      for (const b of t.boulders) {
        expect(t.cliffs.some((c) => inside(c, b.x, b.y))).toBe(true)
      }
    }
  })

  it('is deterministic', () => {
    expect(terrainLayout(5, 'west')).toEqual(terrainLayout(5, 'west'))
  })
})
