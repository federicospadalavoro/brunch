import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { saveState, loadState } from "./config/firebaseUtils";
import { initialState } from "./schema/initialState";
import Home from "./components/Home";
import Collaboratori from "./components/Collaboratori";
import Modelli from "./components/Modelli";
import GeneratoreTurni from "./components/GeneratoreTurni";
import ViewTurno from "./components/ViewTurno";
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
      />
    </BrowserRouter>
  );
}

function AppContent({ state, addUser, updateUser, deleteUser, addTemplate, updateTemplate, deleteTemplate, addTimePreset, updateTimePreset, deleteTimePreset, addGeneratedShift, deleteGeneratedShift }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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
          <Link to="/" title="Home" className={location.pathname === "/" ? "active" : ""}>🏠</Link>
          <Link to="/collaboratori" title="Collaboratori" className={location.pathname === "/collaboratori" ? "active" : ""}>👥</Link>
          <Link to="/modelli" title="Modelli" className={location.pathname === "/modelli" ? "active" : ""}>📋</Link>
          <Link to="/generatore-turni" title="Generatore Turni" className={location.pathname === "/generatore-turni" ? "active" : ""}>📅</Link>
        </div>

        {/* Full Sidebar Menu (Expandable) */}
        {menuOpen && (
          <>
            <div className="sidebar-menu">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
              >
                🏠 Home
              </Link>
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
            </div>
            <div
              className="sidebar-overlay"
              onClick={() => setMenuOpen(false)}
            />
          </>
        )}

        <main>
          <header>
            <h1 onClick={() => navigate("/")}
            >
              📅 Gestione Turni
            </h1>
          </header>
          <Routes>
            <Route path="/" element={<Home />} />
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
              path="/view"
              element={
                <ViewTurno generatedShifts={state.generatedShifts || []} users={state.users || []} />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
