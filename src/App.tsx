import { MantineProvider } from "@mantine/core";
import "./style.scss";

type Props = {
  children: JSX.Element | JSX.Element[];
};

export function App(props: Props) {
  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        fontFamily: "Roboto",
        colorScheme: "dark",
        fontSizes: {
          xs: 10,
          sm: 12,
          md: 14,
          lg: 16,
          xl: 20,
        },
      }}
    >
      <div className="app">{props.children}</div>
    </MantineProvider>
  );
}
