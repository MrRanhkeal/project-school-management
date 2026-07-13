import React from 'react';
import { Grid, Typography, Paper, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useAuth from '../../hooks/useAuth';
import DashboardStats from '../../features/dashboard/DashboardStats';
import DashboardCharts from '../../features/dashboard/DashboardCharts';
import MessageItem from '../../features/messages/MessageItem';
import Calendar from './Calendar';
import Temperature from './temperature';
import Maps from './maps';

const SAMPLE_MESSAGES = [
  { from: 'Principal', text: 'Staff meeting moved to Friday 2pm.', time: '09:12' },
  { from: 'Sok Dara', text: 'Grade reports for 10A are ready for review.', time: '10:40' },
  { from: 'You', text: 'Thanks, I will check them today.', time: '10:45', mine: true },
];

/** Dashboard landing page. */
export default function Home() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('dashboard.welcome', { name: user?.fullName || '' })}
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <DashboardStats />
        </Grid>

        <Grid item xs={12}>
          <DashboardCharts />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Calendar />
        </Grid>

        <Grid item xs={12} sm={6} lg={4}>
          <Grid container spacing={2} direction="column">
            <Grid item>
              <Temperature />
            </Grid>
            <Grid item>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {t('dashboard.messages')}
                </Typography>
                {SAMPLE_MESSAGES.map((m, i) => (
                  <MessageItem key={i} message={m} />
                ))}
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Maps />
        </Grid>
      </Grid>
    </Box>
  );
}
