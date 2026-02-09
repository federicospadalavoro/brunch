import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}`;
};

export default function Home({ generatedShifts = [] }) {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.BASE_URL || "/";
  const chevronSrc = `${baseUrl}chevron.right.png`;

  const authRaw = localStorage.getItem("authCredentials");
  const auth = authRaw ? JSON.parse(authRaw) : null;
  const username = auth?.username || "";

  const todayKey = toLocalDateKey(new Date());

  const todayShift = useMemo(() => {
    if (!username) return null;
    const matching = (generatedShifts || []).filter(
      (s) =>
        s?.startDate &&
        s?.endDate &&
        todayKey >= s.startDate &&
        todayKey <= s.endDate &&
        s?.grid?.[username],
    );
    if (!matching.length) return null;
    return matching.sort((a, b) =>
      String(b?.startDate || "").localeCompare(String(a?.startDate || "")),
    )[0];
  }, [generatedShifts, todayKey, username]);

  const docs = [
    { label: "Mansionario Sala", file: "Mansionario Sala.pdf" },
    { label: "Mansionario Cucina", file: "Mansionario Cucina.pdf" },
    { label: "Mansionario Banco", file: "Mansionario Banco.pdf" },
    { label: "Schede tecniche Food", file: "Schede tecniche Food.pdf" },
    { label: "Schede tecniche Drink", file: "Schede tecniche Drink.pdf" },
  ];

  return (
    <div
      style={{
        padding: "24px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "calc(100% - 24px)",
          maxWidth: "520px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          marginInline: "12px",
        }}
      >
        {todayShift && (
          <button
            onClick={() => navigate(`/view?id=${todayShift.id}`)}
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              borderRadius: "14px",
              padding: "14px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              textAlign: "left",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              color: "var(--text-color)",
              fontFamily: "inherit",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary, #6b7280)", marginBottom: "4px" }}>
                Turno di oggi
              </div>
              <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
                {todayShift.name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary, #6b7280)" }}>
                {formatShortDate(todayShift.startDate)} → {formatShortDate(todayShift.endDate)}
              </div>
            </div>
            <img src={chevronSrc} alt="Apri" className="chevron-icon" />
          </button>
        )}

        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary, #6b7280)",
            marginTop: "8px",
          }}
        >
          Documenti
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          {docs.map((doc) => (
            <a
              key={doc.file}
              href={`${baseUrl}docs/${encodeURIComponent(doc.file)}`}
              target="_blank"
              rel="noreferrer"
              style={{
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                  color: "var(--text-color)",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{doc.label}</div>
                <img src={chevronSrc} alt="Apri" className="chevron-icon" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
