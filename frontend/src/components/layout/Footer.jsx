import React from 'react';
import { Box, Typography, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: 'auto',
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary" style={{ color: 'rgba(6, 241, 22, 0.5)' }}>
        © {new Date().getFullYear()} {t('app.title')}
      </Typography>
      {/* <Typography variant="caption" color="text.secondary">
        Built with React + Material UI ·{' '}
        <Link href="https://mui.com" target="_blank" rel="noreferrer" underline="hover">
          MUI
        </Link>
      </Typography> */}
      <Typography variant="caption" color="text.secondary">
        school-project ·{' '}
        <Link href="https://github.com/MrRanhkeal" target="_blank" rel="noreferrer" underline="hover">
          GitHub
        </Link>
      </Typography>
    </Box>
  );
}
