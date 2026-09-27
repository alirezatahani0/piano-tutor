import axios from 'axios'
import type { FilesResponse, StatusResponse, SerialPort } from '../types/api'

const API_BASE = '/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
})

export const apiClient = {
  // Song library
  getFiles: async () => {
    const res = await client.get<FilesResponse>('/files')
    return res.data.files
  },

  // Player control
  play: async (filename: string) => {
    await client.post('/play', { filename })
  },

  pause: async () => {
    await client.post('/pause')
  },

  stop: async () => {
    await client.post('/stop')
  },

  seek: async (position: number) => {
    await client.post('/seek', { position })
  },

  setTempo: async (bpm: number) => {
    await client.post('/set-tempo', { bpm })
  },

  setTempoRate: async (rate: number) => {
    await client.post('/set-tempo-rate', { rate })
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

  // Status
  getStatus: async () => {
    const res = await client.get<StatusResponse>('/status')
    return res.data.status
  },
}
