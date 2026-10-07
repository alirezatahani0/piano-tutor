import { useEffect } from 'react'
import { startVoice, stopAllVoices, stopVoice } from '../utils/noteAudio'

type WsMessage = {
  type?: string
  action?: string
  midi?: number
}

/**
 * Subscribe to `/ws` note events and play a soft Web Audio preview.
 * The backend drives LEDs over serial; this restores audible practice preview
 * from the legacy UI (no piano/speakers required).
 */
export function useNotePreview(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    let socket: WebSocket | null = null
    let closed = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    const connect = () => {
      if (closed) return
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`)

      socket.addEventListener('message', (event) => {
        let message: WsMessage
        try {
          message = JSON.parse(String(event.data)) as WsMessage
        } catch {
          return
        }

        if (message.type === 'note' && typeof message.midi === 'number') {
          if (message.action === 'ON') startVoice(message.midi)
          else stopVoice(message.midi)
          return
        }

        if (message.type === 'done' || message.type === 'error') {
          stopAllVoices()
        }

        if (message.type === 'status') {
          const status = message as WsMessage & { playing?: boolean; paused?: boolean }
          if (!status.playing || status.paused) stopAllVoices()
        }
      })

      socket.addEventListener('close', () => {
        stopAllVoices()
        if (closed) return
        retryTimer = setTimeout(connect, 1500)
      })
    }

    connect()

    return () => {
      closed = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
      stopAllVoices()
    }
  }, [enabled])
}
