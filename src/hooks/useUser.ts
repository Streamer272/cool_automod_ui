import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";

export type User = {
  id: string;
};

export function useUser(depends?: boolean): [User | undefined, Function] {
  const navigate = useNavigate();
  const [cookies, setCookie] = useCookies(["user"]);
  if (depends && !cookies["user"]) {
    window.location.assign("/login");
  }

  return [
    cookies["user"]
      ? {
          id: cookies["user"],
        }
      : undefined,
    (value: string) => {
      setCookie("user", value, {
        path: "/",
        secure: true,
      });
    },
  ];
}
