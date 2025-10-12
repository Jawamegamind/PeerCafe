import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Declaring the routes that need to be protected
const protectedRoutes = [
  '/user/dashboard', 
  '/admin/dashboard', 
  '/admin/create_course',
  'admin/view_courses',
]

export async function updateSession(request: NextRequest) {
  // Debug: Log which route the middleware is being called for
  console.log('🔍 Middleware called for route:', request.nextUrl.pathname)
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

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
const session = await supabase.auth.getUser()

// Getting the pathname from the request
const pathname = request.nextUrl.pathname 

// Checking if the path name is in the protected routes
const isProtectedRoute = protectedRoutes.includes(pathname)

// console.log("The session is: ", session)

// If the route is protected and the user is not authenticated, redirect to the login page
if (isProtectedRoute && session.error) {
    return NextResponse.redirect(new URL('/login', request.url))
}

return supabaseResponse

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

  return supabaseResponse
}