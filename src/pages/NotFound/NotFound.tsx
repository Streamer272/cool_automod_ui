import "./style.scss";

export function NotFound() {
  return (
    <>
      <p className="title">404</p>
      <p className="subtitle">Page not found</p>
      <p className="link">
        Go back <a href="/">home</a>
      </p>
    </>
  );
}
