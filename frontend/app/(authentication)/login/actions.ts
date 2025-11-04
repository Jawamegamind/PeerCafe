'use server';

import axios from 'axios';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const formdata = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  // Signing in first using supabase auth
  const { data, error } = await supabase.auth.signInWithPassword(formdata);

  if (error) {
    // If invalid credentials are provided, we should not login the user
    if (error.code == 'invalid_credentials') {
      return 'Invalid credentials';
    }
  } else {
    // Now basically signing in using our backend to retireve the user details
    // const response = await axios.post('http://localhost:8000/api/login', {
    //     user_id: data.user?.id ?? '',
    //     Email: formdata.email,
    //     Password: formdata.password
    // })
    const access_token = data.session.access_token;

    const response = await axios.post(
      'http://localhost:8000/api/login',
      {
        user_id: data.user?.id ?? '',
        email: formdata.email,
        password: formdata.password,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Now here we need to check the user's role and based on that redirect to the appropriate dashboard
    const userObject = response.data.user;

    // Redirect based on the boolean flags
    if (userObject.is_admin) {
      redirect('/admin/dashboard');
    } else {
      // Sign in successful so we redirect to the dashboard
      revalidatePath('/', 'layout');
      redirect('/user/dashboard');
    }

    // if (userObject.role == "admin") {
    //     console.log("The user is admin")
    //     redirect('/admin/dashboard')
    // }
    // else if (userObject.role == "user") {
    //     // Sign in successful so we redirect to the dashboard
    //     revalidatePath('/', 'layout')
    //     redirect('/user/dashboard')
    // }
  }
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return 'Logout failed';
  }

  revalidatePath('/', 'layout');
  redirect('/login');
}
