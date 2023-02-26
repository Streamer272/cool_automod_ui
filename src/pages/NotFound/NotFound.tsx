import "./style.scss";

export function NotFound() {
  return (
    <>
      <p className="title">404</p>
      <p className="subtitle">Page not found</p>
      <p className="link">
        Return <a href="/">home</a>
      </p>
    </>
  );
}
