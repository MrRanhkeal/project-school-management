import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import useAuth from '../../hooks/useAuth';

/**
 * Guards a route behind authentication and (optionally) a role list.
 *
 *   <ProtectedRoute roles={['admin', 'staff']}><Student /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <Typography variant="h4" gutterBottom>
          403
        </Typography>
        <Typography color="text.secondary">
          You don&apos;t have permission to view this page.
        </Typography>
      </Box>
    );
  }

  return children;
}
