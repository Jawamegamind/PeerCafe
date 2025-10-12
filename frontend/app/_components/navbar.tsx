"use client"

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
import { useRouter } from 'next/navigation';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import {logout} from '@/app/(authentication)/login/actions';

const pages = ['Home', 'Logout', 'Profile'];


function ResponsiveAppBar() {
  const router = useRouter();

  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
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

  const handleCloseNavMenu = (page?: string) => {
    setAnchorElNav(null);
    if (page === 'Logout') {
        logout();
        router.push('/login');
    }
    else if (page === 'Profile') {
        router.push('/profile');
    }
    else if (page === 'Home') {
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
              {pages.map((page) => (
                <MenuItem key={page} onClick={() => handleCloseNavMenu(page)}>
                  {page === 'Profile' ? (
                    <IconButton color="inherit">
                      <AccountCircleIcon />
                    </IconButton>
                  ) : (
                    <Typography textAlign="center" sx={{ color: 'black' }}>{page}</Typography>
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
          <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 'auto' }}>
            {pages.map((page) => (
              page === 'Profile' ? (
                <IconButton
                  key={page}
                  onClick={() => handleCloseNavMenu(page)}
                  sx={{ color: 'black' }}
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
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default ResponsiveAppBar;