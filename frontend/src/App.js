import React from "react";
import axios from "axios";
import Routes from "./Routes";
import { UserContextProvider } from "./UserContext";
require("dotenv").config();

function App() {

  axios.defaults.baseURL=process.env.BACKEND_URL;
  axios.defaults.withCredentials=true;

  return (
    <UserContextProvider>
      <Routes/>
    </UserContextProvider>
  );
}

export default App;
