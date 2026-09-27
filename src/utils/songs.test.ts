import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeSong, normalizeSongs } from './songs'

describe('normalizeSong', () => {
  it('maps API `name` to `filename` so library selection can identify songs', () => {
    const song = normalizeSong({
      name: 'Albeniz - Espana_Opus_165_Tango.mid',
      title: 'Albeniz - Espana_Opus_165_Tango',
      bpm: 62.6,
      duration: 127.3,
    })

    assert.equal(song.filename, 'Albeniz - Espana_Opus_165_Tango.mid')
    assert.equal(song.title, 'Albeniz - Espana_Opus_165_Tango')
    assert.equal(song.bpm, 62.6)
  })

  it('keeps distinct filenames so selecting one song does not select all', () => {
    const songs = normalizeSongs([
      { name: 'a.mid', title: 'A' },
      { name: 'b.mid', title: 'B' },
    ])

    assert.equal(songs[0].filename, 'a.mid')
    assert.equal(songs[1].filename, 'b.mid')
    assert.notEqual(songs[0].filename, songs[1].filename)
  })

  it('prefers filename when both name and filename exist', () => {
    const song = normalizeSong({ name: 'old.mid', filename: 'new.mid', title: 'Song' })
    assert.equal(song.filename, 'new.mid')
  })
})
