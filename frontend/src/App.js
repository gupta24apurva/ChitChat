import React from "react";
import axios from "axios";
import Routes from "./Routes";
import { UserContextProvider } from "./UserContext";

function App() {

  axios.defaults.baseURL='http://localhost:8000';
  axios.defaults.withCredentials=true;

  return (
    <UserContextProvider>
      <Routes/>
    </UserContextProvider>
  );
}

export default App;
