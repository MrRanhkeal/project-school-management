import React, { useEffect, useState } from 'react';
import { Paper, Stack, Typography, Skeleton, Box } from '@mui/material';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import AirIcon from '@mui/icons-material/Air';
import { useTranslation } from 'react-i18next';
import { SCHOOL_LOCATION } from '../../utils/constants';

/** Current weather for the school's city, from the free open-meteo API. */
export default function Temperature() {
  const { t } = useTranslation();
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${SCHOOL_LOCATION.lat}` +
      `&longitude=${SCHOOL_LOCATION.lon}&current_weather=true`;
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setWeather(json.current_weather))
      .catch(() => setError(true));
    return () => controller.abort();
  }, []);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {t('dashboard.weather')} — {SCHOOL_LOCATION.name}
      </Typography>
      {error && (
        <Typography variant="body2" color="text.secondary">
          Weather is unavailable right now.
        </Typography>
      )}
      {!error && !weather && (
        <Box>
          <Skeleton width="60%" height={44} />
          <Skeleton width="40%" />
        </Box>
      )}
      {weather && (
        <Stack direction="row" spacing={3} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <ThermostatIcon color="error" fontSize="large" />
            <Typography variant="h4">{Math.round(weather.temperature)}°C</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <AirIcon color="info" />
            <Typography variant="body1">{weather.windspeed} km/h</Typography>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
