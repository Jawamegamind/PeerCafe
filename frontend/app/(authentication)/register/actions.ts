'use server';

import axios from 'axios';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/utils/supabase/server';

export async function register(formData: FormData) {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const formdata = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  // First signing up using supabase auth
  // Now signing up using supabase auth
  const { data, error } = await supabase.auth.signUp({
    email: formdata.email,
    password: formdata.password,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error:', error);

    // If the email already exists in the database, we should not register the user
    if (error.code == 'user_already_exists') {
      return 'User already exists';
    } else {
      return 'User registration failed';
    }
  } else {
    // console.log('Data from supabase auth is:', data);

    // Now that we have signed up using supabase, we can create a user in our own database using the auth user UID
    // const response = await axios.post('http://localhost:8000/api/register', {
    //     user_id: data.user?.id ?? '',
    //     name: formdata.name,
    //     email: formdata.email,
    //     password: formdata.password,
    //     role: 'user'
    // })

    const access_token = data.session?.access_token; // may be null if email confirmation required

    const response = await axios.post(
      'http://localhost:8000/api/register',
      {
        user_id: data.user?.id ?? '',
        first_name: formdata.name.split(' ')[0] || '',
        last_name: formdata.name.split(' ')[1] || '',
        email: formdata.email,
        phone: '',
        is_admin: false,
        is_active: true,
        password: formdata.password,
      },
      {
        headers: access_token
          ? { Authorization: `Bearer ${access_token}` }
          : {},
      }
    );

    // console.log(
    //   "The backend's response to signing up new user is",
    //   response.data
    // );

    // Now here before we register the user, we need to check the returned response message from the backend
    // If the response message is "User already exists", we should not register the user
    // If the response message is "User registered successfully", we should register the user
    // If the response message is "User registration failed", we should not register the user
    if (response.data.message == 'User already exists') {
      //   console.log('User already exists');
      return 'User already exists';
    } else if (response.data.message == 'User created successfully') {
      //   console.log('User registered successfully');
      revalidatePath('/', 'layout');
      redirect('/login');
    } else if (response.data.message == 'User registration failed') {
      //   console.log('User registration failed');
      return 'User registration failed';
    }
  }
}
