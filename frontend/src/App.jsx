import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, Toolbar, Snackbar, Alert } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { hideSnackbar } from './redux/actions';
import { DRAWER_WIDTH, ROLES } from './utils/constants';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/protected/ProtectedRoute';
import Home from './components/home/Home';

import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Profile from './pages/profile/Profile';
import Student from './pages/student/Student';
import Teacher from './pages/teacher/Teacher';
import Grade from './pages/grade/Grade';
import Course from './pages/course/Course';
import Attendance from './pages/attendance/Attendance';
import Classroom from './pages/classroom/Classroom';
import Payment from './pages/payment/Payment';

/** Authenticated shell: fixed header, responsive sidebar, footer. */
function AppLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
        }}
      >
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}

/** Global snackbar fed by the redux ui slice. */
function SnackbarHost() {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector((s) => s.ui.snackbar);
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={() => dispatch(hideSnackbar())}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => dispatch(hideSnackbar())}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/students"
            element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER]}>
                <Student />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.STAFF]}>
                <Teacher />
              </ProtectedRoute>
            }
          />
          <Route path="/classes" element={<Classroom />} />
          <Route path="/courses" element={<Course />} />
          <Route path="/grades" element={<Grade />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route
            path="/payments"
            element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.STAFF]}>
                <Payment />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SnackbarHost />
    </BrowserRouter>
  );
}
