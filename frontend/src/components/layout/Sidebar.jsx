import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import GroupsIcon from '@mui/icons-material/GroupsOutlined';
import BadgeIcon from '@mui/icons-material/BadgeOutlined';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoomOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBookOutlined';
import HowToRegIcon from '@mui/icons-material/HowToRegOutlined';
import GradeIcon from '@mui/icons-material/GradeOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailableOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import PersonIcon from '@mui/icons-material/PersonOutline';
import { setSidebar } from '../../redux/actions';
import useAuth from '../../hooks/useAuth';
import { DRAWER_WIDTH, ROLES } from '../../utils/constants';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PolylineIcon from '@mui/icons-material/Polyline';

const NAV_ITEMS = [
  { key: 'dashboard', path: '/', icon: <DashboardIcon /> },
  {
    key: 'students',
    path: '/students',
    icon: <GroupsIcon />,
    roles: [ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  },
  { key: 'teachers', path: '/teachers', icon: <BadgeIcon />, roles: [ROLES.ADMIN, ROLES.STAFF] },
  { key: 'classes', path: '/classes', icon: <MeetingRoomIcon /> },
  { key: 'courses', path: '/courses', icon: <MenuBookIcon /> },
  {
    key: 'enrollments',
    path: '/enrollments',
    icon: <HowToRegIcon />,
    roles: [ROLES.ADMIN, ROLES.STAFF, ROLES.TEACHER],
  },
  { key: 'grades', path: '/grades', icon: <GradeIcon /> },
  { key: 'attendance', path: '/attendance', icon: <EventAvailableIcon /> },
  { key: 'payments', path: '/payments', icon: <PaymentsIcon />, roles: [ROLES.ADMIN, ROLES.STAFF] },
  { key: 'users', path: '/users', icon: <PeopleAltIcon />, roles: [ROLES.ADMIN, ROLES.STAFF] },
  { key: 'department', path: '/departments', icon: <PolylineIcon />, roles: [ROLES.ADMIN, ROLES.STAFF] },
  { key: 'profile', path: '/profile', icon: <PersonIcon /> },
];

function NavList({ onNavigate }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  return (
    <List sx={{ px: 1 }}>
      {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
        <ListItemButton
          key={item.key}
          component={NavLink}
          to={item.path}
          onClick={onNavigate}
          selected={location.pathname === item.path}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
              '&:hover': { bgcolor: 'primary.dark' },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
          <ListItemText primary={t(`nav.${item.key}`)} />
        </ListItemButton>
      ))}
    </List>
  );
}

export default function Sidebar() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.sidebarOpen);
  const close = () => dispatch(setSidebar(false));

  const content = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar />
      <NavList onNavigate={close} />
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      {/* <Typography variant="caption" color="text.secondary" sx={{ p: 2 }}>
        school-frontend
      </Typography> */}
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile / tablet: temporary drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={close}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {content}
      </Drawer>
      {/* Desktop: permanent drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
}
