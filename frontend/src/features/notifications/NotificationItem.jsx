import React from 'react';
import { ListItem, ListItemAvatar, Avatar, ListItemText, Typography } from '@mui/material';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import CampaignIcon from '@mui/icons-material/CampaignOutlined';
import { formatDateTime } from '../../utils/helpers';

/** One delivery record from GET /api/notifications/recent. */
export default function NotificationItem({ notification = {} }) {
  const { subject, text, type, createdAt, to } = notification;
  const isEmail = Boolean(to);

  return (
    <ListItem alignItems="flex-start">
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: isEmail ? 'primary.main' : 'secondary.main', width: 34, height: 34 }}>
          {isEmail ? <EmailIcon fontSize="small" /> : <CampaignIcon fontSize="small" />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={subject || type || 'Notification'}
        primaryTypographyProps={{ variant: 'body2', fontWeight: 600, noWrap: true }}
        secondary={
          <>
            {text && (
              <Typography component="span" variant="caption" display="block" noWrap>
                {text}
              </Typography>
            )}
            <Typography component="span" variant="caption" color="text.secondary">
              {formatDateTime(createdAt)}
            </Typography>
          </>
        }
      />
    </ListItem>
  );
}
