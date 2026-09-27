import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mergePolledStatus,
  playbackIsBusy,
  previewStatusForSong,
} from './playerStatus'
import type { PlayerStatus, Song } from '../types/api'

const baseStatus = (overrides: Partial<PlayerStatus> = {}): PlayerStatus => ({
  playing: false,
  paused: false,
  file: 'old.mid',
  title: 'Old',
  elapsed: 12,
  duration: 100,
  arduino: false,
  preset: 'q49',
  led_offset: 24,
  num_leds: 73,
  fold_to_strip: false,
  first_midi: 36,
  last_midi: 84,
  keyboard: 'Q49',
  keys: 49,
  bpm: 100,
  effective_bpm: 100,
  tempo_rate: 1,
  led_color: '#00dc28',
  led_rgb: [0, 220, 40],
  key: 'C',
  time_signature: '4/4',
  beats_per_bar: 4,
  counting_in: false,
  count_beat: 0,
  count_beats: 0,
  ...overrides,
})

const song: Song = {
  filename: 'new.mid',
  title: 'New Song',
  bpm: 80,
  duration: 50,
  key: 'G',
  time_signature: '3/4',
}

describe('playbackIsBusy', () => {
  it('is busy while playing, paused, counting in, or elapsed', () => {
    assert.equal(playbackIsBusy(baseStatus({ playing: true, elapsed: 0 })), true)
    assert.equal(playbackIsBusy(baseStatus({ paused: true, elapsed: 0, playing: false })), true)
    assert.equal(playbackIsBusy(baseStatus({ counting_in: true, elapsed: 0 })), true)
    assert.equal(playbackIsBusy(baseStatus({ elapsed: 1.5 })), true)
    assert.equal(playbackIsBusy(baseStatus({ elapsed: 0 })), false)
  })
})

describe('previewStatusForSong', () => {
  it('clears playback and applies the newly selected song metadata', () => {
    const next = previewStatusForSong(
      baseStatus({ playing: true, paused: true, counting_in: true, count_beat: 2, elapsed: 40 }),
      song
    )

    assert.equal(next.playing, false)
    assert.equal(next.paused, false)
    assert.equal(next.counting_in, false)
    assert.equal(next.count_beat, 0)
    assert.equal(next.elapsed, 0)
    assert.equal(next.file, null)
    assert.equal(next.title, 'New Song')
    assert.equal(next.duration, 50)
    assert.equal(next.bpm, 80)
    assert.equal(next.effective_bpm, 80)
    assert.equal(next.key, 'G')
    assert.equal(next.time_signature, '3/4')
    assert.equal(next.preset, 'q49')
  })
})

describe('mergePolledStatus', () => {
  it('keeps selected song preview when server still reports a different idle file', () => {
    const merged = mergePolledStatus(
      baseStatus({ elapsed: 0, effective_bpm: 105, tempo_rate: 1.05 }),
      song
    )
    assert.equal(merged.title, 'New Song')
    assert.equal(merged.duration, 50)
    assert.equal(merged.elapsed, 0)
    // Preserve server tempo so +/- steppers don't jump against song.bpm * rate
    assert.equal(merged.effective_bpm, 105)
    assert.equal(merged.tempo_rate, 1.05)
    assert.equal(merged.bpm, 80)
  })

  it('does not override an active playback poll', () => {
    const polled = baseStatus({ playing: true, file: 'old.mid', elapsed: 9 })
    const merged = mergePolledStatus(polled, song)
    assert.equal(merged.playing, true)
    assert.equal(merged.file, 'old.mid')
    assert.equal(merged.elapsed, 9)
  })
})
