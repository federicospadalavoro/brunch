import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { saveState, loadState } from "./config/firebaseUtils";
import { initialState } from "./schema/initialState";
import Collaboratori from "./components/Collaboratori";
import Modelli from "./components/Modelli";
import GeneratoreTurni from "./components/GeneratoreTurni";
import ViewTurno from "./components/ViewTurno";
import Timbrature from "./components/Timbrature";
import Presenze from "./components/Presenze";
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
      />
    </BrowserRouter>
  );
}

function AppContent({ state, addUser, updateUser, deleteUser, addTemplate, updateTemplate, deleteTemplate, addTimePreset, updateTimePreset, deleteTimePreset, addGeneratedShift, deleteGeneratedShift, saveTimeEntry }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const baseUrl = import.meta.env.BASE_URL || "/";
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

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
    <div className="app">
      <div className="app-container">
        {/* Mini Sidebar (Always visible) */}
        <div className="sidebar-mini">
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <Link to="/collaboratori" title="Collaboratori" className={location.pathname === "/collaboratori" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/collaboratori" ? "person.2.fill.png" : "person.2.png"}`}
              alt="Collaboratori"
            />
          </Link>
          <Link to="/modelli" title="Modelli" className={location.pathname === "/modelli" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/modelli" ? "text.document.fill.png" : "text.document.png"}`}
              alt="Modelli"
            />
          </Link>
          <Link to="/generatore-turni" title="Generatore Turni" className={location.pathname === "/generatore-turni" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/generatore-turni" ? "calendar.circle.fill.png" : "calendar.circle.png"}`}
              alt="Generatore Turni"
            />
          </Link>
          <Link to="/timbrature" title="Timbrature" className={location.pathname === "/timbrature" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/timbrature" ? "clock.badge.checkmark.fill.png" : "clock.badge.checkmark.png"}`}
              alt="Timbrature"
            />
          </Link>
          <Link to="/presenze" title="Presenze" className={location.pathname === "/presenze" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/presenze" ? "list.clipboard.fill.png" : "list.bullet.clipboard.png"}`}
              alt="Presenze"
            />
          </Link>
        </div>

        {/* Full Sidebar Menu (Expandable) */}
        {menuOpen && (
          <>
            <div className="sidebar-menu">
              <Link
                to="/collaboratori"
                onClick={() => setMenuOpen(false)}
              >
                👥 Collaboratori
              </Link>
              <Link
                to="/modelli"
                onClick={() => setMenuOpen(false)}
              >
                📋 Modelli
              </Link>
              <Link
                to="/generatore-turni"
                onClick={() => setMenuOpen(false)}
              >
                📅 Generatore Turni
              </Link>
              <Link
                to="/timbrature"
                onClick={() => setMenuOpen(false)}
              >
                🕒 Timbrature
              </Link>
              <Link
                to="/presenze"
                onClick={() => setMenuOpen(false)}
              >
                📊 Presenze
              </Link>
            </div>
            <div
              className="sidebar-overlay"
              onClick={() => setMenuOpen(false)}
            />
          </>
        )}

        <main>
          <header>
            <h1 onClick={() => navigate("/modelli")}
            >
              📅 Gestione Turni
            </h1>
          </header>
          <Routes>
            <Route path="/" element={<Navigate to="/modelli" replace />} />
            <Route
              path="/collaboratori"
              element={
                <Collaboratori
                  users={state.users}
                  onAddUser={addUser}
                  onUpdateUser={updateUser}
                  onDeleteUser={deleteUser}
                />
              }
            />
            <Route
              path="/modelli"
              element={
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
              }
            />
            <Route
              path="/generatore-turni"
              element={
                <GeneratoreTurni
                  templates={state.templates || []}
                  generatedShifts={state.generatedShifts || []}
                  onAddGeneratedShift={addGeneratedShift}
                  onDeleteGeneratedShift={deleteGeneratedShift}
                />
              }
            />
            <Route
              path="/timbrature"
              element={
                <Timbrature
                  users={state.users || []}
                  timeEntries={state.timeEntries || {}}
                  onSaveEntry={saveTimeEntry}
                />
              }
            />
            <Route
              path="/presenze"
              element={
                <Presenze users={state.users || []} timeEntries={state.timeEntries || {}} />
              }
            />
            <Route
              path="/view"
              element={
                <ViewTurno generatedShifts={state.generatedShifts || []} users={state.users || []} />
              }
            />
          </Routes>
        </main>
        <nav className="bottom-nav">
          <Link to="/collaboratori" title="Collaboratori" className={location.pathname === "/collaboratori" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/collaboratori" ? "person.2.fill.png" : "person.2.png"}`}
              alt="Collaboratori"
            />
          </Link>
          <Link to="/modelli" title="Modelli" className={location.pathname === "/modelli" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/modelli" ? "text.document.fill.png" : "text.document.png"}`}
              alt="Modelli"
            />
          </Link>
          <Link to="/generatore-turni" title="Generatore Turni" className={location.pathname === "/generatore-turni" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/generatore-turni" ? "calendar.circle.fill.png" : "calendar.circle.png"}`}
              alt="Generatore Turni"
            />
          </Link>
          <Link to="/timbrature" title="Timbrature" className={location.pathname === "/timbrature" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/timbrature" ? "clock.badge.checkmark.fill.png" : "clock.badge.checkmark.png"}`}
              alt="Timbrature"
            />
          </Link>
          <Link to="/presenze" title="Presenze" className={location.pathname === "/presenze" ? "active" : ""}>
            <img
              src={`${baseUrl}${location.pathname === "/presenze" ? "list.clipboard.fill.png" : "list.bullet.clipboard.png"}`}
              alt="Presenze"
            />
          </Link>
        </nav>
      </div>
    </div>
  );
}

export default App;
