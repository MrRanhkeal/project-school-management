import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { SCHOOL_LOCATION } from '../../utils/constants';

/** Embedded OpenStreetMap centred on the school location (no API key needed). */
export default function Maps() {
  const { t } = useTranslation();
  const { lat, lon } = SCHOOL_LOCATION;
  const delta = 0.02;
  const bbox = [lon - delta, lat - delta, lon + delta, lat + delta].join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        {t('dashboard.map')}
      </Typography>
      <Box
        component="iframe"
        title="school-map"
        src={src}
        sx={{
          width: '100%',
          height: { xs: 220, md: 260 },
          border: 0,
          borderRadius: 2,
        }}
        loading="lazy"
      />
    </Paper>
  );
}
