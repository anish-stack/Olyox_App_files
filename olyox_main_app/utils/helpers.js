import axios from 'axios'
import { tokenCache } from '../Auth/cache';
const BACKEND_URL = 'http://192.168.1.8:9630/api/v1/user'
export const formatDate = (date) => {
  // Example helper function
  return new Date(date).toLocaleDateString();
};


export const createUserRegister = async (formdata) => {
  try {
    const data = await axios.post(`${BACKEND_URL}/register`, formdata)
    return data.data

  } catch (error) {
    return error.response
  }
}


export const verify_otp = async (formdata) => {
  try {
    const data = await axios.post(`${BACKEND_URL}/verify-user`, formdata)
    return data.data

  } catch (error) {
    return error.response
  }
}


export const resend_otp = async (formdata) => {
  try {
    const data = await axios.post(`${BACKEND_URL}/resend-otp`, formdata)
    return data.data

  } catch (error) {
    return error.response
  }
}


export const find_me = async () => {
  try {
    const token  = await tokenCache.getToken('auth_token_db')
    // console.log(token)
    const data = await axios.get(`http://192.168.1.8:9630/api/v1/user/find_me`,{
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    return data.data

  } catch (error) {
    console.log(error)
    return error.response
  }
}

export const login = async (formData) => {
  try {
   
    const data = await axios.post(`${BACKEND_URL}/login`,formData)

    return data.data

  } catch (error) {
    // console.log(error)
    return error.response
  }
}