
import React, { useEffect, useState } from 'react';
import {
  Paper,
  Stack,
  Typography,
  Skeleton,
} from '@mui/material';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AirIcon from '@mui/icons-material/Air';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import { useTranslation } from 'react-i18next';
import useCurrentLocation from '../../hooks/useCurrentLocation';

const WEATHER_CODES = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  80: 'Rain Showers',
  81: 'Heavy Showers',
  82: 'Violent Showers',
  95: 'Thunderstorm',
};

export default function Temperature() {
  const { t } = useTranslation();
  const location = useCurrentLocation();

  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!location) return undefined;

    const controller = new AbortController();

    async function loadWeather() {
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lng}&current_weather=true`,
          { signal: controller.signal }
        );

        const json = await weatherRes.json();

        setWeather(json.current_weather);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
          setError(true);
        }
      }
    }

    loadWeather();

    return () => controller.abort();
  }, [location]);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {t('dashboard.weather')}
        {location ? ` — ${location.name}` : ''}
      </Typography>

      {error && (
        <Typography color="text.secondary">
          Weather is unavailable right now.
        </Typography>
      )}

      {!error && !weather && (
        <Stack spacing={2}>
          <Skeleton variant="rounded" width="100%" height={36} />
          <Skeleton variant="rounded" width="60%" height={48} />
          <Skeleton variant="rounded" width="40%" height={28} />
        </Stack>
      )}

      {weather && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <ThermostatIcon color="error" fontSize="large" />
              <Typography variant="h3" fontWeight={700}>
                {Math.round(weather.temperature)}°C
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <AirIcon color="info" />
              <Typography>{weather.windspeed} km/h</Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <WbSunnyIcon color="warning" />
            <Typography color="text.secondary">
              {WEATHER_CODES[weather.weathercode] ?? 'Unknown'}
            </Typography>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            Wind Direction: {weather.winddirection}°
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Updated: {weather.time}
          </Typography>
        </Stack>
      )}
    </Paper>
  );
}
