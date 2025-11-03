/* eslint-disable */
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Route-based access control configuration
const routeConfig = {
  // Public routes (no authentication needed)
  public: ['/', '/login', '/register'],

  // User routes (requires authentication, regular user access)
  user: [
    '/user/dashboard',
    '/user/profile',
    '/user/checkout',
    '/user/orders',
    // include dynamic order route prefix
    '/user/orders/',
    '/user/restaurants',
    // include dynamic restaurant route prefix
    '/user/restaurants/',
  ],

  // Admin routes (requires authentication + admin role)
  admin: [
    '/admin/dashboard',
    '/admin/orders',
    // include orders prefix (covers /admin/orders)
    '/admin/profile',
    '/admin/restaurants',
    // include dynamic restaurant id and add page
    '/admin/restaurants/',
    '/admin/restaurants/add',
  ],
};

// Helper function to check user's role from their profile
async function getUserRole(
  supabase: any,
  userId: string
): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return profile.is_admin ? 'admin' : 'user';
  } catch (error) {
    console.error('Error checking user role:', error);
    return null;
  }
}

// Helper function to determine what type of route this is
function getRouteType(
  pathname: string
): 'public' | 'user' | 'admin' | 'unknown' {
  // Check admin routes first (more specific)
  if (routeConfig.admin.some(route => pathname.startsWith(route))) {
    return 'admin';
  }

  // Check user routes
  if (routeConfig.user.some(route => pathname.startsWith(route))) {
    return 'user';
  }

  // Check public routes
  if (
    routeConfig.public.some(
      route => pathname === route || pathname.startsWith(route)
    )
  ) {
    return 'public';
  }

  return 'unknown';
}

export async function updateSession(request: NextRequest) {
  // Debug: Log which route the middleware is being called for
  // console.log('🔍 Middleware called for route:', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  //   const {
  //     data: { user },
  //   } = await supabase.auth.getUser()

  //   if (
  //     !user &&
  //     !request.nextUrl.pathname.startsWith('/login') &&
  //     !request.nextUrl.pathname.startsWith('/auth') &&
  //     !request.nextUrl.pathname.startsWith('/error')
  //   ) {
  //     // no user, potentially respond by redirecting the user to the login page
  //     const url = request.nextUrl.clone()
  //     url.pathname = '/login'
  //     return NextResponse.redirect(url)
  //   }

  // Getting the session of the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  console.log('Middleware - Authenticated user:', user);

  // Getting the pathname from the request
  const pathname = request.nextUrl.pathname;

  // Determine what type of route this is
  const routeType = getRouteType(pathname);

  // console.log('🔍 Route protection check:', { pathname, routeType, hasUser: !!user });

  // Handle route access based on type and user authentication
  switch (routeType) {
    case 'public':
      // Public routes - anyone can access
      break;

    case 'user':
      // Protected routes - require authentication
      if (authError || !user) {
        console.log('🚫 No authenticated user, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // For user routes, check if user is a user and not an admin
      const userRole = await getUserRole(supabase, user.id);

      if (userRole !== 'user') {
        console.log('🚫 Admin user attempted to access user route');
        // Redirect to admin dashboard with info message
        const redirectUrl = new URL('/admin/dashboard', request.url);
        redirectUrl.searchParams.set('info', 'admin_redirect');
        return NextResponse.redirect(redirectUrl);
      }
      break;
    // ;
    case 'admin':
      // Protected routes - require authentication
      if (authError || !user) {
        console.log('🚫 No authenticated user, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // For admin routes, check if user has admin privileges
      if (routeType === 'admin') {
        const userRole = await getUserRole(supabase, user.id);

        if (userRole !== 'admin') {
          console.log('🚫 Non-admin user attempted to access admin route');
          // Redirect to user dashboard with error message
          const redirectUrl = new URL('/user/dashboard', request.url);
          redirectUrl.searchParams.set('error', 'insufficient_permissions');
          return NextResponse.redirect(redirectUrl);
        }
      }
      break;

    case 'unknown':
      // For unknown routes, let Next.js handle it (will likely 404)
      break;
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
