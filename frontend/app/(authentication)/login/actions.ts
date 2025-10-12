'use server'

import axios from 'axios'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    console.log("login action")
    const supabase = await createClient()
  
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const formdata = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    // Signing in first using supabase auth
    const { data, error } = await supabase.auth.signInWithPassword(formdata)
  
    if (error) {
      console.error('Error:', error)

      // If invalid credentials are provided, we should not login the user
      if (error.code == 'invalid_credentials') {
          console.log('Invalid credentials')
          return "Invalid credentials";
      }
    }
    else {
        console.log('Data:', data)

        // Now basically signing in using our backend to retireve the user details
        const response = await axios.post('http://localhost:8000/api/login', {
            user_id: data.user?.id ?? '',
            email: formdata.email,
            password: formdata.password
        })
        console.log("The backend's response to signing in user is",response.data)

        // Now here we need to check the user's role and based on that redirect to the appropriate dashboard
        const userObject = response.data.user
        console.log("The user object is",userObject)

        if (userObject.role == "admin") {
            console.log("The user is admin")
            redirect('/admin/dashboard')
        }
        else if (userObject.role == "user") {
            // Sign in successful so we redirect to the dashboard
            revalidatePath('/', 'layout')
            redirect('/user/dashboard')
        }
    }
  }

  export async function logout() {
    console.log("logout action")
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error:', error)
    }

    revalidatePath('/', 'layout')
    redirect('/login')
}  