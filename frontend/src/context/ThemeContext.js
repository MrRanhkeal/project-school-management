import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { STORAGE_KEYS } from '../utils/constants';

export const ThemeContext = createContext({ mode: 'light', toggleMode: () => {} });

export function AppThemeProvider({ children }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState(
    () => localStorage.getItem(STORAGE_KEYS.THEME) || (prefersDark ? 'dark' : 'light')
  );

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#1565c0' },
          secondary: { main: '#00897b' },
          background:
            mode === 'light'
              ? { default: '#f4f6fb', paper: '#ffffff' }
              : { default: '#0f172a', paper: '#1e293b' },
        },
        shape: { borderRadius: 10 },
        typography: {
          fontFamily: "'Roboto', 'Noto Sans Khmer', 'Helvetica', 'Arial', sans-serif",
          h5: { fontWeight: 600 },
          h6: { fontWeight: 600 },
        },
        components: {
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } },
          },
          MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
        },
      }),
    [mode]
  );

  const value = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  // createElement (not JSX) so this file can keep its .js extension.
  return React.createElement(
    ThemeContext.Provider,
    { value },
    React.createElement(
      MuiThemeProvider,
      { theme },
      React.createElement(CssBaseline),
      children
    )
  );
}

export const useThemeMode = () => useContext(ThemeContext);

export default ThemeContext;
