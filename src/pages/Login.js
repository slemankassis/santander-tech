/* eslint-disable react/prop-types */
import React, { useState } from "react";
import { Link, Redirect } from "react-router-dom";
import MockAdapter from "axios-mock-adapter";
import axios from 'axios';
import { Card, Form, Input, Button, Error } from "./components/AuthForms";
import { useAuth } from "../context/auth";

const mock = new MockAdapter(axios);

mock.onPost("/auth/login").reply(200, {
  token: 'https://jwt.io/#debugger-io?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiY29tbW9uIn0.1CdoqFmI-ONGt4DezSMbL9HvNc_64akVajk7s7a16HI',
});

function Login(props) {
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [isError, setIsError] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const { setAuthTokens } = useAuth();

  function postLogin() {
    axios.post("/auth/login", {
      userName,
      password
    }).then(result => {
      console.log(result, 9999);
      if (result.status === 200) {
        setAuthTokens(result.data);
        setLoggedIn(true);
      } else {
        setIsError(true);
      }
    }).catch(() => {
      setIsError(true);
    });
  }

  const referer = props.location.state.referer || '/';

  if (isLoggedIn) {
    return <Redirect to={referer} />;
  }

  return (
    <Card>
      <Form>
        <Input
          type="username"
          value={userName}
          onChange={e => {
            setUserName(e.target.value);
          }}
          placeholder="email"
        />
        <Input
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
          }}
          placeholder="password"
        />
        <Button onClick={postLogin}>Sign In</Button>
      </Form>
      <Link to="/signup">Dont have an account?</Link>
      {isError && <Error>The username or password provided were incorrect!</Error>}
    </Card>
  );
}

export default Login;
