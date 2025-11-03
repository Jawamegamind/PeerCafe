import Link from 'next/link';
import {
  Button,
  Container,
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import { Restaurant, Person, AdminPanelSettings } from '@mui/icons-material';

export default function Home() {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box textAlign="center" mb={8}>
        <Typography
          variant="h2"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 'bold', color: 'primary.main' }}
        >
          Welcome to PeerCafe
        </Typography>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          color="text.secondary"
        >
          Your Ultimate Restaurant Discovery Platform
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
          Discover amazing restaurants, read reviews, and connect with fellow
          food enthusiasts. Whether you're looking for your next dining
          experience or want to share your culinary adventures, PeerCafe is your
          go-to platform.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          mb: 6,
          justifyContent: 'center',
        }}
      >
        <Card sx={{ minWidth: 280, maxWidth: 320, textAlign: 'center', p: 2 }}>
          <CardContent>
            <Restaurant sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Discover Restaurants
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Explore a wide variety of restaurants in your area and beyond.
              Find your perfect dining experience.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 280, maxWidth: 320, textAlign: 'center', p: 2 }}>
          <CardContent>
            <Person sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              User Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your profile, save favorite restaurants, and track your
              dining history in your personalized dashboard.
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ minWidth: 280, maxWidth: 320, textAlign: 'center', p: 2 }}>
          <CardContent>
            <AdminPanelSettings
              sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
            />
            <Typography variant="h6" gutterBottom>
              Admin Portal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Restaurant owners and administrators can manage listings, view
              analytics, and oversee platform operations.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box textAlign="center">
        <Box sx={{ '& > *': { m: 1 } }}>
          <Button
            component={Link}
            href="/register"
            variant="contained"
            size="large"
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started
          </Button>
          <Button
            component={Link}
            href="/login"
            variant="outlined"
            size="large"
            sx={{ px: 4, py: 1.5 }}
          >
            Sign In
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
