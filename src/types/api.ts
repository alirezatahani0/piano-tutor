export interface PlayerStatus {
  playing: boolean
  paused: boolean
  file: string | null
  title: string | null
  elapsed: number
  duration: number
  arduino: boolean
  preset: string
  led_offset: number
  num_leds: number
  fold_to_strip: boolean
  first_midi: number
  last_midi: number
  keyboard: string
  keys: number
  bpm: number
  effective_bpm: number
  tempo_rate: number
  led_color: string
  led_rgb: [number, number, number]
  key: string | null
  time_signature: string
  beats_per_bar: number
  counting_in: boolean
  count_beat: number
  count_beats: number
}

export interface Song {
  filename: string
  title: string
  artist?: string
  key?: string
  bpm?: number
  time_signature?: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface SerialPort {
  port: string
  description: string
}

export interface FilesResponse {
  files: Song[]
}

export interface StatusResponse {
  status: PlayerStatus
}
