import React, { useContext, useState } from 'react'
import axios from 'axios'
import { UserContext } from '../UserContext';

const RegisterAndLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');

  const { setUsername: setLoggedInUsername, setUserId } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isLoginOrRegister==='register'?'register':'login';
    await axios.post(url, { username, password })
      .then((res) => {
        const { data } = res;
        console.log(isLoginOrRegister);
        console.log(data)
        localStorage.setItem('token', data.token);
        setLoggedInUsername(username);
        setUserId(data.userId);
      })
      .catch((err) => {
        console.log(err);
      })
  }

  return (
    <div className='bg-blue-50 h-screen flex items-center'>
      <form className='w-64 mx-auto mb-12' onSubmit={handleSubmit}>
        <input value={username}
          onChange={e => setUsername(e.target.value)}
          className='block w-full rounded-sm p-2 mb-2 border'
          type="text"
          placeholder='username'
        />
        <input value={password}
          onChange={e => setPassword(e.target.value)}
          className='block w-full rounded-sm p-2 mb-2 border'
          type="password"
          placeholder='password'
        />
        <button className='bg-blue-500 text-white block w-full rounded-sm p-2'>
          {isLoginOrRegister === 'register' ? 'Register' : "Login"}
        </button>
        {isLoginOrRegister === 'register' && (
          <div className='text-center mt-2'>
            Already a member?
            <button className='text-blue-500 ml-1' onClick={() => setIsLoginOrRegister('login')}>
              Login
            </button>
          </div>
        )}
        {isLoginOrRegister === 'login' && (
          <div className='text-center mt-2'>
            Not a member?
            <button className='text-blue-500 ml-1' onClick={() => setIsLoginOrRegister('register')}>
              Register
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default RegisterAndLogin
