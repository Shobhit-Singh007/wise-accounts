import { createTheme, type Theme } from '@mui/material/styles';

const sharedComponents = {
  MuiCard: {
    styleOverrides: {
      root: {
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        fontWeight: 500,
      },
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a237e',
      light: '#534bae',
      dark: '#000051',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff8f00',
      light: '#ffc046',
      dark: '#c56000',
      contrastText: '#000000',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: sharedComponents,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#534bae',
      light: '#757de8',
      dark: '#000051',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ffc046',
      light: '#ffe082',
      dark: '#ff8f00',
      contrastText: '#000000',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#2e7d32',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    ...sharedComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        },
      },
    },
  },
});

export type Mode = 'light' | 'dark';

export function getTheme(mode: Mode): Theme {
  return mode === 'dark' ? darkTheme : lightTheme;
}
