import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';

/** MUI Button with a built-in loading state. */
export default function Button({ loading = false, disabled, children, startIcon, ...props }) {
  return (
    <MuiButton
      variant="contained"
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
      {...props}
      maskClosable={false}
      keyboard={false} 
    >
      {children}
    </MuiButton>
  );
}
