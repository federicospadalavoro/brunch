import { useState, useEffect } from "react";

export default function Collaboratori({
  users = [],
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [showSettings, setShowSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("collaboratoriVisibleColumns");
    return saved
      ? JSON.parse(saved)
      : {
          nome: true,
          cognome: true,
          username: true,
          livello: true,
          contratto: true,
          ore: true,
          posizione: true,
        };
  });

  const allColumns = {
    nome: "NOME",
    cognome: "COGNOME",
    username: "USERNAME",
    password: "PASSWORD",
    livello: "LIVELLO",
    contratto: "CONTRATTO",
    ore: "ORE",
    posizione: "POSIZIONE",
    informazioniAggiuntive: "INFORMAZIONI AGGIUNTIVE",
  };

  useEffect(() => {
    localStorage.setItem(
      "collaboratoriVisibleColumns",
      JSON.stringify(visibleColumns),
    );
  }, [visibleColumns]);

  const toggleColumn = (col) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [col]: !prev[col],
    }));
  };

  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    username: "",
    password: "",
    collaboratore: true,
    livelloAmministrazione: 0,
    tipoContratto: "full-time",
    oreContratto: 40,
    posizione: "sala",
    informazioniAggiuntive: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing !== null) {
      // Modifica esistente
      onUpdateUser(editing, formData);
      setEditing(null);
    } else {
      // Nuovo user
      onAddUser(formData);
    }
    // Reset form e chiudi
    setFormData({
      nome: "",
      cognome: "",
      username: "",
      password: "",
      collaboratore: true,
      livelloAmministrazione: 0,
      tipoContratto: "full-time",
      oreContratto: 40,
      posizione: "sala",
      informazioniAggiuntive: "",
    });
    setShowForm(false);
  };

  const handleEdit = (index) => {
    setEditing(index);
    setFormData({ ...users[index] });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
    setFormData({
      nome: "",
      cognome: "",
      username: "",
      password: "",
      collaboratore: true,
      livelloAmministrazione: 0,
      tipoContratto: "full-time",
      oreContratto: 40,
      posizione: "sala",
      informazioniAggiuntive: "",
    });
  };
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedUsers = () => {
    if (!sortConfig.key) return users;

    const sorted = [...users].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Gestisci valori numerici e stringhe vuote
      if (sortConfig.key === "oreContratto") {
        aVal =
          aVal === "" || aVal === "-"
            ? 0
            : typeof aVal === "string"
              ? parseFloat(aVal) || 0
              : aVal;
        bVal =
          bVal === "" || bVal === "-"
            ? 0
            : typeof bVal === "string"
              ? parseFloat(bVal) || 0
              : bVal;
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const sortedUsers = getSortedUsers();

  return (
    <div style={{ paddingTop: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>👥 Collaboratori ({users.length})</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              fontSize: "18px",
              padding: "10px 20px",
              borderRadius: "8px",
              background: "var(--button-bg, #007AFF)",
              color: "var(--button-text, white)",
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) =>
              (e.target.style.background = "var(--button-hover, #0051D5)")
            }
            onMouseOut={(e) =>
              (e.target.style.background = "var(--button-bg, #007AFF)")
            }
          >
            ⚙️ Colonne
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                fontSize: "18px",
                padding: "10px 20px",
                borderRadius: "8px",
                background: "var(--button-bg, #007AFF)",
                color: "var(--button-text, white)",
                border: "none",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "var(--button-hover, #0051D5)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "var(--button-bg, #007AFF)")
              }
            >
              ➕ Aggiungi Collaboratore
            </button>
          )}
        </div>
      </div>

      {/* Settings Colonne */}
      {showSettings && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "8px",
            background: "var(--modal-bg)",
            border: "1px solid var(--border-color)",
          }}
        >
          <h4 style={{ marginTop: 0 }}>Seleziona Colonne da Mostrare:</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {Object.entries(allColumns).map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={visibleColumns[key] || false}
                  onChange={() => toggleColumn(key)}
                  style={{ marginRight: "8px", cursor: "pointer" }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSubmit}>
              <h3>
                {editing !== null
                  ? "✏️ Modifica Collaboratore"
                  : "➕ Nuovo Collaboratore"}
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <input
                  type="text"
                  placeholder="Nome"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Cognome"
                  value={formData.cognome}
                  onChange={(e) =>
                    setFormData({ ...formData, cognome: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px",
                    gridColumn: "1",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.collaboratore}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFormData({
                        ...formData,
                        collaboratore: checked,
                        ...(checked
                          ? {}
                          : {
                              tipoContratto: "",
                              oreContratto: "",
                              informazioniAggiuntive: "",
                            }),
                      });
                    }}
                    style={{ marginRight: "8px" }}
                  />
                  Collaboratore
                </label>
                <select
                  value={formData.livelloAmministrazione}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      livelloAmministrazione: Number(e.target.value),
                    })
                  }
                >
                  <option value={0}>User Normale</option>
                  <option value={1}>Manager</option>
                  <option value={2}>Boss</option>
                </select>
                {formData.collaboratore && (
                  <>
                    <select
                      value={formData.tipoContratto}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tipoContratto: e.target.value,
                        })
                      }
                    >
                      <option value="full-time">Full-time</option>
                      <option value="chiamata">Chiamata</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Ore Contratto"
                      value={formData.oreContratto}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          oreContratto: Number(e.target.value),
                        })
                      }
                    />
                  </>
                )}
                {formData.collaboratore && (
                  <select
                    value={formData.posizione || "sala"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        posizione: e.target.value,
                      })
                    }
                  >
                    <option value="sala">Sala</option>
                    <option value="bar">Bar</option>
                    <option value="cucina">Cucina</option>
                  </select>
                )}
              </div>
              {formData.collaboratore && (
                <textarea
                  placeholder="Informazioni Aggiuntive"
                  value={formData.informazioniAggiuntive}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      informazioniAggiuntive: e.target.value,
                    })
                  }
                  style={{ marginTop: "10px" }}
                  rows={3}
                />
              )}
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "var(--button-bg, #007AFF)",
                    color: "var(--button-text, white)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {editing !== null ? "💾 Salva Modifiche" : "➕ Aggiungi"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    padding: "10px 20px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.1)",
                    color: "var(--text-color)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista Collaboratori - Tabella */}
      {users.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            color: "#999",
            fontSize: "18px",
            marginTop: "50px",
          }}
        >
          Nessun collaboratore. Clicca "Aggiungi Collaboratore" per iniziare!
        </p>
      ) : (
        <div
          style={{
            overflowX: "auto",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "20px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  color: "var(--table-header-text)",
                }}
              >
                {visibleColumns.nome && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      borderTopLeftRadius: "12px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("nome")}
                  >
                    Nome{" "}
                    {sortConfig.key === "nome" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.cognome && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("cognome")}
                  >
                    Cognome{" "}
                    {sortConfig.key === "cognome" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.username && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("username")}
                  >
                    Username{" "}
                    {sortConfig.key === "username" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.password && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("password")}
                  >
                    Password{" "}
                    {sortConfig.key === "password" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.livello && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("livelloAmministrazione")}
                  >
                    Livello{" "}
                    {sortConfig.key === "livelloAmministrazione" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.contratto && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("tipoContratto")}
                  >
                    Contratto{" "}
                    {sortConfig.key === "tipoContratto" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.ore && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("oreContratto")}
                  >
                    Ore{" "}
                    {sortConfig.key === "oreContratto" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.posizione && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => handleSort("posizione")}
                  >
                    Posizione{" "}
                    {sortConfig.key === "posizione" &&
                      (sortConfig.direction === "asc" ? "↓" : "↑")}
                  </th>
                )}
                {visibleColumns.informazioniAggiuntive && (
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    Informazioni Aggiuntive
                  </th>
                )}
                <th
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    borderTopRightRadius: "12px",
                  }}
                >
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user, sortedIndex) => {
                const originalIndex = users.findIndex(u => u === user);
                return (
                <tr
                  key={originalIndex}
                  style={{
                    backgroundColor:
                      sortedIndex % 2 === 0
                        ? "var(--table-row-bg)"
                        : "var(--table-row-hover)",
                    transition: "background 0.2s",
                  }}
                >
                  {visibleColumns.nome && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--table-border, #eee)",
                      }}
                    >
                      {user.nome}
                    </td>
                  )}
                  {visibleColumns.cognome && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--table-border, #eee)",
                      }}
                    >
                      {user.cognome}
                    </td>
                  )}
                  {visibleColumns.username && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--table-border, #eee)",
                      }}
                    >
                      {user.username}
                    </td>
                  )}
                  {visibleColumns.password && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--table-border, #eee)",
                      }}
                    >
                      {user.password}
                    </td>
                  )}
                  {visibleColumns.livello && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid var(--table-border, #eee)",
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "12px",
                          background:
                            user.livelloAmministrazione === 2
                              ? "#e74c3c"
                              : user.livelloAmministrazione === 1
                                ? "#f39c12"
                                : "#3498db",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {user.livelloAmministrazione === 0
                          ? "User"
                          : user.livelloAmministrazione === 1
                            ? "Manager"
                            : "Boss"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.contratto && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {(() => {
                        const t = (user.tipoContratto || "")
                          .toString()
                          .trim()
                          .toLowerCase();
                        if (!t) return "";
                        if (t === "ft" || t === "full-time") return "Full-time";
                        if (t === "pt" || t === "part-time") return "Part-time";
                        if (t === "ch" || t === "chiamata") return "Chiamata";
                        return t.charAt(0).toUpperCase() + t.slice(1);
                      })()}
                    </td>
                  )}
                  {visibleColumns.ore && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {user.oreContratto ? `${user.oreContratto}h` : ""}
                    </td>
                  )}
                  {visibleColumns.posizione && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <span
                        style={{
                          padding: "4px 12px",
                          borderRadius: "6px",
                          background:
                            user.posizione === "cucina"
                              ? "#e74c3c"
                              : user.posizione === "bar"
                                ? "#9b59b6"
                                : "#27ae60",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {user.posizione ? user.posizione.charAt(0).toUpperCase() + user.posizione.slice(1) : "—"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.informazioniAggiuntive && (
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {user.informazioniAggiuntive}
                    </td>
                  )}
                  <td
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid var(--table-border, #eee)",
                    }}
                  >
                    <button
                      onClick={() => handleEdit(originalIndex)}
                      className="btn-edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeleteUser(originalIndex)}
                      className="btn-delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
