import "./style.scss";

type Props = {
  children: JSX.Element | JSX.Element[];
};

export function App(props: Props) {
  return <div className="app">{props.children}</div>;
}
