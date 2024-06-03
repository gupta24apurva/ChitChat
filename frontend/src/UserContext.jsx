import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const UserContext = createContext({});

export function UserContextProvider({ children }) {
    const [username, setUsername] = useState(null);
    const [userId, setUserId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // const token = localStorage.getItem('token');

        axios.get('/profile')
            .then((res) => {
                console.log("Logged in!")
                // console.log("Profile: ", res.data);
                setUserId(res.data.userId);
                setUsername(res.data.username);
                setLoading(false);
            })
            .catch((err) => {
                console.log(err);
                setLoading(false);
            })
    }, [])

    return (
        <UserContext.Provider value={{ username, setUsername, userId, setUserId }}>
            {loading ? <div>Loading...</div> : children}
        </UserContext.Provider>
    )
}