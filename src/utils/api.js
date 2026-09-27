import axios from 'axios';
const API_BASE = '/api';
const client = axios.create({
    baseURL: API_BASE,
    timeout: 5000,
});
export const apiClient = {
    // Song library
    getFiles: async () => {
        const res = await client.get('/files');
        return res.data.files;
    },
    // Player control
    play: async (filename) => {
        await client.post('/play', { filename });
    },
    pause: async () => {
        await client.post('/pause');
    },
    stop: async () => {
        await client.post('/stop');
    },
    seek: async (position) => {
        await client.post('/seek', { position });
    },
    setTempo: async (bpm) => {
        await client.post('/set-tempo', { bpm });
    },
    setTempoRate: async (rate) => {
        await client.post('/set-tempo-rate', { rate });
    },
    // Device
    getPorts: async () => {
        const res = await client.get('/ports');
        return res.data.ports;
    },
    connect: async (port, preset) => {
        await client.post('/connect', { port, preset });
    },
    // LED
    setLedColor: async (color) => {
        await client.post('/set-led-color', { color });
    },
    // Status
    getStatus: async () => {
        const res = await client.get('/status');
        return res.data.status;
    },
};
