export default function Permessi({
  user,
  sections = [],
  roles = [],
  accessMatrix = {},
  onUpdateAccessMatrix,
}) {
  const canManageAccess = (user?.livelloAmministrazione ?? 0) >= 2;
  const permissionSections = sections.filter((section) => section.showInPermissions);

  const isChecked = (sectionId, roleId) => {
    const roleKey = String(roleId);
    const value = accessMatrix?.[roleKey]?.[sectionId];
    return value ?? true;
  };

  const handleToggle = (sectionId, roleId) => {
    if (!onUpdateAccessMatrix) return;
    const nextValue = !isChecked(sectionId, roleId);
    onUpdateAccessMatrix(sectionId, roleId, nextValue);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "12px" }}>🔐 Permessi</h2>
      <div style={{ fontSize: "13px", marginBottom: "16px", color: "var(--text-secondary, #6b7280)" }}>
        {canManageAccess
          ? "Gestisci quali ruoli possono accedere alle sezioni."
          : "Solo i Boss possono modificare i permessi."}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="access-table">
          <thead>
            <tr>
              <th>Sezione</th>
              {roles.map((role) => (
                <th key={role.id}>{role.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionSections.map((section) => (
              <tr key={section.id}>
                <td>{section.label}</td>
                {roles.map((role) => {
                  const disabled = !canManageAccess || section.alwaysAllow;
                  return (
                    <td key={`${section.id}-${role.id}`}>
                      <label className="access-checkbox">
                        <input
                          type="checkbox"
                          checked={isChecked(section.id, role.id)}
                          disabled={disabled}
                          onChange={() => handleToggle(section.id, role.id)}
                        />
                        <span />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {permissionSections.length === 0 && (
        <div style={{ fontSize: "12px", color: "var(--text-secondary, #6b7280)", marginTop: "12px" }}>
          Nessuna sezione configurata.
        </div>
      )}
    </div>
  );
}
