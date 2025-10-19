"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // For now, default to user profile
    // Later this can be enhanced with role-based routing
    router.push('/user/profile');
  }, [router]);

  return (
    <div>Redirecting to profile...</div>
  );
}