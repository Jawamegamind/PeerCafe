'use client';
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import { Alert } from '@mui/material';
import Snackbar, { SnackbarCloseReason } from '@mui/material/Snackbar';
// import LoadingModal from '../../_components/LoadingModal';
// import { useRouter } from 'next/navigation';
import { login } from './actions';

export default function SignIn() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');

  const handleClick = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning'
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpen(true);
  };

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: SnackbarCloseReason
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  // const router = useRouter();
  // const [user, setUser] = React.useState<User | null>(null);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Check for empty fields
    if (!email || !password) {
      handleClick('All fields are required', 'error');
      return;
    }

    // Using the login action
    try {
      setLoading(true);
      await login(formData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error:', error);
      handleClick('Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      component="main"
      maxWidth="xs"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        height: '100vh',
      }}
    >
      <CssBaseline />
      <Paper
        elevation={6}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Login
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            Sign In
          </Button>
          {/* <LoadingModal open={loading} title="Logging in"/> */}
          <Box display="flex" justifyContent="center">
            <Link href="/forgot-password" variant="body2">
              Forgot password?
            </Link>
          </Box>
        </Box>
      </Paper>
      <Box mt={2} textAlign="center">
        <Link href="/register" variant="body2">
          {"Don't have an account? Sign Up"}
        </Link>
      </Box>
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      {/* <Copyright sx={{ mt: 4, mb: 2 }} /> */}
    </Container>
  );
}
