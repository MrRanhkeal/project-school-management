import React from 'react';
import {
  Box,
  Paper,
  Avatar,
  Typography,
  Chip,
  Stack,
  Divider,
  Grid,
  Skeleton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useAuth from '../../hooks/useAuth';
import useFetch from '../../hooks/useFetch';
import { ENDPOINTS } from '../../services/endpoints';
import { getInitials, capitalize } from '../../utils/helpers';

const ROLE_COLORS = { admin: 'error', staff: 'warning', teacher: 'info', student: 'success' };

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, loading } = useFetch(ENDPOINTS.auth.me);
  const me = data?.user || data || user || {};

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {t('nav.profile')}
      </Typography>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 4 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
        >
          <Avatar
            sx={{
              width: 96,
              height: 96,
              fontSize: 32,
              bgcolor: 'primary.main',
            }}
          >
            {getInitials(me.fullName || 'U')}
          </Avatar>
          <Box sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' }, width: '100%' }}>
            <Typography variant="h6">
              {loading ? <Skeleton width={180} /> : me.fullName}
            </Typography>
            <Typography color="text.secondary" gutterBottom>
              {loading ? <Skeleton width={220} /> : me.email}
            </Typography>
            {!loading && (
              <Chip
                size="small"
                label={capitalize(me.role || '')}
                color={ROLE_COLORS[me.role] || 'default'}
              />
            )}

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  User ID
                </Typography>
                <Typography>{loading ? <Skeleton /> : me.id || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Typography>{loading ? <Skeleton /> : capitalize(me.status || 'active')}</Typography>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
