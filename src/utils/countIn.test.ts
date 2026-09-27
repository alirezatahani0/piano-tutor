import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { beatIntervalMs, countInBeatsFor, timeSignatureLabel } from './countIn'
import type { PlayerStatus, Song } from '../types/api'

const song = (overrides: Partial<Song> = {}): Song => ({
  filename: 'a.mid',
  title: 'A',
  time_signature: '3/4',
  bpm: 90,
  ...overrides,
})

const status = (overrides: Partial<PlayerStatus> = {}): PlayerStatus =>
  ({
    playing: false,
    paused: false,
    file: null,
    title: null,
    elapsed: 0,
    duration: 0,
    arduino: false,
    preset: 'q49',
    led_offset: 0,
    num_leds: 73,
    fold_to_strip: false,
    first_midi: 36,
    last_midi: 84,
    keyboard: 'Q49',
    keys: 49,
    bpm: 120,
    effective_bpm: 120,
    tempo_rate: 1,
    led_color: '#00dc28',
    led_rgb: [0, 220, 40],
    key: null,
    time_signature: '4/4',
    beats_per_bar: 4,
    counting_in: false,
    count_beat: 0,
    count_beats: 4,
    ...overrides,
  }) as PlayerStatus

describe('beatIntervalMs', () => {
  it('derives interval from song tempo', () => {
    assert.equal(beatIntervalMs(120), 500)
    assert.equal(beatIntervalMs(60), 1000)
  })
})

describe('countInBeatsFor', () => {
  it('uses the selected song time signature numerator', () => {
    assert.equal(countInBeatsFor(status({ count_beats: 4, beats_per_bar: 4 }), song({ time_signature: '2/4' })), 2)
    assert.equal(countInBeatsFor(status(), song({ time_signature: '3/4' })), 3)
    assert.equal(countInBeatsFor(status(), song({ time_signature: '4/4' })), 4)
    assert.equal(countInBeatsFor(status(), song({ time_signature: '6/8' })), 6)
  })

  it('prefers song signature over stale status count_beats', () => {
    assert.equal(
      countInBeatsFor(status({ count_beats: 4, beats_per_bar: 4, time_signature: '4/4' }), song({ time_signature: '2/4' })),
      2
    )
  })
})

describe('timeSignatureLabel', () => {
  it('uses song signature when present', () => {
    assert.equal(timeSignatureLabel(status(), song({ time_signature: '2/4' })), '2/4')
  })
})
