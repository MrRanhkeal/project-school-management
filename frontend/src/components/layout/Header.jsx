import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Tooltip,
  ListItemIcon,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/NotificationsNone';
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeIcon from '@mui/icons-material/LightModeOutlined';
import TranslateIcon from '@mui/icons-material/Translate';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import SchoolIcon from '@mui/icons-material/School';
import { toggleSidebar, fetchNotifications } from '../../redux/actions';
import { useThemeMode } from '../../context/ThemeContext';
import useAuth from '../../hooks/useAuth';
import { getInitials } from '../../utils/helpers';
import { STORAGE_KEYS, DRAWER_WIDTH } from '../../utils/constants';
import NotificationItem from '../../features/notifications/NotificationItem'; 
import KH from 'country-flag-icons/react/3x2/KH';
import UK from 'country-flag-icons/react/3x2/GB'; 
export default function Header() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const notifications = useSelector((s) => s.notifications.items);

  const [profileAnchor, setProfileAnchor] = useState(null);
  const [langAnchor, setLangAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem(STORAGE_KEYS.LANG, lng);
    setLangAnchor(null);
  };

  const openNotifications = (e) => {
    setNotifAnchor(e.currentTarget);
    dispatch(fetchNotifications(10));
  };

  const handleLogout = async () => {
    setProfileAnchor(null);
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        width: '100%',
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          color="inherit"
          edge="start"
          onClick={() => dispatch(toggleSidebar())}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        <SchoolIcon sx={{ display: { xs: 'none', sm: 'block' } }} />
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
          {t('app.title')}
        </Typography>

        {/* Language */}
        <Tooltip title="Language">
          <IconButton color="inherit" onClick={(e) => setLangAnchor(e.currentTarget)}>
            {/* <TranslateIcon /> */}
            <LanguageIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}>
          <MenuItem selected={i18n.language === 'en'} onClick={() => changeLang('en')}>
            <UK title="United Kingdom" style={{
              width: '16px',
              filter: 'saturate(2) brightness(1.2) contrast(1.1)',
              marginRight: '5px'
            }} />{t('English')}
          </MenuItem>
          <MenuItem selected={i18n.language === 'km'} onClick={() => changeLang('km')}>
            <KH title="Cambodia" style={{
              width: '16px',
              filter: 'saturate(2) brightness(1.2) contrast(1.1)',
              marginRight: '5px'
            }} /> {t('Khmer')}
          </MenuItem>
        </Menu>

        {/* Dark mode */}
        <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton color="inherit" onClick={toggleMode}>
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title={t('dashboard.notifications')}>
          <IconButton color="inherit" onClick={openNotifications}>
            <Badge badgeContent={notifications.length} color="error" max={9}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          slotProps={{ paper: { sx: { width: 340, maxHeight: 420 } } }}
        >
          <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
            {t('dashboard.notifications')}
          </Typography>
          <Divider />
          <List dense disablePadding>
            {notifications.length === 0 && (
              <ListItem>
                <ListItemText
                  secondary={t('dashboard.noNotifications')}
                  secondaryTypographyProps={{ textAlign: 'center' }}
                />
              </ListItem>
            )}
            {notifications.map((n, i) => (
              <NotificationItem key={n.id || i} notification={n} />
            ))}
          </List>
        </Menu>

        {/* Profile */}
        <Tooltip title={user?.fullName || ''}>
          <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.main', fontSize: 14 }}>
              {getInitials(user?.fullName || 'U')}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={profileAnchor}
          open={Boolean(profileAnchor)}
          onClose={() => setProfileAnchor(null)}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2">{user?.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => {
              setProfileAnchor(null);
              navigate('/profile');
            }}
          >
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            {t('nav.profile')}
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            {t('nav.logout')}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
