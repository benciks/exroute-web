import { useState } from "react";
import Login from "./Login.jsx";
import Planner from "./Planner.jsx";

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  function saveToken(newToken) {
    if (newToken) localStorage.setItem("token", newToken);
    else localStorage.removeItem("token");
    setToken(newToken);
  }

  if (!token) return <Login onLogin={saveToken} />;
  return <Planner token={token} onLogout={() => saveToken(null)} />;
}
