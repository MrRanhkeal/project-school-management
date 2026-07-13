import React, { useEffect, useState } from 'react';
import { Grid, Paper, Stack, Typography, Avatar, Skeleton } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import BadgeIcon from '@mui/icons-material/Badge';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useTranslation } from 'react-i18next';
import api, { unwrapMeta } from '../../services/api';
import { ENDPOINTS } from '../../services/endpoints';

const CARDS = [
  { key: 'students', endpoint: ENDPOINTS.students.list, icon: <GroupsIcon />, color: '#1565c0' },
  { key: 'teachers', endpoint: ENDPOINTS.teachers.list, icon: <BadgeIcon />, color: '#00897b' },
  { key: 'classes', endpoint: ENDPOINTS.classes.list, icon: <MeetingRoomIcon />, color: '#ef6c00' },
  { key: 'courses', endpoint: ENDPOINTS.courses.list, icon: <MenuBookIcon />, color: '#6a1b9a' },
];

/** Headline counts pulled from each service's list meta.total. */
export default function DashboardStats() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(
      CARDS.map((c) => api.get(c.endpoint, { params: { page: 1, limit: 1 } }))
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((r, i) => {
        next[CARDS[i].key] =
          r.status === 'fulfilled' ? (unwrapMeta(r.value)?.total ?? '—') : '—';
      });
      setCounts(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Grid container spacing={2}>
      {CARDS.map((card) => (
        <Grid item xs={6} md={3} key={card.key}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: card.color, width: 44, height: 44 }}>{card.icon}</Avatar>
              <Stack sx={{ minWidth: 0 }}>
                <Typography variant="h5">
                  {loading ? <Skeleton width={48} /> : counts[card.key]}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {t(`dashboard.${card.key}`)}
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}
