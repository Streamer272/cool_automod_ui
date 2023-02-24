import { useEffect } from "react";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import "./style.scss";

export function Login() {
  const [user] = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/home");
  }, [user]);

  return (
    <>
      <h1>Login</h1>
    </>
  );
}
