import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import GanttViewer from './GanttViewer';

export default function ViewTurno({ generatedShifts, users = [] }) {
  const [searchParams] = useSearchParams();
  const shiftId = searchParams.get('id');
  const [showFilter, setShowFilter] = useState(false);
  const [filteredCollaborators, setFilteredCollaborators] = useState(null); // null = mostra tutti
  const filterIconSrc = `${import.meta.env.BASE_URL}filter.png`;

  const shift = generatedShifts.find(s => s.id === shiftId);

  if (!shift) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⚠️ Turno non trovato</h2>
      </div>
    );
  }

  const days = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
  const dayLabels = {
    lunedi: 'Lunedì',
    martedi: 'Martedì',
    mercoledi: 'Mercoledì',
    giovedi: 'Giovedì',
    venerdi: 'Venerdì',
    sabato: 'Sabato',
    domenica: 'Domenica'
  };

  // Ordina i collaboratori per posizione (cucina, sala, bar) e alfabeticamente dentro ogni gruppo
  const collaborators = Object.keys(shift.grid).sort((a, b) => {
    const userA = users.find(u => u.username === a);
    const userB = users.find(u => u.username === b);
    
    const posA = userA?.posizione || "sala";
    const posB = userB?.posizione || "sala";
    
    // Ordine posizioni: cucina (0), sala (1), bar (2)
    const posOrder = { "cucina": 0, "sala": 1, "bar": 2 };
    const orderA = posOrder[posA] ?? 1;
    const orderB = posOrder[posB] ?? 1;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Se stessa posizione, ordina alfabeticamente
    return a.localeCompare(b);
  });

  // Applica il filtro ai collaboratori
  const displayedCollaborators = filteredCollaborators === null 
    ? collaborators 
    : collaborators.filter(c => filteredCollaborators.includes(c));

  const ganttRows = displayedCollaborators.map((username) => {
    const user = users.find((u) => u.username === username);
    return {
      key: username,
      username,
      nome: user?.nome,
      cognome: user?.cognome,
      posizione: user?.posizione,
    };
  });

  // Funzioni per il filtro
  const handleSelectAll = () => {
    setFilteredCollaborators(collaborators);
  };

  const handleDeselectAll = () => {
    setFilteredCollaborators([]);
  };

  const toggleCollaborator = (username) => {
    if (filteredCollaborators === null) {
      // Inizializza il filtro con tutti tranne questo
      setFilteredCollaborators(collaborators.filter(c => c !== username));
    } else if (filteredCollaborators.includes(username)) {
      setFilteredCollaborators(filteredCollaborators.filter(c => c !== username));
    } else {
      setFilteredCollaborators([...filteredCollaborators, username]);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowFilter(!showFilter)}
            style={{
              width: '36px',
              height: '36px',
              padding: '0',
              cursor: 'pointer',
              backgroundColor: showFilter ? '#27ae60' : 'var(--button-bg)',
              color: 'var(--button-text)',
              border: 'none',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={filterIconSrc}
              alt="Filtro"
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain',
                display: 'block',
                pointerEvents: 'none'
              }}
            />
          </button>
        </div>
      </div>

      {showFilter && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
            }}
            onClick={() => setShowFilter(false)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color)",
              borderRadius: "12px",
              padding: "24px",
              zIndex: 1001,
              minWidth: "350px",
              maxHeight: "70vh",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontWeight: 600 }}>Filtra collaboratori</div>
              <button
                onClick={() => setShowFilter(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--card-bg)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Tutti
              </button>
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--card-bg)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Nessuno
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {collaborators.map((username) => {
                const user = users.find((u) => u.username === username);
                const isChecked =
                  filteredCollaborators === null
                    ? true
                    : filteredCollaborators.includes(username);
                const posizione = user?.posizione || "sala";
                let posBadgeColor = "#5AC8FA";
                if (posizione === "cucina") {
                  posBadgeColor = "#FFA366";
                } else if (posizione === "bar") {
                  posBadgeColor = "#C084FC";
                }

                return (
                  <label
                    key={username}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      padding: "10px",
                      borderRadius: "6px",
                      backgroundColor: isChecked
                        ? "rgba(84, 200, 250, 0.1)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCollaborator(username)}
                      style={{ cursor: "pointer", width: "18px", height: "18px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "500" }}>
                        {user?.nome} {user?.cognome}
                      </div>
                      <div
                        style={{ fontSize: "11px", color: "var(--text-secondary)" }}
                      >
                        {username}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        background: posBadgeColor,
                        color: "white",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {posizione.charAt(0).toUpperCase() + posizione.slice(1)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      <GanttViewer
        grid={shift.grid}
        rows={ganttRows}
        days={days}
        dayLabels={dayLabels}
        startDate={shift.startDate}
        showSummary
      />
    </div>
  );
}
