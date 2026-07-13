import React from 'react';
import { Box, Avatar, Typography, Stack } from '@mui/material';
import { getInitials } from '../../utils/helpers';

/**
 * Chat-style message bubble.
 * message: { from, text, time, mine? }
 */
export default function MessageItem({ message = {} }) {
  const { from = 'Unknown', text = '', time = '', mine = false } = message;

  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent={mine ? 'flex-end' : 'flex-start'}
      sx={{ mb: 1.5 }}
    >
      {!mine && (
        <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'primary.main' }}>
          {getInitials(from)}
        </Avatar>
      )}
      <Box
        sx={{
          maxWidth: '75%',
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: mine ? 'primary.main' : 'action.hover',
          color: mine ? 'primary.contrastText' : 'text.primary',
        }}
      >
        {!mine && (
          <Typography variant="caption" fontWeight={600} display="block">
            {from}
          </Typography>
        )}
        <Typography variant="body2">{text}</Typography>
        <Typography
          variant="caption"
          sx={{ opacity: 0.7, display: 'block', textAlign: 'right', mt: 0.25 }}
        >
          {time}
        </Typography>
      </Box>
    </Stack>
  );
}
