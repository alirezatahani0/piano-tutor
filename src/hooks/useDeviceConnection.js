import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../utils/api';
export function useDeviceConnection() {
    const [ports, setPorts] = useState([]);
    const [selectedPort, setSelectedPort] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('q49');
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Load available ports on mount
    useEffect(() => {
        const loadPorts = async () => {
            try {
                const availablePorts = await apiClient.getPorts();
                setPorts(availablePorts);
                if (availablePorts.length > 0 && !selectedPort) {
                    setSelectedPort(availablePorts[0].port);
                }
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load ports');
            }
        };
        loadPorts();
    }, []);
    const connect = useCallback(async () => {
        if (!selectedPort) {
            setError('No port selected');
            return;
        }
        setLoading(true);
        try {
            await apiClient.connect(selectedPort, selectedPreset);
            setConnected(true);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Connection failed');
            setConnected(false);
        }
        finally {
            setLoading(false);
        }
    }, [selectedPort, selectedPreset]);
    return {
        ports,
        selectedPort,
        setSelectedPort,
        selectedPreset,
        setSelectedPreset,
        connected,
        loading,
        error,
        connect,
    };
}
