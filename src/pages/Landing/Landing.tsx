import "./style.scss";

export function Landing() {
  return (
    <div className="landing">
      <a
        href="https://discord.com/api/oauth2/authorize?client_id=974384497791467547&permissions=8&scope=bot"
        className="part"
      >
        <p className="link">Add to server</p>
      </a>
      <a href="/login" className="part">
        <p className="link">Manage fluids</p>
      </a>
    </div>
  );
}
