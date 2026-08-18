import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Paper, Typography, Alert, Link, Stack, Avatar, SpeedDialIcon } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import useAuth from '../../hooks/useAuth';
import useForm from '../../hooks/useForm';
import { required, email, minLength, compose } from '../../utils/validators';
import { getApiError } from '../../utils/helpers';
import { ROLES } from '../../utils/constants';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { InputAdornment, IconButton } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';


/** Shared login / register form. mode: 'login' | 'register' */
export default function AuthForm({ mode = 'login' }) {
  const isRegister = mode === 'register';
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const { values, errors, handleChange, validate } = useForm(
    {
      email: '',
      password: '',
      fullName: '',
      confirmPassword: '',
      // role: ROLES.STUDENT
    },
    {
      email: compose(required(), email()),
      password: compose(required(), ...(isRegister ? [minLength(8)] : [])),
      ...(isRegister ? {
        fullName: compose(required(), minLength(2)),

      } : {}),
    }
  );

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e, res) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(values);
        navigate('/login', { replace: true });
      } else {
        await login(values);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
        res.sent(2001).json({
          message: 'Account Registerd'
        })
      }
      // const from = location.state?.from?.pathname || '/';
      // navigate(from, { replace: true });
    } catch (err) {
      setServerError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper
      elevation={6}
      sx={{
        p: { xs: 3, sm: 4 },
        width: '100%',
        maxWidth: 420,
        borderRadius: 3,
      }}
    >
      <Stack alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          <SchoolIcon />
        </Avatar>
        <Typography variant="h5">{isRegister ? t('auth.register') : t('auth.login')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {isRegister ? t('auth.joinUs') : t('auth.welcomeBack')}
        </Typography>
      </Stack>

      {serverError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {serverError}
        </Alert>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {isRegister && (
          <Input
            name="fullName"
            label={t('auth.fullName')}
            value={values.fullName}
            onChange={handleChange}
            error={Boolean(errors.fullName)}
            helperText={errors.fullName}
            autoComplete="name"
          />
        )}
        <Input
          name="email"
          type="email"
          label={t('auth.email')}
          value={values.email}
          onChange={handleChange}
          error={Boolean(errors.email)}
          helperText={errors.email}
          autoComplete="email"
        />
        <Input
          name="password"
          // type="password"
          type={showPassword ? 'text' : "password"}
          label={t('auth.password')}
          value={values.password}
          onChange={handleChange}
          error={Boolean(errors.password)}
          helperText={errors.password}
          autoComplete={isRegister ? 'new-password' : 'current-password'}

          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleTogglePassword} edge="end">
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button type="submit" fullWidth size="large" loading={submitting} sx={{ mt: 2 }}>
          {isRegister ? t('auth.register') : t('auth.login')}
        </Button>
      </form>

      <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
        <Link component={RouterLink} to={isRegister ? '/login' : '/register'} underline="hover">
          {isRegister ? t('auth.haveAccount') : t('auth.noAccount')}
        </Link>
      </Typography>
    </Paper>
  );
}
