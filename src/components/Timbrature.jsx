import { useMemo, useState, useEffect } from "react";

const toMonthKey = (date) => date.toISOString().slice(0, 7);
const toDateKey = (date) => date.toISOString().slice(0, 10);

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatHours = (inTime, outTime) => {
  if (!inTime || !outTime) return "0h";
  const minutes = Math.max(0, timeToMinutes(outTime) - timeToMinutes(inTime));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDateLabel = (dateKey) => {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;
  const formatted = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export default function Timbrature({
  users = [],
  timeEntries = {},
  generatedShifts = [],
  onSaveEntry,
}) {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(toDateKey(today));

  const authRaw = localStorage.getItem("authCredentials");
  const auth = authRaw ? JSON.parse(authRaw) : null;
  const username = auth?.username || "";
  const user = users.find((u) => u.username === username);

  const currentMonthKey = selectedDate.slice(0, 7);
  const userEntries = timeEntries?.[username] || {};

  const availableMonths = useMemo(() => {
    const months = new Set(Object.keys(userEntries));
    months.add(currentMonthKey);
    return Array.from(months).sort().reverse();
  }, [userEntries, currentMonthKey]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const entry = userEntries?.[selectedDate.slice(0, 7)]?.[selectedDate] || {
    in: "",
    out: "",
  };

  const [inTime, setInTime] = useState(entry.in || "");
  const [outTime, setOutTime] = useState(entry.out || "");

  const monthEntries = userEntries?.[selectedMonth] || {};
  const monthDays = Object.keys(monthEntries).sort();

  const dayKeyFromDate = (dateKey) => {
    const date = new Date(dateKey);
    if (Number.isNaN(date.getTime())) return null;
    const dayIndex = date.getDay();
    const map = {
      0: "domenica",
      1: "lunedi",
      2: "martedi",
      3: "mercoledi",
      4: "giovedi",
      5: "venerdi",
      6: "sabato",
    };
    return map[dayIndex] || null;
  };

  const getShiftTimesForDate = (dateKey) => {
    if (!username || !dateKey) return null;
    const dayKey = dayKeyFromDate(dateKey);
    if (!dayKey) return null;

    const shift = (generatedShifts || []).find((s) =>
      s?.startDate && s?.endDate && dateKey >= s.startDate && dateKey <= s.endDate,
    );
    if (!shift?.grid?.[username]?.[dayKey]) return null;

    const cell = shift.grid[username][dayKey];
    if (!cell?.in1 || !cell?.out1) return null;
    return { in: cell.in1, out: cell.out1 };
  };

  useEffect(() => {
    const monthKey = selectedDate.slice(0, 7);
    const existing = userEntries?.[monthKey]?.[selectedDate];
    if (existing?.in || existing?.out) {
      setInTime(existing.in || "");
      setOutTime(existing.out || "");
      return;
    }

    const shiftTimes = getShiftTimesForDate(selectedDate);
    if (shiftTimes) {
      setInTime(shiftTimes.in || "");
      setOutTime(shiftTimes.out || "");
      return;
    }

    setInTime("");
    setOutTime("");
  }, [selectedDate, userEntries, generatedShifts, username]);

  if (!user) {
    return (
      <div style={{ padding: "20px" }}>
        Nessun utente trovato per questa sessione.
      </div>
    );
  }

  const handleSave = () => {
    if (!selectedDate) return;
    onSaveEntry(username, selectedDate, inTime, outTime);
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "12px" }}>
          Registra Timbratura
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "12px", marginBottom: "6px" }}>
            Data
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              const key = e.target.value.slice(0, 7);
              setSelectedMonth(key);
              const nextEntry = userEntries?.[key]?.[e.target.value] || {
                in: "",
                out: "",
              };
              setInTime(nextEntry.in || "");
              setOutTime(nextEntry.out || "");
            }}
            style={{
              width: "100%",
              minWidth: 0,
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              boxSizing: "border-box",
              textAlign: "left",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px" }}>
              Ora di Entrata
            </label>
            <input
              type="time"
              value={inTime}
              onChange={(e) => setInTime(e.target.value)}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                textAlign: "left",
                boxSizing: "border-box",
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", marginBottom: "6px" }}>
              Ora di Uscita
            </label>
            <input
              type="time"
              value={outTime}
              onChange={(e) => setOutTime(e.target.value)}
              style={{
                width: "100%",
                minWidth: 0,
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid var(--input-border)",
                background: "var(--input-bg)",
                textAlign: "left",
                boxSizing: "border-box",
                WebkitAppearance: "none",
                appearance: "none",
              }}
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          style={{
            marginTop: "14px",
            width: "100%",
            padding: "10px 16px",
            borderRadius: "10px",
            border: "none",
            background: "#1b6ff0",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Conferma Orario
        </button>
      </div>

      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: "10px" }}>Riepilogo del Mese</div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, fontSize: "12px" }}>Mese</div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "10px",
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              textAlign: "left",
            }}
          >
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {formatMonthLabel(month)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: "12px",
              width: "100%",
            }}
          >
            <thead>
              <tr style={{ color: "var(--text-secondary)" }}>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Data</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Entrata</th>
                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Uscita</th>
                <th style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>Ore</th>
              </tr>
            </thead>
            <tbody>
              {monthDays.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "12px", textAlign: "center" }}>
                    Nessuna timbratura per questo mese.
                  </td>
                </tr>
              )}
              {monthDays.map((dateKey, idx) => {
                const row = monthEntries[dateKey];
                return (
                  <tr
                    key={dateKey}
                    style={{ borderTop: "1px solid var(--border-color)" }}
                  >
                    <td style={{ padding: "8px" }}>{formatDateLabel(dateKey)}</td>
                    <td style={{ padding: "8px" }}>{row.in || "—"}</td>
                    <td style={{ padding: "8px" }}>{row.out || "—"}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>
                      {formatHours(row.in, row.out)}
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
}
