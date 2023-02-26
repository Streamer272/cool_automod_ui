import { useEffect } from "react";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import { useDiscordOauth2Url } from "../../hooks/useDiscordOauth2Url";
import { useBackendUrl } from "../../hooks/useBackendUrl";
import { showNotification } from "@mantine/notifications";
import axios from "axios";
export function Login() {
  const [user, setUser] = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) return navigate("/home");

    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get("code");
    const error = queryParams.get("error");
    if (error) {
      navigate("/");
    } else if (!code) {
      window.location.assign(useDiscordOauth2Url());
    } else {
      axios
        .get(`${useBackendUrl()}/discordLogin`, {
          params: {
            code: code,
          },
        })
        .then((response) => {
          setUser(response.data.id);
        })
        .catch(() => {
          showNotification({
            message: "Couldn't log in with Discord",
            color: "red",
          });
        });
    }
  }, []);

  useEffect(() => {
    if (user) return navigate("/home");
  }, [user]);

  return (
    <>
      <h1>Login</h1>
    </>
  );
}
