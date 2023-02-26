import { useEffect } from "react";
import { useBackendUrl } from "../../hooks/useBackendUrl";
import { useUser } from "../../hooks/useUser";
import { useNavigate } from "react-router-dom";
import { showNotification, updateNotification } from "@mantine/notifications";
import axios from "axios";

export function Success() {
  const [user] = useUser(true);
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const id = queryParams.get("session_id");
    if (!id) return navigate("/");

    showNotification({
      id: "finish",
      message: "Completing payment...",
      loading: true,
    });
    axios
      .get(`${useBackendUrl()}/completePayment`, {
        params: {
          id: id,
          uid: user!!.id,
        },
      })
      .then(() => {
        updateNotification({
          id: "finish",
          message: "Payment complete",
        });
        navigate("/home");
      })
      .catch(() => {
        updateNotification({
          id: "finish",
          message:
            "Payment failed but user still charged, contact the admin (daniel.svitan.dev@gmail.com) as soon as possible.",
          color: "red",
          autoClose: false,
        });
      });
  }, []);

  return (
    <>
      <p className="title">Processing...</p>
    </>
  );
}
