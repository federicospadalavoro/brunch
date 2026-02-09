import { useState, useEffect, useMemo } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { saveState, loadState } from "./config/firebaseUtils";
import { initialState } from "./schema/initialState";
import Collaboratori from "./components/Collaboratori";
import Home from "./components/Home";
import Modelli from "./components/Modelli";
import GeneratoreTurni from "./components/GeneratoreTurni";
import ViewTurno from "./components/ViewTurno";
import Timbrature from "./components/Timbrature";
import Presenze from "./components/Presenze";
import Profilo from "./components/Profilo";
import Permessi from "./components/Permessi";
import { sectionsConfig, rolesConfig } from "./config/accessConfig";
import "./App.css";

function App() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // Carica lo stato da Firebase al mount
  useEffect(() => {
    const fetchState = async () => {
      const firebaseState = await loadState();
      if (firebaseState) {
        // Assicurati che users sia un array
        setState({
          ...initialState,
          ...firebaseState,
          users: Array.isArray(firebaseState.users) ? firebaseState.users : [],
          templates: Array.isArray(firebaseState.templates) ? firebaseState.templates : [],
          timePresets: Array.isArray(firebaseState.timePresets) ? firebaseState.timePresets : [],
          generatedShifts: Array.isArray(firebaseState.generatedShifts) ? firebaseState.generatedShifts : [],
          timeEntries: firebaseState.timeEntries || {},
          accessMatrix: firebaseState.accessMatrix || {},
        });
      }
      setLoading(false);
    };
    fetchState();
  }, []);

  // Salva su Firebase ogni volta che lo stato cambia
  useEffect(() => {
    if (!loading) {
      saveState(state);
    }
  }, [state, loading]);

  // GESTIONE USERS
  const addUser = (userData) => {
    setState((prev) => ({
      ...prev,
      users: [...(prev.users || []), userData],
    }));
  };

  const updateUser = (index, userData) => {
    setState((prev) => ({
      ...prev,
      users: (prev.users || []).map((user, i) => (i === index ? userData : user)),
    }));
  };

  const deleteUser = (index) => {
    if (confirm("Sei sicuro di voler eliminare questo collaboratore?")) {
      setState((prev) => ({
        ...prev,
        users: (prev.users || []).filter((_, i) => i !== index),
      }));
    }
  };

  // GESTIONE TEMPLATE MODELLI
  const addTemplate = (templateData) => {
    setState((prev) => ({
      ...prev,
      templates: [...(prev.templates || []), templateData],
    }));
  };

  const updateTemplate = (index, templateData) => {
    setState((prev) => ({
      ...prev,
      templates: (prev.templates || []).map((tpl, i) => (i === index ? templateData : tpl)),
    }));
  };

  const deleteTemplate = (index) => {
    if (confirm("Eliminare questo modello?")) {
      setState((prev) => ({
        ...prev,
        templates: (prev.templates || []).filter((_, i) => i !== index),
      }));
    }
  };

  // GESTIONE PRESET ORARI
  const addTimePreset = (presetData) => {
    setState((prev) => ({
      ...prev,
      timePresets: [...(prev.timePresets || []), presetData],
    }));
  };

  const updateTimePreset = (index, presetData) => {
    setState((prev) => ({
      ...prev,
      timePresets: (prev.timePresets || []).map((p, i) => (i === index ? presetData : p)),
    }));
  };

  const deleteTimePreset = (index) => {
    if (confirm("Eliminare questo preset?")) {
      setState((prev) => ({
        ...prev,
        timePresets: (prev.timePresets || []).filter((_, i) => i !== index),
      }));
    }
  };

  // GESTIONE TURNI GENERATI
  const addGeneratedShift = (shiftData) => {
    setState((prev) => ({
      ...prev,
      generatedShifts: [...(prev.generatedShifts || []), shiftData],
    }));
  };

  const deleteGeneratedShift = (shiftId) => {
    setState((prev) => ({
      ...prev,
      generatedShifts: (prev.generatedShifts || []).filter(s => s.id !== shiftId),
    }));
  };

  const saveTimeEntry = (username, dateKey, inTime, outTime) => {
    setState((prev) => {
      const monthKey = dateKey.slice(0, 7);
      const userEntries = prev.timeEntries?.[username] || {};
      const monthEntries = userEntries[monthKey] || {};
      return {
        ...prev,
        timeEntries: {
          ...prev.timeEntries,
          [username]: {
            ...userEntries,
            [monthKey]: {
              ...monthEntries,
              [dateKey]: { in: inTime || "", out: outTime || "" },
            },
          },
        },
      };
    });
  };

  const setAccessMatrix = (accessMatrix) => {
    setState((prev) => ({
      ...prev,
      accessMatrix,
    }));
  };

  if (loading) return <p>Caricamento...</p>;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
      <AppContent
        state={state}
        addUser={addUser}
        updateUser={updateUser}
        deleteUser={deleteUser}
        addTemplate={addTemplate}
        updateTemplate={updateTemplate}
        deleteTemplate={deleteTemplate}
        addTimePreset={addTimePreset}
        updateTimePreset={updateTimePreset}
        deleteTimePreset={deleteTimePreset}
        addGeneratedShift={addGeneratedShift}
        deleteGeneratedShift={deleteGeneratedShift}
        saveTimeEntry={saveTimeEntry}
        setAccessMatrix={setAccessMatrix}
      />
    </BrowserRouter>
  );
}

function AppContent({ state, addUser, updateUser, deleteUser, addTemplate, updateTemplate, deleteTemplate, addTimePreset, updateTimePreset, deleteTimePreset, addGeneratedShift, deleteGeneratedShift, saveTimeEntry, setAccessMatrix }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const baseUrl = import.meta.env.BASE_URL || "/";
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const currentUser = (state.users || []).find(
    (u) => u.username === loginForm.username,
  );
  const profileInitial = (
    currentUser?.nome?.[0] ||
    currentUser?.username?.[0] ||
    "?"
  ).toUpperCase();
  const userLevel = currentUser?.livelloAmministrazione ?? 0;

  const normalizeAccessMatrix = (matrix) => {
    const next = { ...(matrix || {}) };
    let changed = false;

    rolesConfig.forEach((role) => {
      const roleKey = String(role.id);
      const roleMatrix = { ...(next[roleKey] || {}) };
      sectionsConfig.forEach((section) => {
        if (!section.showInPermissions) return;
        if (roleMatrix[section.id] === undefined) {
          roleMatrix[section.id] = true;
          changed = true;
        }
      });
      next[roleKey] = roleMatrix;
    });

    return { matrix: next, changed };
  };

  const normalizedAccess = useMemo(
    () => normalizeAccessMatrix(state.accessMatrix),
    [state.accessMatrix],
  );

  useEffect(() => {
    if (normalizedAccess.changed && setAccessMatrix) {
      setAccessMatrix(normalizedAccess.matrix);
    }
  }, [normalizedAccess, setAccessMatrix]);

  const canAccess = (sectionId) => {
    const section = sectionsConfig.find((s) => s.id === sectionId);
    if (section?.alwaysAllow) return true;
    if (section?.requiresBoss) return userLevel >= 2;
    const roleMatrix = normalizedAccess.matrix?.[String(userLevel)] || {};
    const allowed = roleMatrix?.[sectionId];
    return allowed ?? true;
  };

  const allowedSections = sectionsConfig.filter(
    (section) => section.showInNav && canAccess(section.id),
  );
  const allowedMenuSections = sectionsConfig.filter(
    (section) => section.showInMenu && canAccess(section.id),
  );
  const defaultPath = allowedSections[0]?.path || "/profilo";
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneDisplay = window.matchMedia?.("(display-mode: standalone)")?.matches;
      const isFullscreenDisplay = window.matchMedia?.("(display-mode: fullscreen)")?.matches;
      const isIOSStandalone = window.navigator?.standalone;
      setIsStandalone(Boolean(isStandaloneDisplay || isFullscreenDisplay || isIOSStandalone));
    };

    checkStandalone();
    const mqStandalone = window.matchMedia?.("(display-mode: standalone)");
    const mqFullscreen = window.matchMedia?.("(display-mode: fullscreen)");

    const handler = () => checkStandalone();
    mqStandalone?.addEventListener?.("change", handler);
    mqFullscreen?.addEventListener?.("change", handler);

    return () => {
      mqStandalone?.removeEventListener?.("change", handler);
      mqFullscreen?.removeEventListener?.("change", handler);
    };
  }, []);

  useEffect(() => {
    const onLoad = () => {
      setTimeout(() => window.scrollTo(0, 0), 0);
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    const setAppHeight = () => {
      const vvHeight = window.visualViewport?.height || 0;
      const height = Math.max(window.innerHeight, vvHeight);
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };

    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.visualViewport?.addEventListener?.("resize", setAppHeight);

    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.visualViewport?.removeEventListener?.("resize", setAppHeight);
    };
  }, []);

  const validateCredentials = (creds) => {
    if (!creds?.username || !creds?.password) return false;
    return (state.users || []).some(
      (u) => u.username === creds.username && u.password === creds.password,
    );
  };

  useEffect(() => {
    let stored = null;
    try {
      const raw = localStorage.getItem("authCredentials");
      stored = raw ? JSON.parse(raw) : null;
    } catch {
      stored = null;
    }

    if (stored && validateCredentials(stored)) {
      setIsAuthed(true);
      setLoginForm({ username: stored.username, password: stored.password });
      setLoginError("");
    } else {
      setIsAuthed(false);
    }

    setAuthChecked(true);
  }, [state.users]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const creds = {
      username: loginForm.username.trim(),
      password: loginForm.password,
    };

    if (validateCredentials(creds)) {
      localStorage.setItem("authCredentials", JSON.stringify(creds));
      setIsAuthed(true);
      setLoginError("");
      return;
    }

    setIsAuthed(false);
    setLoginError("Credenziali non valide");
  };

  const handleLogout = () => {
    localStorage.removeItem("authCredentials");
    setIsAuthed(false);
    setLoginForm({ username: "", password: "" });
    setMenuOpen(false);
    navigate("/");
  };

  const sectionElements = {
    home: <Home />,
    collaboratori: (
      <Collaboratori
        users={state.users}
        onAddUser={addUser}
        onUpdateUser={updateUser}
        onDeleteUser={deleteUser}
      />
    ),
    modelli: (
      <Modelli
        users={state.users}
        templates={state.templates || []}
        timePresets={state.timePresets || []}
        onAddTemplate={addTemplate}
        onUpdateTemplate={updateTemplate}
        onDeleteTemplate={deleteTemplate}
        onAddTimePreset={addTimePreset}
        onUpdateTimePreset={updateTimePreset}
        onDeleteTimePreset={deleteTimePreset}
      />
    ),
    "generatore-turni": (
      <GeneratoreTurni
        templates={state.templates || []}
        generatedShifts={state.generatedShifts || []}
        onAddGeneratedShift={addGeneratedShift}
        onDeleteGeneratedShift={deleteGeneratedShift}
      />
    ),
    timbrature: (
      <Timbrature
        users={state.users || []}
        timeEntries={state.timeEntries || {}}
        onSaveEntry={saveTimeEntry}
      />
    ),
    presenze: (
      <Presenze users={state.users || []} timeEntries={state.timeEntries || {}} />
    ),
    profilo: (
      <Profilo
        user={currentUser}
        onLogout={handleLogout}
      />
    ),
    permessi: (
      <Permessi
        user={currentUser}
        sections={sectionsConfig}
        roles={rolesConfig}
        accessMatrix={normalizedAccess.matrix}
        onUpdateAccessMatrix={(sectionId, roleId, value) => {
          const roleKey = String(roleId);
          const roleMatrix = {
            ...(normalizedAccess.matrix?.[roleKey] || {}),
            [sectionId]: value,
          };
          setAccessMatrix({
            ...normalizedAccess.matrix,
            [roleKey]: roleMatrix,
          });
        }}
      />
    ),
  };

  if (!authChecked) {
    return <div style={{ padding: "20px" }}>Caricamento...</div>;
  }

  if (!isAuthed) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <form
          onSubmit={handleLoginSubmit}
          style={{
            width: "100%",
            maxWidth: "320px",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "18px" }}>Accesso</div>
          <input
            type="text"
            placeholder="Username"
            value={loginForm.username}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, username: e.target.value }))
            }
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
            }}
            required
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm((prev) => ({ ...prev, password: e.target.value }))
            }
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
            }}
            required
            autoComplete="current-password"
          />
          {loginError && (
            <div style={{ color: "#e74c3c", fontSize: "13px" }}>
              {loginError}
            </div>
          )}
          <button
            type="submit"
            style={{
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: "var(--button-bg)",
              color: "var(--button-text)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Entra
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`app${isStandalone ? " is-standalone" : ""}`}>
      <div className="app-container">
        {/* Mini Sidebar (Always visible) */}
        <div className="sidebar-mini">
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          {allowedSections.map((section) => {
            const isActive = location.pathname === section.path;
            return (
              <Link
                key={section.id}
                to={section.path}
                title={section.label}
                className={isActive ? "active" : ""}
              >
                {section.id === "profilo" ? (
                  <span className="profile-nav-avatar" aria-label="Profilo">
                    {profileInitial}
                  </span>
                ) : section.iconRegular ? (
                  <img
                    src={`${baseUrl}${isActive ? section.iconActive : section.iconRegular}`}
                    alt={section.label}
                  />
                ) : (
                  <span className="nav-emoji" aria-label={section.label}>
                    {section.navEmoji || "•"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Full Sidebar Menu (Expandable) */}
        {menuOpen && (
          <>
            <div className="sidebar-menu">
              {allowedMenuSections.map((section) => (
                <Link
                  key={section.id}
                  to={section.path}
                  onClick={() => setMenuOpen(false)}
                >
                  {section.label}
                </Link>
              ))}
            </div>
            <div
              className="sidebar-overlay"
              onClick={() => setMenuOpen(false)}
            />
          </>
        )}

        <main>
          <header>
            <h1 onClick={() => navigate(defaultPath)}
            >
              📅 Gestione Turni
            </h1>
          </header>
          <Routes>
            <Route path="/" element={<Navigate to={defaultPath} replace />} />
            {sectionsConfig.map((section) => (
              <Route
                key={section.id}
                path={section.path}
                element={
                  canAccess(section.id)
                    ? sectionElements[section.id]
                    : <Navigate to={defaultPath} replace />
                }
              />
            ))}
            <Route
              path="/view"
              element={
                canAccess("generatore-turni") ? (
                  <ViewTurno generatedShifts={state.generatedShifts || []} users={state.users || []} />
                ) : (
                  <Navigate to={defaultPath} replace />
                )
              }
            />
          </Routes>
        </main>
        <nav className="bottom-nav">
          {allowedSections.map((section) => {
            const isActive = location.pathname === section.path;
            return (
              <Link
                key={section.id}
                to={section.path}
                title={section.label}
                className={isActive ? "active" : ""}
              >
                {section.id === "profilo" ? (
                  <span className="profile-nav-avatar" aria-label="Profilo">
                    {profileInitial}
                  </span>
                ) : section.iconRegular ? (
                  <img
                    src={`${baseUrl}${isActive ? section.iconActive : section.iconRegular}`}
                    alt={section.label}
                  />
                ) : (
                  <span className="nav-emoji" aria-label={section.label}>
                    {section.navEmoji || "•"}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default App;
