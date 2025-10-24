'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
import { useRouter } from 'next/navigation';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { logout } from '@/app/(authentication)/login/actions';
import { useCart } from '../_contexts/CartContext';
import CartDropdown from './CartDropdown';
import { createClient } from '@/utils/supabase/client';

const pages = ['Home', 'Logout', 'Profile'];

interface UserData {
  user_id: string;
  is_admin: boolean;
  // Add other user fields as needed
  [key: string]: any;
}

function ResponsiveAppBar() {
  const router = useRouter();
  const { totalItems } = useCart();

  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(
    null
  );
  const [cartAnchorEl, setCartAnchorEl] = React.useState<null | HTMLElement>(
    null
  );
  const [user, setUser] = React.useState<UserData | null>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCartClick = (event: React.MouseEvent<HTMLElement>) => {
    setCartAnchorEl(event.currentTarget);
  };

  const handleCartClose = () => {
    setCartAnchorEl(null);
  };

  //   async function handleSignOut() {
  //     try {
  //         await signOut(authentication);
  //         // Setting user to null and removing from local storage
  //         if (setUser) {
  //           setUser(null);
  //           console.log("User signed out");
  //           router.push('/login');
  //           localStorage.removeItem("user");
  //         }
  //     } catch (error) {
  //         console.log(error);
  //     }
  // }

  // Client-side function to fetch current user
  const fetchCurrentUser = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('No authenticated user found.');
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user from Users table:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  };

  const handleCloseNavMenu = async (page?: string) => {
    setAnchorElNav(null);

    if (page === 'Logout') {
      logout();
      router.push('/login');
    } else if (page === 'Profile') {
      try {
        const userData = await fetchCurrentUser();
        if (userData) {
          setUser(userData);
          // Redirect based on is_admin field
          if (userData.is_admin === true) {
            router.push('/admin/profile'); // Admin dashboard route
          } else {
            router.push('/user/profile'); // Regular user profile route
          }
        } else {
          console.error('No user data found');
          // Optionally redirect to login or show error
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Handle error - maybe redirect to login
        router.push('/login');
      }
    } else if (page === 'Home') {
      router.push('/homepage');
    }
  };

  return (
    <AppBar position="static" sx={{ padding: 0 }} elevation={0}>
      <Container maxWidth={false}>
        <Toolbar disableGutters sx={{ padding: 0 }}>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="#"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'black',
              textDecoration: 'none',
            }}
          >
            PeerCafe
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              sx={{ color: 'black' }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={() => handleCloseNavMenu()}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {/* Cart MenuItem for mobile */}
              <MenuItem onClick={handleCartClick}>
                <IconButton color="inherit">
                  <Badge badgeContent={totalItems} color="primary">
                    <ShoppingCartIcon />
                  </Badge>
                </IconButton>
                <Typography textAlign="center" sx={{ color: 'black', ml: 1 }}>
                  Cart
                </Typography>
              </MenuItem>

              {pages.map(page => (
                <MenuItem key={page} onClick={() => handleCloseNavMenu(page)}>
                  {page === 'Profile' ? (
                    <IconButton color="inherit">
                      <AccountCircleIcon />
                    </IconButton>
                  ) : (
                    <Typography textAlign="center" sx={{ color: 'black' }}>
                      {page}
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Menu>
          </Box>
          <Typography
            variant="h5"
            noWrap
            component="a"
            href="#"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'black',
              textDecoration: 'none',
            }}
          >
            AI LMS
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }} />
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              ml: 'auto',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {/* Cart Icon */}
            <IconButton
              onClick={handleCartClick}
              sx={{ color: 'black' }}
              aria-label="Shopping Cart"
            >
              <Badge badgeContent={totalItems} color="primary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>

            {pages.map(page =>
              page === 'Profile' ? (
                <IconButton
                  key={page}
                  onClick={() => handleCloseNavMenu(page)}
                  sx={{ color: 'black' }}
                  aria-label="Profile"
                >
                  <AccountCircleIcon />
                </IconButton>
              ) : (
                <Button
                  key={page}
                  onClick={() => handleCloseNavMenu(page)}
                  sx={{ my: 2, color: 'black', display: 'block' }}
                >
                  {page}
                </Button>
              )
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Cart Dropdown */}
      <CartDropdown
        anchorEl={cartAnchorEl}
        open={Boolean(cartAnchorEl)}
        onClose={handleCartClose}
      />
    </AppBar>
  );
}

export default ResponsiveAppBar;
