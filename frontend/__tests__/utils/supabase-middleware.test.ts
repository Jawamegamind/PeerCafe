/**
 * Tests for Supabase middleware utilities
 */

import { NextRequest } from 'next/server';
import { updateSession } from '../../utils/supabase/middleware';

// Mock @supabase/ssr
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

// Mock Next.js server utilities
jest.mock('next/server', () => ({
  NextResponse: {
    next: jest.fn(),
    redirect: jest.fn(),
  },
}));

describe('Supabase Middleware Utils', () => {
  const { createServerClient } = require('@supabase/ssr');
  const { NextResponse } = require('next/server');

  // Mock Supabase client
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  };

  // Mock NextResponse instances
  const mockNextResponse = {
    cookies: {
      set: jest.fn(),
      getAll: jest.fn(() => []),
      setAll: jest.fn(),
    },
  };

  const mockRedirectResponse = {
    url: 'https://example.com/login',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-123';

    // Setup default mocks
    createServerClient.mockReturnValue(mockSupabaseClient);
    NextResponse.next.mockReturnValue(mockNextResponse);
    NextResponse.redirect.mockReturnValue(mockRedirectResponse);

    // Setup console.log mock to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    jest.restoreAllMocks();
  });

  const createMockRequest = (
    pathname: string,
    cookies: Array<{ name: string; value: string }> = []
  ) => {
    const mockCookies = {
      getAll: jest.fn(() => cookies),
      set: jest.fn(),
    };

    return {
      nextUrl: {
        pathname,
        clone: jest.fn(() => ({
          pathname: '/login',
        })),
      },
      cookies: mockCookies,
      url: `https://example.com${pathname}`,
    } as unknown as NextRequest;
  };

  describe('updateSession', () => {
    describe('public routes', () => {
      it('allows access to public routes without authentication', async () => {
        const request = createMockRequest('/');
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });

      it('allows access to login page', async () => {
        const request = createMockRequest('/login');
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });

      it('allows access to register page', async () => {
        const request = createMockRequest('/register');
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    });

    describe('user routes', () => {
      it('redirects to login when user is not authenticated', async () => {
        const request = createMockRequest('/user/dashboard');
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        });

        const result = await updateSession(request);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/login', request.url)
        );
        expect(result).toBe(mockRedirectResponse);
      });

      it('allows access when user is authenticated as regular user', async () => {
        const request = createMockRequest('/user/dashboard');
        const mockUser = { id: 'user123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock user profile lookup
        const mockUserProfile = { is_admin: false };
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null,
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });

      it('redirects admin users to admin dashboard when accessing user routes', async () => {
        const request = createMockRequest('/user/dashboard');
        const mockUser = { id: 'admin123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock admin user profile lookup
        const mockAdminProfile = { is_admin: true };
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null,
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: expect.stringContaining('/admin/dashboard'),
          })
        );
        expect(result).toBe(mockRedirectResponse);
      });
    });

    describe('admin routes', () => {
      it('redirects to login when user is not authenticated', async () => {
        const request = createMockRequest('/admin/dashboard');
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error('Not authenticated'),
        });

        const result = await updateSession(request);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
          new URL('/login', request.url)
        );
        expect(result).toBe(mockRedirectResponse);
      });

      it('allows access when user is authenticated as admin', async () => {
        const request = createMockRequest('/admin/dashboard');
        const mockUser = { id: 'admin123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock admin user profile lookup
        const mockAdminProfile = { is_admin: true };
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null,
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });

      it('redirects regular users to user dashboard when accessing admin routes', async () => {
        const request = createMockRequest('/admin/dashboard');
        const mockUser = { id: 'user123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock regular user profile lookup
        const mockUserProfile = { is_admin: false };
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null,
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        expect(NextResponse.redirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: expect.stringContaining('/user/dashboard'),
          })
        );
        expect(result).toBe(mockRedirectResponse);
      });
    });

    describe('dynamic routes', () => {
      it('handles dynamic user routes correctly', async () => {
        const request = createMockRequest('/user/orders/123');
        const mockUser = { id: 'user123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockUserProfile = { is_admin: false };
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockUserProfile,
                error: null,
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });

      it('handles dynamic admin routes correctly', async () => {
        const request = createMockRequest('/admin/restaurants/456');
        const mockUser = { id: 'admin123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        const mockAdminProfile = { is_admin: true };
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: mockAdminProfile,
                error: null,
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    });

    describe('unknown routes', () => {
      it('allows access to unknown routes (lets Next.js handle 404)', async () => {
        const request = createMockRequest('/unknown/route');
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        const result = await updateSession(request);

        expect(result).toBe(mockNextResponse);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    });

    describe('error handling', () => {
      it('handles user profile lookup errors gracefully', async () => {
        const request = createMockRequest('/user/dashboard');
        const mockUser = { id: 'user123' };

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        });

        // Mock user profile lookup error
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error'),
              }),
            })),
          })),
        });

        const result = await updateSession(request);

        // When getUserRole returns null, userRole !== 'user' is true, so it redirects to admin dashboard
        expect(NextResponse.redirect).toHaveBeenCalledWith(
          expect.objectContaining({
            href: expect.stringContaining('/admin/dashboard'),
          })
        );
        expect(result).toBe(mockRedirectResponse);
      });

      it('handles Supabase client creation errors', async () => {
        createServerClient.mockImplementation(() => {
          throw new Error('Failed to create client');
        });

        const request = createMockRequest('/user/dashboard');

        await expect(updateSession(request)).rejects.toThrow(
          'Failed to create client'
        );
      });
    });

    describe('cookie management', () => {
      it('configures Supabase client with correct cookie handlers', async () => {
        const request = createMockRequest('/', [
          { name: 'sb-access-token', value: 'token123' },
          { name: 'sb-refresh-token', value: 'refresh123' },
        ]);

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        await updateSession(request);

        expect(createServerClient).toHaveBeenCalledWith(
          'https://test-project.supabase.co',
          'test-anon-key-123',
          expect.objectContaining({
            cookies: expect.objectContaining({
              getAll: expect.any(Function),
              setAll: expect.any(Function),
            }),
          })
        );

        // Test that cookie getAll function works
        const config = createServerClient.mock.calls[0][2];
        const cookies = config.cookies.getAll();
        expect(cookies).toEqual([
          { name: 'sb-access-token', value: 'token123' },
          { name: 'sb-refresh-token', value: 'refresh123' },
        ]);
      });
    });
  });
});
