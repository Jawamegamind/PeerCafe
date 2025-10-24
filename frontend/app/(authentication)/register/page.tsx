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
import { register } from './actions';

// interface User {
//     name: string;
//     email: string;
//     password: string;
// }

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

  // const [user, setUser] = React.useState<User | null>(null);
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    console.log({ name, email, password });

    // Check for empty fields
    if (!name || !email || !password) {
      handleClick('All fields are required', 'error');
      return;
    }

    // Using the register action
    try {
      setLoading(true);
      const response = await register(formData);
      setLoading(false);
      // handleClick("Registration successful", "success");

      // Check the message returned in the response
      if (response == 'User already exists') {
        handleClick('User already exists', 'error');
      } else if (response == 'User registration failed') {
        handleClick('Registration failed', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      handleClick('Registration failed', 'error');
    }

    // // Sending api request to register user
    // fetch('http://localhost:8000/api/register', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({ name, email, password }),
    // })
    //     .then(response => response.json())
    //     .then(data => {
    //         console.log(data);
    //         if (data.message == "User already exists") {
    //             handleClick("User already exists", "error");
    //         }
    //         else if (data.message == "User created successfully") {
    //             // Displaying the snackbar alert
    //             handleClick("Registration successful", "success");
    //             // Delay redirect to let snackbar show
    //             setTimeout(() => {
    //                 router.push('/login');
    //             }, 1000); // 2-second delay
    //         }
    //         else if (data.message == "User creation failed") {
    //             handleClick("Registration failed", "error");
    //         }
    //     })
    //     .catch((error) => {
    //         console.error('Error:', error);
    //     });
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
          Register
        </Typography>
        <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Name"
            name="name"
            autoComplete="name"
          />
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
            Sign Up
          </Button>
          {/* <LoadingModal open={loading} title="Creating your account"/> */}
        </Box>
      </Paper>
      <Box mt={2} textAlign="center">
        <Link href="/login" variant="body2">
          {'Already have an account? Sign In'}
        </Link>
      </Box>
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ width: '100%' }}
      >
        <Alert
          onClose={handleClose}
          severity={snackbarSeverity}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
