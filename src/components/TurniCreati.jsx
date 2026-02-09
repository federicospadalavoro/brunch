import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export default function TurniCreati({ generatedShifts = [] }) {
  const navigate = useNavigate();
  const chevronSrc = `${import.meta.env.BASE_URL}chevron.right.png`;
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}`;
  };

  const orderedShifts = useMemo(() => {
    return [...(generatedShifts || [])].sort((a, b) =>
      String(b?.startDate || "").localeCompare(String(a?.startDate || "")),
    );
  }, [generatedShifts]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 22px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            textAlign: "center",
            color: "var(--text-color)",
          }}
        >
          Seleziona Settimana
        </div>
        {orderedShifts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gap: "10px",
              width: "calc(100% - 24px)",
              marginInline: "12px",
            }}
          >
            {orderedShifts.map((shift, index) => (
              <button
                key={shift.id}
                onClick={() => navigate(`/view?id=${shift.id}`)}
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
                  <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
                    {shift.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary, #6b7280)" }}>
                    {formatDate(shift.startDate)} → {formatDate(shift.endDate)}
                  </div>
                </div>
                <img
                  src={chevronSrc}
                  alt="Apri"
                  className="chevron-icon"
                />
              </button>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontStyle: "italic", textAlign: "center" }}>
            Nessun turno creato al momento.
          </p>
        )}
      </div>
    </div>
  );
}
