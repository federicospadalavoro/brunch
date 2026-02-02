import { useEffect, useMemo, useState, useRef } from "react";
import { saveState } from "../config/firebaseUtils";

// Stili per animazioni
const scrollButtonAnimationStyle = `
  @keyframes scrollBounce {
    0% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1.1); }
    100% { transform: translateY(0) scale(1); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = scrollButtonAnimationStyle;
document.head.appendChild(styleSheet);

const days = [
  { key: "lunedi", label: "Lunedì" },
  { key: "martedi", label: "Martedì" },
  { key: "mercoledi", label: "Mercoledì" },
  { key: "giovedi", label: "Giovedì" },
  { key: "venerdi", label: "Venerdì" },
  { key: "sabato", label: "Sabato" },
  { key: "domenica", label: "Domenica" },
];

function rowKeyForUser(u) {
  // USA SOLO LO USERNAME - mai fallback nome+cognome
  const username = `${u?.username || ""}`.trim();
  if (!username) {
    console.warn(`⚠️ Collaboratore "${u?.nome} ${u?.cognome}" non ha username valido`);
    // Fallback sicuro: nome+cognome per debugging
    const normalize = (s) => (s || "")
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
    return `${normalize(u?.nome)}${normalize(u?.cognome)}`;
  }
  return username;
}

function emptyCell() {
  return { in1: "", out1: "", in2: "", out2: "", ruolo: "" };
}

function makeEmptyGrid(collaborators) {
  const grid = {};
  collaborators.forEach((u) => {
    const key = rowKeyForUser(u);
    grid[key] = {};
    days.forEach((d) => { grid[key][d.key] = emptyCell(); });
  });
  return grid;
}

// Funzioni helper per il Gantt
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 8; h <= 23; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 23) slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  slots.push('24:00');
  return slots;
};

const calculateHours = (in1, out1, in2, out2) => {
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  let totalMinutes = 0;
  if (in1 && out1) {
    totalMinutes += timeToMinutes(out1) - timeToMinutes(in1);
  }
  if (in2 && out2) {
    totalMinutes += timeToMinutes(out2) - timeToMinutes(in2);
  }

  const decimalHours = (totalMinutes / 60).toFixed(1).replace('.', ',');
  return `${decimalHours}h`;
};

const timeToMinutes = (time) => {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const isWorking = (grid, username, day, slotTime) => {
  const dayData = grid[username]?.[day];
  if (!dayData) return false;

  const slotMinutes = timeToMinutes(slotTime);
  const in1 = timeToMinutes(dayData.in1);
  const out1 = timeToMinutes(dayData.out1);
  const in2 = timeToMinutes(dayData.in2);
  const out2 = timeToMinutes(dayData.out2);

  const inFirstShift = in1 !== null && out1 !== null && slotMinutes >= in1 && slotMinutes < out1;
  const inSecondShift = in2 !== null && out2 !== null && slotMinutes >= in2 && slotMinutes < out2;

  return inFirstShift || inSecondShift;
};

export default function Modelli({ users = [], templates = [], timePresets = [], onAddTemplate, onUpdateTemplate, onDeleteTemplate, onAddTimePreset, onUpdateTimePreset, onDeleteTimePreset }) {
  const collaborators = useMemo(() => (users || []).filter(u => u.collaboratore), [users]);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [presetForm, setPresetForm] = useState({ in1: "", out1: "", in2: "", out2: "" });
  const [drafts, setDrafts] = useState({});
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(null); // Template attualmente aperto/in modifica
  const [scrollButtonAnimating, setScrollButtonAnimating] = useState(false);
  const previewRef = useRef(null);
  const containerRef = useRef(null);
  const resizerRef = useRef(null);
  const [delta, setDelta] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startDeltaRef = useRef(0);

  const scrollPreviewToBottom = () => {
    if (previewRef.current) {
      setScrollButtonAnimating(true);
      setTimeout(() => setScrollButtonAnimating(false), 600);
      previewRef.current.scrollTo({
        top: previewRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const calculateWeeklyHours = (username) => {
    const draft = drafts[activeTemplateIndex];
    if (!draft) return 0;
    
    let totalMinutes = 0;
    days.forEach((day) => {
      const cell = draft.grid?.[username]?.[day.key];
      if (cell && cell.in1 && cell.out1) {
        const timeToMinutes = (time) => {
          const [h, m] = time.split(':').map(Number);
          return h * 60 + m;
        };
        totalMinutes += timeToMinutes(cell.out1) - timeToMinutes(cell.in1);
      }
      if (cell && cell.in2 && cell.out2) {
        const timeToMinutes = (time) => {
          const [h, m] = time.split(':').map(Number);
          return h * 60 + m;
        };
        totalMinutes += timeToMinutes(cell.out2) - timeToMinutes(cell.in2);
      }
    });
    
    return totalMinutes / 60;
  };

  useEffect(() => {
    const initial = {};
    templates.forEach((t, i) => {
      initial[i] = JSON.parse(JSON.stringify(t));
    });
    setDrafts(initial);
  }, [templates]);

  useEffect(() => {
    const onMove = (e) => {
      if (!draggingRef.current) return;
      const clientY = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY);
      if (clientY == null) return;
      const dy = clientY - startYRef.current;
      const container = containerRef.current;
      const max = container ? Math.max(50, Math.floor(container.clientHeight / 2 - 60)) : 300;
      let next = startDeltaRef.current + dy;
      if (next > max) next = max;
      if (next < -max) next = -max;
      setDelta(next);
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    // cleanup on unmount
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, []);

  const startDrag = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY ?? (e.touches && e.touches[0] && e.touches[0].clientY) ?? 0;
    startDeltaRef.current = delta;
    document.addEventListener('mousemove', (ev) => {
      const moveEvent = ev;
      if (!draggingRef.current) return;
      const clientY = moveEvent.clientY;
      const dy = clientY - startYRef.current;
      const container = containerRef.current;
      const max = container ? Math.max(50, Math.floor(container.clientHeight / 2 - 60)) : 300;
      let next = startDeltaRef.current + dy;
      if (next > max) next = max;
      if (next < -max) next = -max;
      setDelta(next);
    });
    document.addEventListener('mouseup', () => { draggingRef.current = false; });
    // touch
    document.addEventListener('touchmove', (ev) => {
      if (!draggingRef.current) return;
      const touch = ev.touches && ev.touches[0];
      if (!touch) return;
      const clientY = touch.clientY;
      const dy = clientY - startYRef.current;
      const container = containerRef.current;
      const max = container ? Math.max(50, Math.floor(container.clientHeight / 2 - 60)) : 300;
      let next = startDeltaRef.current + dy;
      if (next > max) next = max;
      if (next < -max) next = -max;
      setDelta(next);
    }, { passive: false });
    document.addEventListener('touchend', () => { draggingRef.current = false; });
  };

  const handleCreate = () => {
    const name = prompt("Nome del nuovo modello:");
    if (!name || !name.trim()) return;
    const tpl = {
      id: `${Date.now()}`,
      name: name.trim(),
      grid: makeEmptyGrid(collaborators),
      createdAt: new Date().toISOString(),
    };
    onAddTemplate(tpl);
  };

  const updateCell = (templateIndex, rowKey, dayKey, field, value) => {
    setDrafts((prev) => {
      const next = { ...prev };
      if (!next[templateIndex]) return prev;
      next[templateIndex] = JSON.parse(JSON.stringify(next[templateIndex]));
      next[templateIndex].grid[rowKey][dayKey][field] = value;
      return next;
    });
  };

  const saveChanges = (index) => {
    if (!drafts[index]) return;
    onUpdateTemplate(index, drafts[index]);
  };

  const renameTemplate = (index, name) => {
    setDrafts((prev) => {
      const next = { ...prev };
      if (!next[index]) return prev;
      next[index] = { ...next[index], name };
      return next;
    });
  };

  const handleAddPreset = () => {
    const { in1, out1, in2, out2 } = presetForm;
    if (!in1 || !out1) return;
    onAddTimePreset({ id: `${Date.now()}`, in1, out1, in2, out2 });
    setPresetForm({ in1: "", out1: "", in2: "", out2: "" });
  };

  const applyPreset = (templateIndex, rowKey, dayKey, presetId) => {
    const preset = timePresets.find(p => p.id === presetId);
    if (!preset) return null;
    
    // Calcola il nuovo draft senza aspettare lo stato
    const currentDraft = drafts[templateIndex];
    if (!currentDraft) return null;
    
    const newDraft = JSON.parse(JSON.stringify(currentDraft));
    newDraft.grid[rowKey][dayKey].in1 = preset.in1;
    newDraft.grid[rowKey][dayKey].out1 = preset.out1;
    newDraft.grid[rowKey][dayKey].in2 = preset.in2;
    newDraft.grid[rowKey][dayKey].out2 = preset.out2;
    
    // Aggiorna lo stato locale
    setDrafts((prev) => {
      const next = { ...prev };
      next[templateIndex] = newDraft;
      return next;
    });
    
    return newDraft;
  };

  return (
    <div style={{ paddingTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2>📋 Modelli ({templates.length})</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setShowPresetManager(!showPresetManager)}
            style={{ padding: "8px 12px", borderRadius: "12px", background: "var(--button-bg)", color: "var(--button-text)", border: "none" }}
          >
            ⏱️ Preset Orari
          </button>
          <button
            onClick={handleCreate}
            style={{ padding: "8px 12px", borderRadius: "12px", background: "var(--button-bg)", color: "var(--button-text)", border: "none" }}
          >
            ➕ Crea Modello
          </button>
        </div>
      </div>

      {/* Preset Manager Modal */}
      {showPresetManager && (
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
              zIndex: 1000 
            }}
            onClick={() => setShowPresetManager(false)}
          />
          <div style={{ 
            position: "fixed", 
            top: "50%", 
            left: "50%", 
            transform: "translate(-50%, -50%)",
            background: "var(--modal-bg)", 
            padding: "24px", 
            borderRadius: "12px", 
            border: "1px solid var(--border-color)",
            zIndex: 1001,
            minWidth: "400px",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <h4 style={{ marginTop: 0 }}>⏱️ Gestione Preset Orari</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
              <input type="time" placeholder="Entrata 1" value={presetForm.in1} onChange={(e) => setPresetForm({ ...presetForm, in1: e.target.value })} style={{ padding: "8px" }} />
              <input type="time" placeholder="Uscita 1" value={presetForm.out1} onChange={(e) => setPresetForm({ ...presetForm, out1: e.target.value })} style={{ padding: "8px" }} />
              <input type="time" placeholder="Entrata 2" value={presetForm.in2} onChange={(e) => setPresetForm({ ...presetForm, in2: e.target.value })} style={{ padding: "8px" }} />
              <input type="time" placeholder="Uscita 2" value={presetForm.out2} onChange={(e) => setPresetForm({ ...presetForm, out2: e.target.value })} style={{ padding: "8px" }} />
            </div>
            <button onClick={handleAddPreset} style={{ padding: "8px 12px", borderRadius: "8px", background: "var(--button-bg)", color: "var(--button-text)", border: "none", width: "100%", marginBottom: "16px" }}>➕ Aggiungi Preset</button>
            
            <h5 style={{ marginBottom: "8px" }}>Preset Salvati:</h5>
            {timePresets.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Nessun preset creato.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[...timePresets].sort((a, b) => {
                  const in1Cmp = (a.in1 || "").localeCompare(b.in1 || "");
                  if (in1Cmp !== 0) return in1Cmp;
                  return (a.out1 || "").localeCompare(b.out1 || "");
                }).map((p) => {
                  const originalIndex = timePresets.findIndex(preset => preset.id === p.id);
                  return (
                  <li key={p.id || originalIndex} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", borderBottom: "1px solid var(--border-color)" }}>
                    <span>{p.in1}-{p.out1}{p.in2 ? ` / ${p.in2}-${p.out2}` : ""}</span>
                    <button onClick={() => onDeleteTimePreset(originalIndex)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "18px" }}>🗑️</button>
                  </li>
                  );
                })}
              </ul>
            )}
            <button onClick={() => setShowPresetManager(false)} style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(0,0,0,0.1)", border: "none", width: "100%" }}>Chiudi</button>
          </div>
        </>
      )}

      {/* Lista Modelli Impilati */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {templates.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", fontSize: "18px", marginTop: "50px" }}>
            Nessun modello. Clicca "Crea Modello" per iniziare!
          </p>
        ) : (
          <>
            {/* Contenitore diviso in due se c'è un template attivo */}
            <div ref={containerRef} style={{ 
              display: activeTemplateIndex !== null ? 'grid' : 'flex',
              gridTemplateRows: activeTemplateIndex !== null ? `calc(1fr - ${delta}px) calc(1fr + ${delta}px)` : 'auto',
              flexDirection: 'column',
              gap: '8px',
              height: activeTemplateIndex !== null ? 'calc(100vh - 200px)' : 'auto'
            }}>
              {/* Parte superiore: Lista template */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '24px',
                overflowY: 'auto',
                minHeight: 0,
                paddingBottom: '10px'
              }}>
                {templates.map((t, index) => {
            const draft = drafts[index] || t;
            return (
              <div key={t.id || index} style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "var(--table-header-bg)", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                    <button 
                      onClick={() => setActiveTemplateIndex(prev => prev === index ? null : index)}
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", outline: "none" }}
                    >
                      <img 
                        src={import.meta.env.BASE_URL + 'chevron.right.png'} 
                        alt="toggle" 
                        style={{ width: "16px", height: "16px", objectFit: "contain", transform: activeTemplateIndex === index ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                      />
                    </button>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => renameTemplate(index, e.target.value)}
                      style={{ padding: "8px", borderRadius: "12px", border: "1px solid var(--input-border)", minWidth: "280px", background: "var(--input-bg)" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => onDeleteTemplate(index)} style={{ padding: "8px 12px", borderRadius: "12px", background: "rgba(231, 76, 60, 0.3)", color: "#e74c3c", border: "1px solid #e74c3c" }}>🗑️ Elimina</button>
                  </div>
                </div>
                {activeTemplateIndex === index && (
                <div style={{ display: "flex" }}>
                  {/* Tabella Collaboratori - Fissa */}
                  <div style={{ flex: "0 0 auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", borderRadius: "0" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--table-header-bg)", color: "var(--table-header-text)", height: "40px" }}>
                          <th style={{ padding: "10px", textAlign: "left", minWidth: "200px" }}>Collaboratore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collaborators.map((u) => {
                          const rk = rowKeyForUser(u);
                          const weeklyHours = calculateWeeklyHours(rk);
                          const contractHours = u.oreContratto || 40;
                          const percentage = (weeklyHours / contractHours) * 100;
                          
                          return (
                            <tr key={rk} style={{ backgroundColor: "var(--table-row-bg)", height: "70px" }}>
                              <td style={{ 
                                padding: "8px", 
                                borderBottom: "1px solid var(--table-border)",
                                verticalAlign: "top"
                              }}>
                                <div style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "500", fontSize: "13px" }}>
                                  <span>{u.nome} {u.cognome}</span>
                                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                                    {weeklyHours.toFixed(1)}h / {contractHours}h
                                  </span>
                                </div>
                                <div style={{
                                  width: "100%",
                                  height: "6px",
                                  backgroundColor: "rgba(0,0,0,0.1)",
                                  borderRadius: "12px",
                                  overflow: "hidden"
                                }}>
                                  <div style={{
                                    height: "100%",
                                    width: `${Math.min(percentage, 100)}%`,
                                    backgroundColor: percentage > 100 ? "#e74c3c" : percentage > 90 ? "#27ae60" : "#f39c12",
                                    transition: "width 0.3s ease"
                                  }}></div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Tabella Giorni - Scrollabile */}
                  <div style={{ flex: "1 1 auto", overflowX: "auto" }}>
                    <table style={{ borderCollapse: "collapse", width: "100%", borderRadius: "0" }}>
                      <thead>
                        <tr style={{ backgroundColor: "var(--table-header-bg)", color: "var(--table-header-text)", height: "40px" }}>
                          {days.map((d) => (
                            <th key={d.key} style={{ padding: "10px", textAlign: "left", minWidth: "240px" }}>{d.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {collaborators.map((u, idx) => {
                          const rk = rowKeyForUser(u);
                          return (
                            <tr key={rk} style={{ backgroundColor: "var(--table-row-bg)", height: "70px" }}>
                              {days.map((d, dayIndex) => {
                                const cell = draft.grid?.[rk]?.[d.key] || emptyCell();
                                
                                // Trova il preset corrispondente agli orari salvati
                                const getMatchingPresetId = () => {
                                  if (!cell.in1 || !cell.out1) return "";
                                  const matchingPreset = timePresets.find(p => 
                                    p.in1 === cell.in1 && 
                                    p.out1 === cell.out1 && 
                                    p.in2 === cell.in2 && 
                                    p.out2 === cell.out2
                                  );
                                  return matchingPreset?.id || "";
                                };
                                
                                const handleSelectChange = (e) => {
                                  const presetId = e.target.value;
                                  console.log("✅ È stata fatta una modifica a questo select", { index, rk, dayKey: d.key, presetId });
                                  
                                  if (presetId) {
                                    const updatedDraft = applyPreset(index, rk, d.key, presetId);
                                    
                                    // Salva le modifiche direttamente con il draft aggiornato
                                    if (updatedDraft) {
                                      onUpdateTemplate(index, updatedDraft);
                                    }
                                    
                                    // Scroll alla visualizzazione Gantt corrispondente
                                    setTimeout(() => {
                                      const ganttRowSelector = `tr[data-gantt-row="${rk}"][data-gantt-day="${d.key}"]`;
                                      const ganttRow = document.querySelector(ganttRowSelector);
                                      if (ganttRow) {
                                        ganttRow.scrollIntoView({ behavior: "smooth", block: "center" });
                                        console.log("📊 Scrollato alla visualizzazione Gantt per", rk, d.key);
                                      }
                                    }, 100);
                                    
                                    setTimeout(() => {
                                      let nextDayIndex = dayIndex + 1;
                                      let nextRowIndex = idx;
                                      
                                      console.log("Indici attuali:", { dayIndex, idx, nextDayIndex, nextRowIndex });
                                      
                                      if (nextDayIndex >= days.length) {
                                        nextDayIndex = 0;
                                        nextRowIndex = idx + 1;
                                        console.log("Raggiunta fine settimana, resetto:", { nextDayIndex, nextRowIndex });
                                      }
                                      
                                      console.log("Collaboratori disponibili:", collaborators.length, "Indice prossimo:", nextRowIndex);
                                      
                                      if (nextRowIndex < collaborators.length) {
                                        const selector = `select[data-template-index="${index}"][data-row-key="${rowKeyForUser(collaborators[nextRowIndex])}"][data-day-key="${days[nextDayIndex].key}"]`;
                                        console.log("Cerco il prossimo select con selector:", selector);
                                        
                                        const nextSelect = document.querySelector(selector);
                                        if (nextSelect) {
                                          console.log("✅ Trovato! Focusso il prossimo select:", days[nextDayIndex].key, "per", collaborators[nextRowIndex].nome);
                                          nextSelect.focus();
                                          nextSelect.scrollIntoView({ behavior: "smooth", block: "center" });
                                        } else {
                                          console.warn("❌ Select non trovato con questo selector");
                                        }
                                      } else {
                                        console.log("Fine della lista collaboratori");
                                      }
                                    }, 50);
                                  } else {
                                    // Rimuovi il preset (ripristina i campi vuoti)
                                    const currentDraft = drafts[index];
                                    if (currentDraft) {
                                      const newDraft = JSON.parse(JSON.stringify(currentDraft));
                                      newDraft.grid[rk][d.key] = emptyCell();
                                      setDrafts((prev) => {
                                        const next = { ...prev };
                                        next[index] = newDraft;
                                        return next;
                                      });
                                      // Salva le modifiche
                                      onUpdateTemplate(index, newDraft);
                                    }
                                    console.log("🗑️ Rimosso preset, cella ripristinata a vuoto");
                                  }
                                };
                                
                                return (
                                  <td key={d.key} style={{ padding: "6px", borderBottom: "1px solid var(--table-border)", verticalAlign: "middle" }}>
                                    <select
                                      data-template-index={index}
                                      data-row-key={rk}
                                      data-day-key={d.key}
                                      onChange={handleSelectChange}
                                      style={{ width: "100%", padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--input-border)" }}
                                      value={getMatchingPresetId()}
                                    >
                                      <option value="">-</option>
                                      {[...timePresets].sort((a, b) => {
                                        const in1Cmp = (a.in1 || "").localeCompare(b.in1 || "");
                                        if (in1Cmp !== 0) return in1Cmp;
                                        return (a.out1 || "").localeCompare(b.out1 || "");
                                      }).map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.in1}-{p.out1}{p.in2 ? ` / ${p.in2}-${p.out2}` : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </div>

              {/* Resizer between top and bottom panes */}
              {activeTemplateIndex !== null && (
                <div className="row-resizer" ref={resizerRef}
                  onMouseDown={(e) => startDrag(e)}
                  onTouchStart={(e) => startDrag(e.touches[0])}
                >
                  <div className="row-resizer-handle" title="Ridimensiona" />
                </div>
              )}
            );
          })}
              </div>

              {/* Parte inferiore: Visualizzazione Gantt in tempo reale */}
              {activeTemplateIndex !== null && drafts[activeTemplateIndex] && (
                <div 
                  ref={previewRef}
                  style={{ 
                    borderTop: '3px solid var(--border-color)',
                    paddingTop: '20px',
                    overflowY: 'auto',
                    position: 'relative'
                  }}
                >
                  <h3 style={{ 
                    marginBottom: '16px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📊 Anteprima in tempo reale
                  </h3>
                  
                  {days.map((day) => {
                    const timeSlots = generateTimeSlots();
                    const draft = drafts[activeTemplateIndex];
                    
                    // Ordina collaboratori per posizione
                    const sortedCollaborators = [...collaborators].sort((a, b) => {
                      const posOrder = { "cucina": 0, "sala": 1, "bar": 2 };
                      const orderA = posOrder[a.posizione] ?? 1;
                      const orderB = posOrder[b.posizione] ?? 1;
                      if (orderA !== orderB) return orderA - orderB;
                      return a.username.localeCompare(b.username);
                    });

                    return (
                      <div key={day.key} style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h4 style={{ 
                            backgroundColor: 'var(--button-bg)', 
                            color: 'var(--button-text)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            margin: 0,
                            fontSize: '13px'
                          }}>
                            {day.label}
                          </h4>
                          <div style={{
                            backgroundColor: '#27ae60',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '13px'
                          }}>
                            Totale: {(() => {
                              const totalMinutes = sortedCollaborators.reduce((sum, u) => {
                                const rk = rowKeyForUser(u);
                                const in1 = draft.grid?.[rk]?.[day.key]?.in1;
                                const out1 = draft.grid?.[rk]?.[day.key]?.out1;
                                const in2 = draft.grid?.[rk]?.[day.key]?.in2;
                                const out2 = draft.grid?.[rk]?.[day.key]?.out2;
                                const timeToMinutes = (time) => {
                                  if (!time) return 0;
                                  const [h, m] = time.split(':').map(Number);
                                  return h * 60 + m;
                                };
                                let dayMinutes = 0;
                                if (in1 && out1) dayMinutes += timeToMinutes(out1) - timeToMinutes(in1);
                                if (in2 && out2) dayMinutes += timeToMinutes(out2) - timeToMinutes(in2);
                                return sum + dayMinutes;
                              }, 0);
                              const hours = Math.floor(totalMinutes / 60);
                              const minutes = totalMinutes % 60;
                              return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                            })()}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex' }}>
                          {/* Tabella Collaboratori - Fissa */}
                          <div style={{ flex: '0 0 auto' }}>
                            <table style={{
                              borderCollapse: 'collapse',
                              fontSize: '11px',
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '0'
                            }}>
                              <thead>
                                <tr>
                                  <th style={{
                                    backgroundColor: 'var(--table-header-bg)',
                                    color: 'var(--button-text)',
                                    padding: '6px',
                                    border: '1px solid var(--border-color)',
                                    minWidth: '140px',
                                    height: '32px',
                                    fontSize: '10px'
                                  }}>
                                    Collaboratore
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedCollaborators.map((u, idx) => {
                                  const rk = rowKeyForUser(u);
                                  const displayName = `${u.nome} ${u.cognome}`;
                                  
                                  return (
                                    <tr key={rk} style={{ height: '28px' }}>
                                      <td style={{
                                        backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                                        padding: '6px',
                                        border: '1px solid var(--border-color)',
                                        fontWeight: '500',
                                        minWidth: '140px',
                                        verticalAlign: 'middle',
                                        fontSize: '10px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }}>
                                        {displayName}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Tabella Orari - Scrollabile */}
                          <div style={{ flex: '1 1 auto', overflowX: 'auto' }}>
                            <table style={{
                              borderCollapse: 'collapse',
                              fontSize: '11px',
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              width: '100%',
                              borderRadius: '0'
                            }}>
                              <thead>
                                <tr>
                                  {timeSlots.map(slot => (
                                    <th key={slot} style={{
                                      backgroundColor: 'var(--table-header-bg)',
                                      color: 'var(--button-text)',
                                      padding: '6px 3px',
                                      border: '1px solid var(--border-color)',
                                      minWidth: '30px',
                                      height: '32px',
                                      fontSize: '9px'
                                    }}>
                                      {slot.endsWith(':00') ? slot : '·'}
                                    </th>
                                  ))}
                                  <th style={{
                                    backgroundColor: 'var(--table-header-bg)',
                                    color: 'var(--button-text)',
                                    padding: '6px 3px',
                                    border: '1px solid var(--border-color)',
                                    minWidth: '50px',
                                    height: '32px',
                                    fontSize: '9px',
                                    fontWeight: 'bold'
                                  }}>
                                    Ore
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedCollaborators.map((u, idx) => {
                                  const rk = rowKeyForUser(u);
                                  
                                  return (
                                    <tr key={rk} style={{ height: '28px' }} data-gantt-row={rk} data-gantt-day={day.key}>
                                      {timeSlots.map((slot, slotIndex) => {
                                        const working = isWorking(draft.grid, rk, day.key, slot);
                                        const prevWorking = slotIndex > 0 && isWorking(draft.grid, rk, day.key, timeSlots[slotIndex - 1]);
                                        const nextWorking = slotIndex < timeSlots.length - 1 && isWorking(draft.grid, rk, day.key, timeSlots[slotIndex + 1]);
                                        
                                        const posizione = u?.posizione || "sala";
                                        let barColor = '#5AC8FA';
                                        if (posizione === "cucina") {
                                          barColor = '#FFA366';
                                        } else if (posizione === "bar") {
                                          barColor = '#C084FC';
                                        }
                                        
                                        let borderRadius = '0px';
                                        if (working) {
                                          const topLeft = !prevWorking ? '10px' : '0px';
                                          const bottomLeft = !prevWorking ? '10px' : '0px';
                                          const topRight = !nextWorking ? '10px' : '0px';
                                          const bottomRight = !nextWorking ? '10px' : '0px';
                                          borderRadius = `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
                                        }
                                        
                                        return (
                                          <td key={slot} 
                                            onClick={() => {
                                              // Scorre al select corrispondente
                                              const selector = `select[data-template-index="${activeTemplateIndex}"][data-row-key="${rk}"][data-day-key="${day.key}"]`;
                                              const select = document.querySelector(selector);
                                              if (select) {
                                                select.focus();
                                                select.scrollIntoView({ behavior: "smooth", block: "center" });
                                                // Animazione highlight
                                                select.style.transition = "all 0.3s ease";
                                                select.style.backgroundColor = "#ffeb3b";
                                                select.style.boxShadow = "0 0 10px rgba(255, 235, 59, 0.8)";
                                                setTimeout(() => {
                                                  select.style.backgroundColor = "";
                                                  select.style.boxShadow = "";
                                                }, 600);
                                              }
                                            }}
                                            style={{
                                            backgroundColor: working 
                                              ? barColor
                                              : (idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)'),
                                            borderTop: '1px solid var(--border-color)',
                                            borderBottom: '1px solid var(--border-color)',
                                            borderLeft: slotIndex === 0 || (!prevWorking && working) ? '1px solid var(--border-color)' : 'none',
                                            borderRight: nextWorking && working ? 'none' : '1px solid var(--border-color)',
                                            padding: '3px',
                                            textAlign: 'center',
                                            borderRadius: borderRadius,
                                            verticalAlign: 'middle',
                                            cursor: working ? 'pointer' : 'default',
                                            transition: 'opacity 0.2s ease'
                                          }}
                                            onMouseEnter={(e) => {
                                              if (working) e.target.style.opacity = '0.8';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.opacity = '1';
                                            }}>
                                          </td>
                                        );
                                      })}
                                      <td style={{
                                        backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                                        border: '1px solid var(--border-color)',
                                        padding: '3px 6px',
                                        textAlign: 'center',
                                        minWidth: '50px',
                                        fontWeight: 'bold',
                                        fontSize: '10px',
                                        verticalAlign: 'middle',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {calculateHours(
                                          draft.grid?.[rk]?.[day.key]?.in1,
                                          draft.grid?.[rk]?.[day.key]?.out1,
                                          draft.grid?.[rk]?.[day.key]?.in2,
                                          draft.grid?.[rk]?.[day.key]?.out2
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Riepilogo settimanale */}
                  {(() => {
                    const draft = drafts[activeTemplateIndex];
                    const sortedCollaborators = [...collaborators].sort((a, b) => {
                      const posOrder = { "cucina": 0, "sala": 1, "bar": 2 };
                      const orderA = posOrder[a.posizione] ?? 1;
                      const orderB = posOrder[b.posizione] ?? 1;
                      if (orderA !== orderB) return orderA - orderB;
                      return a.username.localeCompare(b.username);
                    });

                    return (
                  <div style={{ borderTop: '3px solid var(--border-color)', paddingTop: '20px' }}>
                    <h3 style={{ marginBottom: '16px' }}>📊 Riepilogo ore settimanali</h3>
                    <div style={{ display: 'flex' }}>
                      <div style={{ flex: '0 0 auto' }}>
                        <table style={{
                          borderCollapse: 'collapse',
                          fontSize: '11px',
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0'
                        }}>
                          <thead>
                            <tr>
                              <th style={{
                                backgroundColor: 'var(--table-header-bg)',
                                color: 'var(--button-text)',
                                padding: '8px',
                                border: '1px solid var(--border-color)',
                                minWidth: '160px',
                                textAlign: 'left'
                              }}>
                                Collaboratore
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedCollaborators.map((u, idx) => (
                              <tr key={u.username} style={{ height: '36px' }}>
                                <td style={{
                                  backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                                  padding: '8px',
                                  border: '1px solid var(--border-color)',
                                  fontWeight: '500',
                                  verticalAlign: 'middle'
                                }}>
                                  {u.nome} {u.cognome}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div style={{ flex: '1 1 auto', overflowX: 'auto' }}>
                        <table style={{
                          borderCollapse: 'collapse',
                          fontSize: '11px',
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '0',
                          width: '100%'
                        }}>
                          <thead>
                            <tr>
                              {days.map(d => (
                                <th key={d.key} style={{
                                  backgroundColor: 'var(--table-header-bg)',
                                  color: 'var(--button-text)',
                                  padding: '8px',
                                  border: '1px solid var(--border-color)',
                                  minWidth: '80px',
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '10px'
                                }}>
                                  {d.label}
                                </th>
                              ))}
                              <th style={{
                                backgroundColor: 'var(--table-header-bg)',
                                color: 'var(--button-text)',
                                padding: '8px',
                                border: '1px solid var(--border-color)',
                                minWidth: '80px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '10px',
                                backgroundColor: '#27ae60'
                              }}>
                                TOTALE
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedCollaborators.map((u, idx) => {
                              const rk = rowKeyForUser(u);
                              return (
                                <tr key={u.username} style={{ height: '36px' }}>
                                  {days.map(d => {
                                    const in1 = draft.grid?.[rk]?.[d.key]?.in1;
                                    const out1 = draft.grid?.[rk]?.[d.key]?.out1;
                                    const in2 = draft.grid?.[rk]?.[d.key]?.in2;
                                    const out2 = draft.grid?.[rk]?.[d.key]?.out2;
                                    return (
                                      <td key={d.key} style={{
                                        backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                                        border: '1px solid var(--border-color)',
                                        padding: '8px',
                                        textAlign: 'center',
                                        fontWeight: '500',
                                        fontSize: '10px',
                                        verticalAlign: 'middle',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {calculateHours(in1, out1, in2, out2)}
                                      </td>
                                    );
                                  })}
                                  <td style={{
                                    backgroundColor: idx % 2 === 0 ? 'rgba(39, 174, 96, 0.2)' : 'rgba(39, 174, 96, 0.15)',
                                    border: '1px solid var(--border-color)',
                                    padding: '8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '10px',
                                    verticalAlign: 'middle',
                                    color: '#27ae60'
                                  }}>
                                    {(() => {
                                      const totalMinutes = days.reduce((sum, d) => {
                                        const in1 = draft.grid?.[rk]?.[d.key]?.in1;
                                        const out1 = draft.grid?.[rk]?.[d.key]?.out1;
                                        const in2 = draft.grid?.[rk]?.[d.key]?.in2;
                                        const out2 = draft.grid?.[rk]?.[d.key]?.out2;
                                        const timeToMinutes = (time) => {
                                          if (!time) return 0;
                                          const [h, m] = time.split(':').map(Number);
                                          return h * 60 + m;
                                        };
                                        let dayMinutes = 0;
                                        if (in1 && out1) dayMinutes += timeToMinutes(out1) - timeToMinutes(in1);
                                        if (in2 && out2) dayMinutes += timeToMinutes(out2) - timeToMinutes(in2);
                                        return sum + dayMinutes;
                                      }, 0);
                                      const hours = Math.floor(totalMinutes / 60);
                                      const minutes = totalMinutes % 60;
                                      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                    );
                  })()}
                  
                  {/* Pulsante scroll to bottom */}
                  <button
                    onClick={scrollPreviewToBottom}
                    style={{
                      position: 'fixed',
                      bottom: '20px',
                      right: '20px',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--button-bg)',
                      color: 'var(--button-text)',
                      border: 'none',
                      fontSize: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      zIndex: '1000',
                      transition: 'all 0.2s ease',
                      animation: scrollButtonAnimating ? 'scrollBounce 0.6s ease' : 'none'
                    }}
                    title="Scorri in basso"
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
