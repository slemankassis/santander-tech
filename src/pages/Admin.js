import React from "react";
import { Button } from "./components/AuthForms";
import { useAuth } from "../context/auth";
import CalculateBeer from './components/CalculateBeer';
import CalculateWeather from './components/CalculateWeather';

function Admin() {
  const { setAuthTokens } = useAuth();

  function logOut() {
    setAuthTokens();
  }

  return (
    <div>
      <div>Admin Page</div>
      <CalculateBeer />
      <CalculateWeather />
      <Button onClick={logOut}>Log out</Button>
    </div>
  );
}

export default Admin;
