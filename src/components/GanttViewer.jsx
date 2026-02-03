import { useMemo, useRef, useState } from "react";

const calculateHours = (in1, out1, in2, out2) => {
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  let totalMinutes = 0;
  if (in1 && out1) {
    totalMinutes += timeToMinutes(out1) - timeToMinutes(in1);
  }
  if (in2 && out2) {
    totalMinutes += timeToMinutes(out2) - timeToMinutes(in2);
  }

  const decimalHours = (totalMinutes / 60).toFixed(1).replace(".", ",");
  return `${decimalHours}h`;
};

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 8; h <= 23; h++) {
    slots.push(`${h.toString().padStart(2, "0")}:00`);
    if (h < 23) slots.push(`${h.toString().padStart(2, "0")}:30`);
  }
  slots.push("24:00");
  return slots;
};

const dayShortLabelsDefault = {
  lunedi: "Lun",
  martedi: "Mar",
  mercoledi: "Mer",
  giovedi: "Gio",
  venerdi: "Ven",
  sabato: "Sab",
  domenica: "Dom",
};

export default function GanttViewer({
  grid,
  rows,
  days,
  dayLabels,
  startDate,
  showSummary = true,
  onCellClick,
  initialSelectedDay,
  selectedDay,
  onSelectedDayChange,
}) {
  const timeSlots = useMemo(() => generateTimeSlots(), []);
  const isMobile = window.innerWidth <= 768;
  const NAME_WIDTH = 100;
  const SLOT_WIDTH = isMobile ? 28 : 40;
  const TOTAL_WIDTH = isMobile ? 40 : 50;

  const [internalSelectedDay, setInternalSelectedDay] = useState(
    initialSelectedDay && days.includes(initialSelectedDay)
      ? initialSelectedDay
      : days[0],
  );
  const currentSelectedDay = selectedDay ?? internalSelectedDay;
  const segmentOptions = showSummary ? [...days, "riepilogo"] : [...days];
  const selectedIndex = Math.max(segmentOptions.indexOf(currentSelectedDay), 0);

  const ganttHeaderRefs = useRef({});
  const ganttBodyRefs = useRef({});
  const ganttScrollState = useRef({});

  const timeToMinutes = (time) => {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const normalizeTime = (time) => (time ? time.slice(0, 5) : "");

  const syncGanttScroll = (dayKey, sourceEl, targetEl) => {
    if (!targetEl || !sourceEl) return;
    const state = ganttScrollState.current[dayKey] || {
      rafId: 0,
      skipEl: null,
    };

    if (state.skipEl === sourceEl) {
      state.skipEl = null;
      ganttScrollState.current[dayKey] = state;
      return;
    }

    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = requestAnimationFrame(() => {
      state.skipEl = targetEl;
      targetEl.scrollLeft = sourceEl.scrollLeft;
      state.rafId = 0;
    });

    ganttScrollState.current[dayKey] = state;
  };

  const getDayDate = (dayIndex) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + dayIndex);
    return dayDate.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getDayLabelWithDate = (dayKey) => {
    const dayIndex = days.indexOf(dayKey);
    const baseLabel = dayLabels?.[dayKey] || dayKey;
    const shortLabel = dayShortLabelsDefault[dayKey] || baseLabel;
    const date = getDayDate(dayIndex);
    if (!date) return baseLabel;
    const [dayNumber] = date.split("/");
    return `${shortLabel} ${dayNumber}`;
  };

  const isWorking = (rowKey, dayKey, slotTime) => {
    const dayData = grid?.[rowKey]?.[dayKey];
    if (!dayData) return false;

    const slotMinutes = timeToMinutes(slotTime);
    const in1 = timeToMinutes(dayData.in1);
    const out1 = timeToMinutes(dayData.out1);
    const in2 = timeToMinutes(dayData.in2);
    const out2 = timeToMinutes(dayData.out2);

    const inFirstShift =
      in1 !== null && out1 !== null && slotMinutes >= in1 && slotMinutes < out1;
    const inSecondShift =
      in2 !== null && out2 !== null && slotMinutes >= in2 && slotMinutes < out2;

    return inFirstShift || inSecondShift;
  };

  const getDisplayName = (row) => {
    if (row?.nome) {
      const cognomeInitiale = row?.cognome
        ? `${row.cognome[0]}.`
        : "";
      return `${row.nome} ${cognomeInitiale}`.trim();
    }
    return row?.username || row?.key || "";
  };

  return (
    <div>
      <div className="segmented-control" aria-label="Seleziona giorno">
        <div
          className="segmented-slider"
          style={{
            width: `calc((100% - 8px) / ${segmentOptions.length})`,
            transform: `translateX(${selectedIndex * 100}%)`,
          }}
        />
        {days.map((day) => (
          <button
            key={day}
            onClick={() => {
              if (selectedDay === undefined) setInternalSelectedDay(day);
              onSelectedDayChange?.(day);
            }}
            className={`segmented-btn ${currentSelectedDay === day ? "active" : ""}`}
          >
            {getDayLabelWithDate(day)}
          </button>
        ))}
        {showSummary && (
          <button
            onClick={() => {
              if (selectedDay === undefined) setInternalSelectedDay("riepilogo");
              onSelectedDayChange?.("riepilogo");
            }}
            className={`segmented-btn ${currentSelectedDay === "riepilogo" ? "active" : ""}`}
          >
            Riepilogo
          </button>
        )}
      </div>

      {days
        .filter((day) => day === currentSelectedDay)
        .map((day) => (
          <div key={day} style={{ marginBottom: "40px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <h3
                style={{
                  backgroundColor: "var(--button-bg)",
                  color: "var(--button-text)",
                  padding: "10px 15px",
                  borderRadius: "6px",
                  margin: 0,
                }}
              >
                {getDayLabelWithDate(day)}
              </h3>
              <div
                style={{
                  backgroundColor: "#27ae60",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "13px",
                }}
              >
                Totale:{" "}
                {(() => {
                  const totalMinutes = rows.reduce((sum, row) => {
                    const dayData = grid?.[row.key]?.[day];
                    if (!dayData) return sum;
                    const in1 = dayData.in1;
                    const out1 = dayData.out1;
                    const in2 = dayData.in2;
                    const out2 = dayData.out2;
                    const timeToMinutes = (time) => {
                      if (!time) return 0;
                      const [h, m] = time.split(":").map(Number);
                      return h * 60 + m;
                    };
                    let dayMinutes = 0;
                    if (in1 && out1)
                      dayMinutes += timeToMinutes(out1) - timeToMinutes(in1);
                    if (in2 && out2)
                      dayMinutes += timeToMinutes(out2) - timeToMinutes(in2);
                    return sum + dayMinutes;
                  }, 0);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                })()}
              </div>
            </div>

            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 1000,
                background: "var(--table-header-bg)",
                height: "40px",
                marginBottom: "-40px",
              }}
            >
              <div style={{ display: "flex" }}>
                <div
                  style={{
                    flex: "0 0 auto",
                    minWidth: `${NAME_WIDTH}px`,
                    width: `${NAME_WIDTH}px`,
                    padding: "6px",
                    border: "1px solid var(--border-color)",
                    height: "40px",
                    backgroundColor: "var(--table-header-bg)",
                  }}
                ></div>
                <div
                  ref={(el) => {
                    if (el) ganttHeaderRefs.current[day] = el;
                  }}
                  onScroll={(e) => {
                    const body = ganttBodyRefs.current[day];
                    syncGanttScroll(day, e.currentTarget, body);
                  }}
                  style={{
                    flex: "1 1 auto",
                    overflowX: "auto",
                    overflowY: "hidden",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  <div style={{ display: "flex" }}>
                    <table
                      style={{
                        borderCollapse: "collapse",
                        fontSize: "11px",
                        backgroundColor: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        width: "100%",
                        tableLayout: "fixed",
                        borderRadius: "0",
                      }}
                    >
                      <colgroup>
                        {timeSlots.map((slot) => (
                          <col key={slot} style={{ width: `${SLOT_WIDTH}px` }} />
                        ))}
                        <col style={{ width: `${TOTAL_WIDTH}px` }} />
                      </colgroup>
                      <thead>
                        <tr>
                          {timeSlots.map((slot) => (
                            <th
                              key={slot}
                              style={{
                                backgroundColor: "var(--table-header-bg)",
                                color: "var(--button-text)",
                                padding: isMobile ? "6px 2px" : "8px 4px",
                                border: "1px solid var(--border-color)",
                                minWidth: `${SLOT_WIDTH}px`,
                                width: `${SLOT_WIDTH}px`,
                                height: "40px",
                                fontSize: isMobile ? "9px" : "10px",
                              }}
                            >
                              {slot === "24:00"
                                ? ""
                                : slot.endsWith(":00")
                                  ? slot
                                  : "·"}
                            </th>
                          ))}
                          <th
                            style={{
                              backgroundColor: "var(--table-header-bg)",
                              color: "var(--button-text)",
                              padding: isMobile ? "6px 2px" : "8px 4px",
                              border: "1px solid var(--border-color)",
                              minWidth: `${TOTAL_WIDTH}px`,
                              width: `${TOTAL_WIDTH}px`,
                              height: "40px",
                              fontSize: isMobile ? "9px" : "10px",
                              fontWeight: "bold",
                            }}
                          >
                            Ore
                          </th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex" }}>
              <div style={{ flex: "0 0 auto" }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "0",
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          backgroundColor: "var(--table-header-bg)",
                          color: "var(--button-text)",
                          padding: "8px",
                          border: "1px solid var(--border-color)",
                          minWidth: `${NAME_WIDTH}px`,
                          width: `${NAME_WIDTH}px`,
                          height: "40px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        Collaboratore
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row.key} style={{ height: "36px" }}>
                        <td
                          style={{
                            backgroundColor:
                              idx % 2 === 0
                                ? "var(--row-even)"
                                : "var(--row-odd)",
                            padding: "6px",
                            border: "1px solid var(--border-color)",
                            fontWeight: "500",
                            minWidth: `${NAME_WIDTH}px`,
                            width: `${NAME_WIDTH}px`,
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {getDisplayName(row)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                ref={(el) => {
                  if (el) ganttBodyRefs.current[day] = el;
                }}
                onScroll={(e) => {
                  const header = ganttHeaderRefs.current[day];
                  syncGanttScroll(day, e.currentTarget, header);
                }}
                style={{ flex: "1 1 auto", overflowX: "auto", paddingTop: "40px" }}
              >
                <table
                  style={{
                    borderCollapse: "collapse",
                    fontSize: "11px",
                    backgroundColor: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    width: "100%",
                    tableLayout: "fixed",
                    borderRadius: "0",
                    overflow: "visible",
                  }}
                >
                  <colgroup>
                    {timeSlots.map((slot) => (
                      <col key={slot} style={{ width: `${SLOT_WIDTH}px` }} />
                    ))}
                    <col style={{ width: `${TOTAL_WIDTH}px` }} />
                  </colgroup>
                  <tbody style={{ overflow: "visible" }}>
                    {rows.map((row, idx) => (
                      <tr key={row.key} style={{ height: "36px", overflow: "visible" }}>
                        {timeSlots.map((slot, slotIndex) => {
                          const working = isWorking(row.key, day, slot);
                          const prevWorking =
                            slotIndex > 0 &&
                            isWorking(row.key, day, timeSlots[slotIndex - 1]);
                          const nextWorking =
                            slotIndex < timeSlots.length - 1 &&
                            isWorking(row.key, day, timeSlots[slotIndex + 1]);

                          const dayData = grid?.[row.key]?.[day];
                          const in1 = normalizeTime(dayData?.in1);
                          const out1 = normalizeTime(dayData?.out1);
                          const in2 = normalizeTime(dayData?.in2);
                          const out2 = normalizeTime(dayData?.out2);
                          const labelStart =
                            slot === in1 && out1
                              ? `${in1} - ${out1}`
                              : slot === in2 && out2
                                ? `${in2} - ${out2}`
                                : "";

                          let barColor = "#5AC8FA";
                          if (row?.posizione === "cucina") {
                            barColor = "#FFA366";
                          } else if (row?.posizione === "bar") {
                            barColor = "#C084FC";
                          }

                          let borderRadius = "0px";
                          if (working) {
                            const topLeft = !prevWorking ? "999px" : "0px";
                            const bottomLeft = !prevWorking ? "999px" : "0px";
                            const topRight = !nextWorking ? "999px" : "0px";
                            const bottomRight = !nextWorking ? "999px" : "0px";
                            borderRadius = `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
                          }

                          return (
                            <td
                              key={slot}
                              onClick={() =>
                                onCellClick?.({
                                  rowKey: row.key,
                                  dayKey: day,
                                  slot,
                                })
                              }
                              style={{
                                backgroundColor: working
                                  ? barColor
                                  : idx % 2 === 0
                                    ? "var(--row-even)"
                                    : "var(--row-odd)",
                                borderTop: "1px solid var(--border-color)",
                                borderBottom:
                                  "1px solid var(--border-color)",
                                borderLeft:
                                  slotIndex === 0 || (!prevWorking && working)
                                    ? "1px solid var(--border-color)"
                                    : "none",
                                borderRight:
                                  nextWorking && working
                                    ? "none"
                                    : "1px solid var(--border-color)",
                                padding: "3px",
                                textAlign: "center",
                                borderRadius: borderRadius,
                                verticalAlign: "middle",
                                minWidth: `${SLOT_WIDTH}px`,
                                width: `${SLOT_WIDTH}px`,
                                cursor: working ? "pointer" : "default",
                                transition: "opacity 0.2s ease",
                                position: "relative",
                                overflow: "visible",
                              }}
                              onMouseEnter={(e) => {
                                if (working) e.currentTarget.style.opacity = "0.8";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "1";
                              }}
                            >
                              {labelStart && working && (
                                <span
                                  style={{
                                    position: "absolute",
                                    left: "10px",
                                    top: 0,
                                    bottom: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    color: "#fff",
                                    fontSize: isMobile ? "12px" : "14px",
                                    fontWeight: 700,
                                    pointerEvents: "none",
                                    whiteSpace: "nowrap",
                                    width: "max-content",
                                    zIndex: 2,
                                  }}
                                >
                                  {labelStart}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td
                          style={{
                            backgroundColor:
                              idx % 2 === 0
                                ? "var(--row-even)"
                                : "var(--row-odd)",
                            border: "1px solid var(--border-color)",
                            padding: "3px 6px",
                            textAlign: "center",
                            minWidth: `${TOTAL_WIDTH}px`,
                            width: `${TOTAL_WIDTH}px`,
                            fontWeight: "bold",
                            fontSize: "10px",
                            verticalAlign: "middle",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {calculateHours(
                            grid?.[row.key]?.[day]?.in1,
                            grid?.[row.key]?.[day]?.out1,
                            grid?.[row.key]?.[day]?.in2,
                            grid?.[row.key]?.[day]?.out2,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

      {showSummary && currentSelectedDay === "riepilogo" && (
        <div
          style={{
            marginTop: "20px",
            borderTop: "3px solid var(--border-color)",
            paddingTop: "20px",
          }}
        >
          <h3 style={{ marginBottom: "16px" }}>📊 Riepilogo ore settimanali</h3>
          <div style={{ display: "flex" }}>
            <div style={{ flex: "0 0 auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        backgroundColor: "var(--table-header-bg)",
                        color: "var(--button-text)",
                        padding: "8px",
                        border: "1px solid var(--border-color)",
                        minWidth: "160px",
                        textAlign: "left",
                      }}
                    >
                      Collaboratore
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.key} style={{ height: "36px" }}>
                      <td
                        style={{
                          backgroundColor:
                            idx % 2 === 0
                              ? "var(--row-even)"
                              : "var(--row-odd)",
                          padding: "8px",
                          border: "1px solid var(--border-color)",
                          fontWeight: "500",
                          verticalAlign: "middle",
                        }}
                      >
                        {getDisplayName(row)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ flex: "1 1 auto", overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  fontSize: "11px",
                  backgroundColor: "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0",
                  width: "100%",
                }}
              >
                <thead>
                  <tr>
                    {days.map((d) => (
                      <th
                        key={d}
                        style={{
                          backgroundColor: "var(--table-header-bg)",
                          color: "var(--button-text)",
                          padding: "8px",
                          border: "1px solid var(--border-color)",
                          minWidth: "80px",
                          textAlign: "center",
                          fontWeight: "bold",
                          fontSize: "10px",
                        }}
                      >
                        {getDayLabelWithDate(d)}
                      </th>
                    ))}
                    <th
                      style={{
                        backgroundColor: "#27ae60",
                        color: "white",
                        padding: "8px",
                        border: "1px solid var(--border-color)",
                        minWidth: "80px",
                        textAlign: "center",
                        fontWeight: "bold",
                        fontSize: "10px",
                      }}
                    >
                      TOTALE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.key} style={{ height: "36px" }}>
                      {days.map((d) => {
                        const dayData = grid?.[row.key]?.[d];
                        return (
                          <td
                            key={d}
                            style={{
                              backgroundColor:
                                idx % 2 === 0
                                  ? "var(--row-even)"
                                  : "var(--row-odd)",
                              border: "1px solid var(--border-color)",
                              padding: "8px",
                              textAlign: "center",
                              fontWeight: "500",
                              fontSize: "10px",
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {dayData
                              ? calculateHours(
                                  dayData.in1,
                                  dayData.out1,
                                  dayData.in2,
                                  dayData.out2,
                                )
                              : "0h"}
                          </td>
                        );
                      })}
                      <td
                        style={{
                          backgroundColor:
                            idx % 2 === 0
                              ? "rgba(39, 174, 96, 0.2)"
                              : "rgba(39, 174, 96, 0.15)",
                          border: "1px solid var(--border-color)",
                          padding: "8px",
                          textAlign: "center",
                          fontWeight: "bold",
                          fontSize: "10px",
                          verticalAlign: "middle",
                          color: "#27ae60",
                        }}
                      >
                        {(() => {
                          const totalMinutes = days.reduce((sum, d) => {
                            const dayData = grid?.[row.key]?.[d];
                            if (!dayData) return sum;
                            const timeToMinutes = (time) => {
                              if (!time) return 0;
                              const [h, m] = time.split(":").map(Number);
                              return h * 60 + m;
                            };
                            let dayMinutes = 0;
                            if (dayData.in1 && dayData.out1)
                              dayMinutes +=
                                timeToMinutes(dayData.out1) -
                                timeToMinutes(dayData.in1);
                            if (dayData.in2 && dayData.out2)
                              dayMinutes +=
                                timeToMinutes(dayData.out2) -
                                timeToMinutes(dayData.in2);
                            return sum + dayMinutes;
                          }, 0);
                          const hours = Math.floor(totalMinutes / 60);
                          const minutes = totalMinutes % 60;
                          return minutes > 0
                            ? `${hours}h ${minutes}m`
                            : `${hours}h`;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
