import React, { useContext } from 'react'
import RegisterAndLogin from './components/RegisterAndLogin'
import { UserContext } from './UserContext'
import Chat from './components/Chat';

const Routes = () => {
    const { username, userId } = useContext(UserContext);
    if(username)
    {
        console.log("My user id: ",userId)
        return <Chat myUserId={userId}/> 
    }

    return (
        <RegisterAndLogin/>
    )
}

export default Routes
