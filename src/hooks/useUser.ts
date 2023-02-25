import { useCookies } from "react-cookie";

export type User = {
  id: string;
};

export function useUser(): [User | undefined, Function] {
  const [cookies, setCookie] = useCookies(["user"]);
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
