import React from 'react';
import { Box } from '@mui/material';
import AuthForm from '../../features/authentication/AuthForm';

export default function Register() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: 'linear-gradient(135deg, #00897b 0%, #093f38 100%)',
      }}
    >
      <AuthForm mode="register" />
    </Box>
  );
}
