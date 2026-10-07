import axios from 'axios'
import type { StatusResponse, SerialPort, PlayerStatus } from '../types/api'
import { normalizeSongs, type ApiSong } from './songs'

const API_BASE = '/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

export const apiClient = {
  // Song library
  getFiles: async () => {
    const res = await client.get<{ files: ApiSong[] }>('/files')
    return normalizeSongs(res.data.files)
  },

  // Player control
  play: async (filename: string, options?: { countIn?: boolean }) => {
    const res = await client.post<PlayerStatus>('/play', {
      filename,
      count_in: options?.countIn ?? false,
    })
    return res.data
  },

  pause: async () => {
    const res = await client.post<PlayerStatus>('/pause')
    return res.data
  },

  resume: async () => {
    const res = await client.post<PlayerStatus>('/resume')
    return res.data
  },

  stop: async () => {
    const res = await client.post<PlayerStatus>('/stop')
    return res.data
  },

  seek: async (position: number) => {
    await client.post('/seek', { position })
  },

  setTempo: async (bpm: number) => {
    const res = await client.post<PlayerStatus>('/tempo', { bpm })
    return res.data
  },

  setTempoRate: async (rate: number) => {
    const res = await client.post<PlayerStatus>('/tempo', { rate })
    return res.data
  },

  // Device
  getPorts: async () => {
    const res = await client.get<{ ports: SerialPort[] }>('/ports')
    return res.data.ports
  },

  connect: async (port: string, preset: string) => {
    await client.post('/connect', { port, preset })
  },

  // LED
  setLedColor: async (color: string) => {
    await client.post('/set-led-color', { color })
  },

  // Status — server returns the status object directly (not wrapped in `{ status }`)
  getStatus: async () => {
    const res = await client.get<PlayerStatus | StatusResponse>('/status')
    const data = res.data
    return 'status' in data && data.status ? data.status : (data as PlayerStatus)
  },
}
