export default function Profilo({ user, onLogout }) {
  const fullName = `${user?.nome || ""} ${user?.cognome || ""}`.trim();
  const initials = (user?.nome?.[0] || "") + (user?.cognome?.[0] || "");
  const roleLabel = user?.posizione || (user?.collaboratore ? "Collaboratore" : "Admin");

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {initials || (user?.username?.[0] || "?")}
          </div>
          <div>
            <div className="profile-name">{fullName || "Profilo"}</div>
            <div className="profile-username">@{user?.username || "utente"}</div>
          </div>
        </div>

        <div className="profile-info">
          <div className="profile-field">
            <span>Nome</span>
            <strong>{user?.nome || "—"}</strong>
          </div>
          <div className="profile-field">
            <span>Cognome</span>
            <strong>{user?.cognome || "—"}</strong>
          </div>
          <div className="profile-field">
            <span>Username</span>
            <strong>{user?.username || "—"}</strong>
          </div>
          <div className="profile-field">
            <span>Ruolo</span>
            <strong>{roleLabel || "—"}</strong>
          </div>
        </div>

        <div className="profile-actions">
          <button className="profile-logout" onClick={onLogout}>
            Esci
          </button>
        </div>
      </div>
    </div>
  );
}
