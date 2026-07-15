import { useEffect, useState } from 'react';
import { SCHOOL_LOCATION } from '../utils/constants';

/**
 * Resolves the user's real GPS position via the browser Geolocation API.
 * Falls back to SCHOOL_LOCATION when permission is denied or unavailable.
 * Returns null while resolving, then { lat, lng, name, isFallback }.
 */
export default function useCurrentLocation() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const useFallback = () => {
      if (!cancelled) setLocation({ ...SCHOOL_LOCATION, isFallback: true });
    };

    if (!('geolocation' in navigator)) {
      useFallback();
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;
        let name = SCHOOL_LOCATION.name;

        // Free reverse geocoding, no API key required.
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          );
          const json = await res.json();
          name = json.city || json.locality || json.principalSubdivision || name;
        } catch {
          // Keep the fallback name; coordinates are still real.
        }

        if (!cancelled) setLocation({ lat, lng, name, isFallback: false });
      },
      useFallback,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
