import { useMemo, useState } from "react";

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

const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const getWeekGroups = (days) => {
  const groups = [];
  let current = [];
  days.forEach((day) => {
    current.push(day);
    if (day.getDay() === 0) {
      groups.push(current);
      current = [];
    }
  });
  if (current.length) groups.push(current);
  return groups;
};

export default function Presenze({ users = [], timeEntries = {} }) {
  const now = new Date();
  const initialMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(initialMonthKey);

  const availableMonths = useMemo(() => {
    const months = new Set();
    Object.values(timeEntries || {}).forEach((userMonths) => {
      Object.keys(userMonths || {}).forEach((month) => months.add(month));
    });
    months.add(initialMonthKey);
    return Array.from(months).sort().reverse();
  }, [timeEntries, initialMonthKey]);

  const [year, month] = selectedMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, month - 1);
  const weekGroups = getWeekGroups(daysInMonth);

  const weekTotalsByDate = (entries) => {
    const totals = {};
    weekGroups.forEach((group) => {
      const totalMinutes = group.reduce((sum, day) => {
        const key = toDateKey(day);
        const row = entries[key];
        if (!row) return sum;
        return sum + Math.max(0, timeToMinutes(row.out) - timeToMinutes(row.in));
      }, 0);
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const label = mins ? `${hours}h ${mins}m` : `${hours}h`;
      const lastDayKey = toDateKey(group[group.length - 1]);
      totals[lastDayKey] = label;
    });
    return totals;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "16px" }}>📊 Presenze</h2>

      <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>Mese</div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{
            padding: "8px",
            borderRadius: "8px",
            border: "1px solid var(--input-border)",
            background: "var(--input-bg)",
          }}
        >
          {availableMonths.map((monthKey) => (
            <option key={monthKey} value={monthKey}>
              {monthKey}
            </option>
          ))}
        </select>
      </div>

      {users.map((user) => {
        const userEntries = timeEntries?.[user.username]?.[selectedMonth] || {};
        const weekTotals = weekTotalsByDate(userEntries);

        return (
          <div key={user.username} style={{ marginBottom: "32px" }}>
            <h3 style={{ marginBottom: "10px" }}>
              {user.nome} {user.cognome}
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  fontSize: "12px",
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  width: "100%",
                  minWidth: "600px",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Data</th>
                    <th style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Entrata</th>
                    <th style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Uscita</th>
                    <th style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Totale giorno</th>
                    <th style={{ padding: "8px", border: "1px solid var(--border-color)" }}>Totale settimana</th>
                  </tr>
                </thead>
                <tbody>
                  {daysInMonth.map((day, idx) => {
                    const dateKey = toDateKey(day);
                    const entry = userEntries[dateKey] || {};
                    const weekTotal = weekTotals[dateKey] || "";
                    return (
                      <tr key={dateKey} style={{ background: idx % 2 === 0 ? "var(--row-even)" : "var(--row-odd)" }}>
                        <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>{dateKey}</td>
                        <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>{entry.in || "—"}</td>
                        <td style={{ padding: "8px", border: "1px solid var(--border-color)" }}>{entry.out || "—"}</td>
                        <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600 }}>
                          {formatHours(entry.in, entry.out)}
                        </td>
                        <td style={{ padding: "8px", border: "1px solid var(--border-color)", fontWeight: 600, color: "#27ae60" }}>
                          {weekTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
