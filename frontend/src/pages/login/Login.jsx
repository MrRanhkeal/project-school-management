import React from 'react';
import { Box } from '@mui/material';
import AuthForm from '../../features/authentication/AuthForm';

export default function Login() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #1565c0 0%, #0d2b5e 100%)',
      }}
    >
      <AuthForm mode="login" />
    </Box>
  );
}
