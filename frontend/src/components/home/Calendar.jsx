import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Paper, Box, Typography, IconButton, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'react-i18next';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Lightweight month calendar (no extra dependencies). */
export default function Calendar() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const today = dayjs();

  const cells = useMemo(() => {
    const start = month.startOf('month');
    const daysInMonth = month.daysInMonth();
    const leading = start.day(); // 0 (Sunday) .. 6
    const out = [];
    for (let i = 0; i < leading; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(month.date(d));
    return out;
  }, [month]);

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {t('dashboard.calendar')}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <IconButton size="small" onClick={() => setMonth((m) => m.subtract(1, 'month'))}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ minWidth: 110, textAlign: 'center' }}>
            {month.format('MMMM YYYY')}
          </Typography>
          <IconButton size="small" onClick={() => setMonth((m) => m.add(1, 'month'))}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {WEEKDAYS.map((d) => (
          <Typography
            key={d}
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center', fontWeight: 600 }}
          >
            {d}
          </Typography>
        ))}
        {cells.map((date, i) => (
          <Box
            key={i}
            sx={{
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              fontSize: 13,
              ...(date &&
                date.isSame(today, 'day') && {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 700,
                }),
            }}
          >
            {date ? date.date() : ''}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
