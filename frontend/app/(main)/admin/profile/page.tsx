'use client';

import * as React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import Navbar from '../../../_components/navbar';

export default function AdminProfilePage() {
  return (
    <Box>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Admin Profile
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This is a placeholder for the admin profile page. Admin profile
            management features will be implemented here.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
