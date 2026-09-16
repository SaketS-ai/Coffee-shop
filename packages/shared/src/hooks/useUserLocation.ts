import { useEffect, useState } from 'react';

export type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable';

export interface UserLocation {
  status: LocationStatus;
  coords: { lat: number; lng: number } | null;
}

// Coordinates live only in this component-tree's memory for the current page
// load - never persisted (not even to localStorage), per the requirement
// that browsing location isn't logged or stored anywhere.
export function useUserLocation(): UserLocation {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('granted');
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { status, coords };
}
