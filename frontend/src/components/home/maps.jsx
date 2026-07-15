import React, { useMemo } from 'react';
import {
  GoogleMap,
  Marker,
  Circle,
  useLoadScript,
} from '@react-google-maps/api';
import { Box, Chip } from '@mui/material';
import { SCHOOL_LOCATION, GEOFENCE_RADIUS } from '../../utils/constants';
import useCurrentLocation from '../../hooks/useCurrentLocation';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_SCHOOL = {
  lat: SCHOOL_LOCATION.lat,
  lng: SCHOOL_LOCATION.lng,
  radius: GEOFENCE_RADIUS,
};

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

// 📏 Calculate distance (Haversine)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export default function GeoFenceMap({ userLocation, school = DEFAULT_SCHOOL }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY,
  });

  // Fall back to the device's GPS position when no location prop is given.
  // The hook's school fallback is not a real user position, so ignore it.
  const deviceLocation = useCurrentLocation();
  const resolvedLocation =
    userLocation ??
    (deviceLocation && !deviceLocation.isFallback ? deviceLocation : null);

  const center = useMemo(() => ({
    lat: school.lat,
    lng: school.lng,
  }), [school]);

  const distance = resolvedLocation
    ? getDistance(
      resolvedLocation.lat,
      resolvedLocation.lng,
      school.lat,
      school.lng
    )
    : null;

  const isInside = distance !== null && distance <= school.radius;

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <Box sx={{ height: 400, position: 'relative' }}>
      {/* STATUS */}
      {/* {distance !== null && (
        <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
          <Chip
            label={
              isInside
                ? `Inside (${distance.toFixed(0)}m)`
                : `Outside (${distance.toFixed(0)}m)`
            }
            color={isInside ? 'success' : 'error'}
          />
        </Box>
      )} */}

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={16}
        options={{
          gestureHandling: 'greedy', // 🔥 scroll zoom without CTRL
          disableDefaultUI: false,
        }}
      >
        {/* 🏫 School Marker */}
        <Marker
          position={center}
          label="School"
        />

        {/* 🔵 Geofence Circle */}
        <Circle
          center={center}
          radius={school.radius}
          options={{
            fillColor: '#1976d2',
            fillOpacity: 0.2,
            strokeColor: '#1976d2',
            strokeOpacity: 0.8,
            strokeWeight: 2,
          }}
        />

        {/* 📍 User Marker */}
        {resolvedLocation && (
          <Marker
            position={{
              lat: resolvedLocation.lat,
              lng: resolvedLocation.lng,
            }}
            label="You"
          />
        )}
      </GoogleMap>
    </Box>
  );
}
