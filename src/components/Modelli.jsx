import { useEffect, useMemo, useState, useRef } from "react";
import GanttViewer from "./GanttViewer";
import { saveState } from "../config/firebaseUtils";

// Stili per animazioni
const scrollButtonAnimationStyle = `
  @keyframes scrollBounce {
    0% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-8px) scale(1.1); }
    100% { transform: translateY(0) scale(1); }
  }
`;

const styleSheet = document.createElement("style");
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
    console.warn(
      `⚠️ Collaboratore "${u?.nome} ${u?.cognome}" non ha username valido`,
    );
    // Fallback sicuro: nome+cognome per debugging
    const normalize = (s) =>
      (s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
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
    days.forEach((d) => {
      grid[key][d.key] = emptyCell();
    });
  });
  return grid;
}

export default function Modelli({
  users = [],
  templates = [],
  timePresets = [],
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onAddTimePreset,
  onUpdateTimePreset,
  onDeleteTimePreset,
}) {
  const collaborators = useMemo(
    () => (users || []).filter((u) => u.collaboratore),
    [users],
  );
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [presetForm, setPresetForm] = useState({
    in1: "",
    out1: "",
    in2: "",
    out2: "",
  });
  const [drafts, setDrafts] = useState({});
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(null); // Template attualmente aperto/in modifica
  const [scrollButtonAnimating, setScrollButtonAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [accumulatedDeltaY, setAccumulatedDeltaY] = useState(0);
  const containerHeight =
    activeTemplateIndex !== null ? window.innerHeight - 200 : 0;
  const totalDelta = accumulatedDeltaY + dragDeltaY;
  const topHeight = Math.max(50, containerHeight / 2 + (totalDelta / 2) * 2);
  const bottomHeight = Math.max(50, containerHeight / 2 - (totalDelta / 2) * 2);
  const previewRef = useRef(null);
  const [previewSelectedDay, setPreviewSelectedDay] = useState(days[0].key);
  const templatesListRef = useRef(null);
  const itemRefs = useRef({});
  const daysTableHeaderRef = useRef(null);
  const daysTableBodyRef = useRef(null);
  const daysScrollSyncRef = useRef({ rafId: 0, skipEl: null });

  const scrollPreviewToBottom = () => {
    if (previewRef.current) {
      setScrollButtonAnimating(true);
      setTimeout(() => setScrollButtonAnimating(false), 600);
      previewRef.current.scrollTo({
        top: previewRef.current.scrollHeight,
        behavior: "smooth",
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
          const [h, m] = time.split(":").map(Number);
          return h * 60 + m;
        };
        totalMinutes += timeToMinutes(cell.out1) - timeToMinutes(cell.in1);
      }
      if (cell && cell.in2 && cell.out2) {
        const timeToMinutes = (time) => {
          const [h, m] = time.split(":").map(Number);
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
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const delta = e.clientY - dragStartY;
      setDragDeltaY(delta);
    };

    const handleMouseUp = () => {
      console.log(
        "🛑 mouseup - final dragDeltaY:",
        dragDeltaY,
        "accumulated:",
        accumulatedDeltaY,
      );
      setAccumulatedDeltaY(accumulatedDeltaY + dragDeltaY);
      setDragDeltaY(0);
      setIsDragging(false);
    };

    if (isDragging) {
      console.log("✅ drag started - dragStartY:", dragStartY);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStartY, dragDeltaY, accumulatedDeltaY]);

  // Auto-scroll to first row of the opened template
  useEffect(() => {
    if (activeTemplateIndex === null) return;
    const container = templatesListRef.current;
    const itemEl = itemRefs.current[activeTemplateIndex];
    if (!container || !itemEl) return;

    // cerca la prima riga della tabella dentro l'item (tbody tr)
    const firstRow = itemEl.querySelector("tbody tr");
    const targetEl = firstRow || itemEl;

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const scrollTop =
      container.scrollTop + (targetRect.top - containerRect.top);

    try {
      container.scrollTo({ top: scrollTop, behavior: "smooth" });
      console.log(
        "⤴️ auto-scroll to",
        scrollTop,
        "for template",
        activeTemplateIndex,
      );
    } catch (err) {
      container.scrollTop = scrollTop;
    }
  }, [activeTemplateIndex]);

  useEffect(() => {
    if (activeTemplateIndex !== null) {
      setPreviewSelectedDay(days[0].key);
    }
  }, [activeTemplateIndex]);

  // Sincronizza lo scroll orizzontale tra header e tabella body (fluido)
  useEffect(() => {
    if (activeTemplateIndex === null) return;

    const timeoutId = setTimeout(() => {
      const headerDiv = daysTableHeaderRef.current;
      const bodyDiv = daysTableBodyRef.current;
      if (!headerDiv || !bodyDiv) return;

      const handleScroll = (sourceEl, targetEl) => {
        const state = daysScrollSyncRef.current;
        if (state.skipEl === sourceEl) {
          state.skipEl = null;
          return;
        }
        if (state.rafId) cancelAnimationFrame(state.rafId);
        state.rafId = requestAnimationFrame(() => {
          state.skipEl = targetEl;
          targetEl.scrollLeft = sourceEl.scrollLeft;
          state.rafId = 0;
        });
      };

      const handleHeaderScroll = () => handleScroll(headerDiv, bodyDiv);
      const handleBodyScroll = () => handleScroll(bodyDiv, headerDiv);

      headerDiv.addEventListener("scroll", handleHeaderScroll, { passive: true });
      bodyDiv.addEventListener("scroll", handleBodyScroll, { passive: true });

      return () => {
        headerDiv.removeEventListener("scroll", handleHeaderScroll);
        bodyDiv.removeEventListener("scroll", handleBodyScroll);
      };
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [activeTemplateIndex]);

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

  const duplicateTemplate = (index) => {
    const source = drafts[index] || templates[index];
    if (!source) return;
    const cloned = JSON.parse(JSON.stringify(source));
    const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newTemplate = {
      ...cloned,
      id: uniqueId,
      name: `Copia di ${source.name || "Modello"}`,
      createdAt: new Date().toISOString(),
    };
    onAddTemplate(newTemplate);
  };

  const handleAddPreset = () => {
    const { in1, out1, in2, out2 } = presetForm;
    if (!in1 || !out1) return;
    onAddTimePreset({ id: `${Date.now()}`, in1, out1, in2, out2 });
    setPresetForm({ in1: "", out1: "", in2: "", out2: "" });
  };

  const applyPreset = (templateIndex, rowKey, dayKey, presetId) => {
    const preset = timePresets.find((p) => p.id === presetId);
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h2>📋 Modelli ({templates.length})</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setShowPresetManager(!showPresetManager)}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              background: "var(--button-bg)",
              color: "var(--button-text)",
              border: "none",
            }}
          >
            ⏱️ Preset Orari
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: "8px 12px",
              borderRadius: "12px",
              background: "var(--button-bg)",
              color: "var(--button-text)",
              border: "none",
            }}
          >
            ➕ Crea Modello
          </button>
        </div>
      </div>

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
              zIndex: 1000,
            }}
            onClick={() => setShowPresetManager(false)}
          />
          <div
            style={{
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
              overflowY: "auto",
            }}
          >
            <h4 style={{ marginTop: 0 }}>⏱️ Gestione Preset Orari</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              <input
                type="time"
                placeholder="Entrata 1"
                value={presetForm.in1}
                onChange={(e) =>
                  setPresetForm({ ...presetForm, in1: e.target.value })
                }
                style={{ padding: "8px" }}
              />
              <input
                type="time"
                placeholder="Uscita 1"
                value={presetForm.out1}
                onChange={(e) =>
                  setPresetForm({ ...presetForm, out1: e.target.value })
                }
                style={{ padding: "8px" }}
              />
              <input
                type="time"
                placeholder="Entrata 2"
                value={presetForm.in2}
                onChange={(e) =>
                  setPresetForm({ ...presetForm, in2: e.target.value })
                }
                style={{ padding: "8px" }}
              />
              <input
                type="time"
                placeholder="Uscita 2"
                value={presetForm.out2}
                onChange={(e) =>
                  setPresetForm({ ...presetForm, out2: e.target.value })
                }
                style={{ padding: "8px" }}
              />
            </div>
            <button
              onClick={handleAddPreset}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--button-bg)",
                color: "var(--button-text)",
                border: "none",
                width: "100%",
                marginBottom: "16px",
              }}
            >
              ➕ Aggiungi Preset
            </button>

            <h5 style={{ marginBottom: "8px" }}>Preset Salvati:</h5>
            {timePresets.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>
                Nessun preset creato.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[...timePresets]
                  .sort((a, b) => {
                    const in1Cmp = (a.in1 || "").localeCompare(b.in1 || "");
                    if (in1Cmp !== 0) return in1Cmp;
                    return (a.out1 || "").localeCompare(b.out1 || "");
                  })
                  .map((p) => {
                    const originalIndex = timePresets.findIndex(
                      (preset) => preset.id === p.id,
                    );
                    return (
                      <li
                        key={p.id || originalIndex}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px",
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <span>
                          {p.in1}-{p.out1}
                          {p.in2 ? ` / ${p.in2}-${p.out2}` : ""}
                        </span>
                        <button
                          onClick={() => onDeleteTimePreset(originalIndex)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "18px",
                          }}
                        >
                          🗑️
                        </button>
                      </li>
                    );
                  })}
              </ul>
            )}
            <button
              onClick={() => setShowPresetManager(false)}
              style={{
                marginTop: "16px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "rgba(0,0,0,0.1)",
                border: "none",
                width: "100%",
              }}
            >
              Chiudi
            </button>
          </div>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {templates.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "#999",
              fontSize: "18px",
              marginTop: "50px",
            }}
          >
            Nessun modello. Clicca "Crea Modello" per iniziare!
          </p>
        ) : (
          <>
            {/* Contenitore diviso in due se c'è un template attivo */}
            <div
              style={{
                display: activeTemplateIndex !== null ? "grid" : "flex",
                gridTemplateRows:
                  activeTemplateIndex !== null
                    ? `${topHeight}px auto ${bottomHeight}px`
                    : "auto",
                flexDirection: "column",
                gap: activeTemplateIndex !== null ? "0" : "24px",
                height:
                  activeTemplateIndex !== null ? "calc(100vh - 200px)" : "auto",
              }}
              title={`dragDeltaY: ${dragDeltaY}px - topHeight: ${topHeight}px - bottomHeight: ${bottomHeight}px`}
            >
              {/* Parte superiore: Lista template */}
              <div
                ref={templatesListRef}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                  overflowY: "auto",
                  minHeight: 0,
                  paddingBottom: "10px",
                  position: "relative",
                }}
              >
                {templates.map((t, index) => {
                  const draft = drafts[index] || t;
                  return (
                    <div
                      ref={(el) => (itemRefs.current[index] = el)}
                      key={t.id || index}
                      style={{
                        borderRadius: "12px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          background: "var(--table-header-bg)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flex: 1,
                          }}
                        >
                          <button
                            onClick={() =>
                              setActiveTemplateIndex((prev) =>
                                prev === index ? null : index,
                              )
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              outline: "none",
                            }}
                          >
                            <img
                              src={
                                import.meta.env.BASE_URL + "chevron.right.png"
                              }
                              alt="toggle"
                              style={{
                                width: "16px",
                                height: "16px",
                                objectFit: "contain",
                                transform:
                                  activeTemplateIndex === index
                                    ? "rotate(90deg)"
                                    : "rotate(0deg)",
                                transition: "transform 0.2s",
                              }}
                            />
                          </button>
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(e) =>
                              renameTemplate(index, e.target.value)
                            }
                            style={{
                              padding: "8px",
                              borderRadius: "12px",
                              border: "1px solid var(--input-border)",
                              minWidth: "280px",
                              background: "var(--input-bg)",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => duplicateTemplate(index)}
                            title="Duplica"
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "16px",
                              border: "none",
                              background: "rgba(0,0,0,0.18)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={import.meta.env.BASE_URL + "duplica.png"}
                              alt="duplica"
                              style={{ width: "18px", height: "18px" }}
                            />
                          </button>
                          <button
                            onClick={() => onDeleteTemplate(index)}
                            title="Elimina"
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "16px",
                              border: "none",
                              background: "rgba(231, 76, 60, 0.58)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <img
                              src={import.meta.env.BASE_URL + "trash.png"}
                              alt="elimina"
                              style={{ width: "18px", height: "18px" }}
                            />
                          </button>
                        </div>
                      </div>
                      {activeTemplateIndex === index && (
                        <>
                          {/* Header sticky dei giorni */}
                          <div
                            ref={daysTableHeaderRef}
                            style={{
                              position: "sticky",
                              top: 0,
                              zIndex: 1000,
                              background: "var(--table-header-bg)",
                              height: "40px",
                              marginBottom: "-40px",
                              overflowX: "auto",
                              overflowY: "hidden",
                              scrollbarWidth: "none",
                              msOverflowStyle: "none",
                            }}
                          >
                            <style>{`#daysTableHeaderRef::-webkit-scrollbar { display: none; }`}</style>
                            <div style={{ display: "flex" }}>
                              <div
                                style={{ flex: "0 0 auto", minWidth: "220px" }}
                              ></div>
                              <div style={{ flex: "1 1 auto" }}>
                                <table
                                  style={{
                                    borderCollapse: "collapse",
                                    width: "100%",
                                    borderRadius: "0",
                                  }}
                                >
                                  <thead>
                                    <tr
                                      style={{
                                        backgroundColor:
                                          "var(--table-header-bg)",
                                        color: "var(--table-header-text)",
                                        height: "40px",
                                      }}
                                    >
                                      {days.map((d) => (
                                        <th
                                          key={d.key}
                                          style={{
                                            padding: "0 10px",
                                            textAlign: "left",
                                            minWidth: "240px",
                                            height: "40px",
                                            lineHeight: "40px",
                                          }}
                                        >
                                          {d.label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                </table>
                              </div>
                            </div>
                          </div>
                          {/* Corpo delle tabelle */}
                          <div style={{ display: "flex" }}>
                            {/* Tabella Collaboratori - Fissa */}
                            <div style={{ flex: "0 0 auto" }}>
                              <table
                                style={{
                                  borderCollapse: "collapse",
                                  width: "100%",
                                  borderRadius: "0",
                                }}
                              >
                                <thead>
                                  <tr
                                    style={{
                                      backgroundColor: "var(--table-header-bg)",
                                      color: "var(--table-header-text)",
                                      height: "40px",
                                    }}
                                  >
                                    <th
                                      style={{
                                        padding: "0 10px",
                                        textAlign: "left",
                                        minWidth: "200px",
                                        height: "40px",
                                        lineHeight: "40px",
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 1000,
                                        background: "var(--table-header-bg)",
                                      }}
                                    >
                                      Collaboratore
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {collaborators.map((u) => {
                                    const rk = rowKeyForUser(u);
                                    const weeklyHours =
                                      calculateWeeklyHours(rk);
                                    const contractHours = u.oreContratto || 40;
                                    const percentage =
                                      (weeklyHours / contractHours) * 100;

                                    return (
                                      <tr
                                        key={rk}
                                        style={{
                                          backgroundColor:
                                            "var(--table-row-bg)",
                                          height: "70px",
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding: "8px",
                                            borderBottom:
                                              "1px solid var(--table-border)",
                                            verticalAlign: "top",
                                          }}
                                        >
                                          <div
                                            style={{
                                              marginBottom: "4px",
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              fontWeight: "500",
                                              fontSize: "13px",
                                            }}
                                          >
                                            <span>
                                              {u.nome} {u.cognome}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: "11px",
                                                color: "var(--text-secondary)",
                                              }}
                                            >
                                              {weeklyHours.toFixed(1)}h /{" "}
                                              {contractHours}h
                                            </span>
                                          </div>
                                          <div
                                            style={{
                                              width: "100%",
                                              height: "6px",
                                              backgroundColor:
                                                "rgba(0,0,0,0.1)",
                                              borderRadius: "12px",
                                              overflow: "hidden",
                                            }}
                                          >
                                            <div
                                              style={{
                                                height: "100%",
                                                width: `${Math.min(percentage, 100)}%`,
                                                backgroundColor:
                                                  percentage > 100
                                                    ? "#e74c3c"
                                                    : percentage > 90
                                                      ? "#27ae60"
                                                      : "#f39c12",
                                                transition: "width 0.3s ease",
                                              }}
                                            ></div>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Tabella Giorni - Scrollabile */}
                            <div
                              ref={daysTableBodyRef}
                              style={{
                                flex: "1 1 auto",
                                overflowX: "auto",
                                paddingTop: "40px",
                              }}
                            >
                              {/* Corpo della tabella */}
                              <table
                                style={{
                                  borderCollapse: "collapse",
                                  width: "100%",
                                  borderRadius: "0",
                                }}
                              >
                                <tbody>
                                  {collaborators.map((u, idx) => {
                                    const rk = rowKeyForUser(u);
                                    return (
                                      <tr
                                        key={rk}
                                        style={{
                                          backgroundColor:
                                            "var(--table-row-bg)",
                                          height: "70px",
                                        }}
                                      >
                                        {days.map((d, dayIndex) => {
                                          const cell =
                                            draft.grid?.[rk]?.[d.key] ||
                                            emptyCell();

                                          // Trova il preset corrispondente agli orari salvati
                                          const getMatchingPresetId = () => {
                                            if (!cell.in1 || !cell.out1)
                                              return "";
                                            const matchingPreset =
                                              timePresets.find(
                                                (p) =>
                                                  p.in1 === cell.in1 &&
                                                  p.out1 === cell.out1 &&
                                                  p.in2 === cell.in2 &&
                                                  p.out2 === cell.out2,
                                              );
                                            return matchingPreset?.id || "";
                                          };

                                          const handleSelectChange = (e) => {
                                            const presetId = e.target.value;
                                            console.log(
                                              "✅ È stata fatta una modifica a questo select",
                                              {
                                                index,
                                                rk,
                                                dayKey: d.key,
                                                presetId,
                                              },
                                            );

                                            if (presetId) {
                                              const updatedDraft = applyPreset(
                                                index,
                                                rk,
                                                d.key,
                                                presetId,
                                              );

                                              // Salva le modifiche direttamente con il draft aggiornato
                                              if (updatedDraft) {
                                                onUpdateTemplate(
                                                  index,
                                                  updatedDraft,
                                                );
                                              }

                                              // Scroll alla visualizzazione Gantt corrispondente
                                              setTimeout(() => {
                                                const ganttRowSelector = `tr[data-gantt-row="${rk}"][data-gantt-day="${d.key}"]`;
                                                const ganttRow =
                                                  document.querySelector(
                                                    ganttRowSelector,
                                                  );
                                                if (ganttRow) {
                                                  ganttRow.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "center",
                                                  });
                                                  console.log(
                                                    "📊 Scrollato alla visualizzazione Gantt per",
                                                    rk,
                                                    d.key,
                                                  );
                                                }
                                              }, 100);

                                              setTimeout(() => {
                                                let nextDayIndex = dayIndex + 1;
                                                let nextRowIndex = idx;

                                                console.log("Indici attuali:", {
                                                  dayIndex,
                                                  idx,
                                                  nextDayIndex,
                                                  nextRowIndex,
                                                });

                                                if (
                                                  nextDayIndex >= days.length
                                                ) {
                                                  nextDayIndex = 0;
                                                  nextRowIndex = idx + 1;
                                                  console.log(
                                                    "Raggiunta fine settimana, resetto:",
                                                    {
                                                      nextDayIndex,
                                                      nextRowIndex,
                                                    },
                                                  );
                                                }

                                                console.log(
                                                  "Collaboratori disponibili:",
                                                  collaborators.length,
                                                  "Indice prossimo:",
                                                  nextRowIndex,
                                                );

                                                if (
                                                  nextRowIndex <
                                                  collaborators.length
                                                ) {
                                                  const selector = `select[data-template-index="${index}"][data-row-key="${rowKeyForUser(collaborators[nextRowIndex])}"][data-day-key="${days[nextDayIndex].key}"]`;
                                                  console.log(
                                                    "Cerco il prossimo select con selector:",
                                                    selector,
                                                  );

                                                  const nextSelect =
                                                    document.querySelector(
                                                      selector,
                                                    );
                                                  if (nextSelect) {
                                                    console.log(
                                                      "✅ Trovato! Focusso il prossimo select:",
                                                      days[nextDayIndex].key,
                                                      "per",
                                                      collaborators[
                                                        nextRowIndex
                                                      ].nome,
                                                    );
                                                    nextSelect.focus();
                                                    nextSelect.scrollIntoView({
                                                      behavior: "smooth",
                                                      block: "center",
                                                    });
                                                  } else {
                                                    console.warn(
                                                      "❌ Select non trovato con questo selector",
                                                    );
                                                  }
                                                } else {
                                                  console.log(
                                                    "Fine della lista collaboratori",
                                                  );
                                                }
                                              }, 50);
                                            } else {
                                              // Rimuovi il preset (ripristina i campi vuoti)
                                              const currentDraft =
                                                drafts[index];
                                              if (currentDraft) {
                                                const newDraft = JSON.parse(
                                                  JSON.stringify(currentDraft),
                                                );
                                                newDraft.grid[rk][d.key] =
                                                  emptyCell();
                                                setDrafts((prev) => {
                                                  const next = { ...prev };
                                                  next[index] = newDraft;
                                                  return next;
                                                });
                                                // Salva le modifiche
                                                onUpdateTemplate(
                                                  index,
                                                  newDraft,
                                                );
                                              }
                                              console.log(
                                                "🗑️ Rimosso preset, cella ripristinata a vuoto",
                                              );
                                            }
                                          };

                                          return (
                                            <td
                                              key={d.key}
                                              style={{
                                                padding: "6px",
                                                borderBottom:
                                                  "1px solid var(--table-border)",
                                                verticalAlign: "middle",
                                                minWidth: "240px",
                                              }}
                                            >
                                              <select
                                                data-template-index={index}
                                                data-row-key={rk}
                                                data-day-key={d.key}
                                                onChange={(e) => {
                                                  setPreviewSelectedDay(d.key);
                                                  handleSelectChange(e);
                                                }}
                                                onFocus={() => setPreviewSelectedDay(d.key)}
                                                style={{
                                                  width: "100%",
                                                  padding: "6px",
                                                  fontSize: "12px",
                                                  borderRadius: "4px",
                                                  border:
                                                    "1px solid var(--input-border)",
                                                }}
                                                value={getMatchingPresetId()}
                                              >
                                                <option value="">-</option>
                                                {[...timePresets]
                                                  .sort((a, b) => {
                                                    const in1Cmp = (
                                                      a.in1 || ""
                                                    ).localeCompare(
                                                      b.in1 || "",
                                                    );
                                                    if (in1Cmp !== 0)
                                                      return in1Cmp;
                                                    return (
                                                      a.out1 || ""
                                                    ).localeCompare(
                                                      b.out1 || "",
                                                    );
                                                  })
                                                  .map((p) => (
                                                    <option
                                                      key={p.id}
                                                      value={p.id}
                                                    >
                                                      {p.in1}-{p.out1}
                                                      {p.in2
                                                        ? ` / ${p.in2}-${p.out2}`
                                                        : ""}
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
                        </>
                      )}{" "}
                    </div>
                  );
                })}
              </div>

              {/* Divisore con pulsante rotondo */}
              {activeTemplateIndex !== null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "1px",
                    gap: "12px",
                    overflow: "visible",
                    position: "relative",
                    zIndex: 1200,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "var(--border-color)",
                    }}
                  ></div>
                  <button
                    onMouseDown={(e) => {
                      console.log("🖱️ button mousedown at Y:", e.clientY);
                      setIsDragging(true);
                      setDragStartY(e.clientY);
                    }}
                    style={{
                      width: "40px",
                      height: "40px",
                      minWidth: "40px",
                      minHeight: "40px",
                      borderRadius: "50%",
                      border: "2px solid var(--border-color)",
                      background: "var(--button-bg)",
                      cursor: isDragging ? "grabbing" : "grab",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      transition: "all 0.2s ease",
                      padding: 0,
                      outline: "none",
                      position: "relative",
                      zIndex: 1201,
                    }}
                  >
                    <img
                      src={import.meta.env.BASE_URL + "arrow.up.and.down.png"}
                      alt="expand"
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      style={{
                        width: "20px",
                        height: "20px",
                        objectFit: "contain",
                        userSelect: "none",
                        pointerEvents: "none",
                      }}
                    />
                  </button>
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "var(--border-color)",
                    }}
                  ></div>
                </div>
              )}

              {/* Parte inferiore: Visualizzazione Gantt in tempo reale */}
              {activeTemplateIndex !== null && drafts[activeTemplateIndex] && (
                <div
                  ref={previewRef}
                  style={{
                    borderTop: "3px solid var(--border-color)",
                    paddingTop: "0px",
                    overflowY: "auto",
                    position: "relative",
                  }}
                >
                  <h3
                    style={{
                      marginBottom: "16px",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    📊 Anteprima in tempo reale
                  </h3>

                  {(() => {
                    const draft = drafts[activeTemplateIndex];
                    const sortedCollaborators = [...collaborators].sort(
                      (a, b) => {
                        const posOrder = { cucina: 0, sala: 1, bar: 2 };
                        const orderA = posOrder[a.posizione] ?? 1;
                        const orderB = posOrder[b.posizione] ?? 1;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.username.localeCompare(b.username);
                      },
                    );
                    const ganttRows = sortedCollaborators.map((u) => ({
                      key: rowKeyForUser(u),
                      username: u.username,
                      nome: u.nome,
                      cognome: u.cognome,
                      posizione: u.posizione,
                    }));
                    const dayKeys = days.map((d) => d.key);
                    const dayLabelsMap = Object.fromEntries(
                      days.map((d) => [d.key, d.label]),
                    );

                    return (
                      <GanttViewer
                        grid={draft.grid}
                        rows={ganttRows}
                        days={dayKeys}
                        dayLabels={dayLabelsMap}
                        showSummary
                        selectedDay={previewSelectedDay}
                        onSelectedDayChange={setPreviewSelectedDay}
                        onCellClick={({ rowKey, dayKey }) => {
                          const selector = `select[data-template-index="${activeTemplateIndex}"][data-row-key="${rowKey}"][data-day-key="${dayKey}"]`;
                          const select = document.querySelector(selector);
                          if (select) {
                            select.focus();
                            select.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                            select.style.transition = "all 0.3s ease";
                            select.style.backgroundColor = "#ffeb3b";
                            select.style.boxShadow =
                              "0 0 10px rgba(255, 235, 59, 0.8)";
                            setTimeout(() => {
                              select.style.backgroundColor = "";
                              select.style.boxShadow = "";
                            }, 600);
                          }
                        }}
                      />
                    );
                  })()}

                  {/* Pulsante scroll to bottom */}
                  <button
                    onClick={scrollPreviewToBottom}
                    style={{
                      position: "fixed",
                      bottom: "20px",
                      right: "20px",
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: "var(--button-bg)",
                      color: "var(--button-text)",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      zIndex: "1000",
                      transition: "all 0.2s ease",
                      animation: scrollButtonAnimating
                        ? "scrollBounce 0.6s ease"
                        : "none",
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
