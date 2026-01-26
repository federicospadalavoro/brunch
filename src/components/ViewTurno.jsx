import { useSearchParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

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

export default function ViewTurno({ generatedShifts, users = [] }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shiftId = searchParams.get('id');
  const [showFilter, setShowFilter] = useState(false);
  const [filteredCollaborators, setFilteredCollaborators] = useState(null); // null = mostra tutti

  const shift = generatedShifts.find(s => s.id === shiftId);

  if (!shift) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>⚠️ Turno non trovato</h2>
        <button 
          onClick={() => navigate('/generatore-turni')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: 'var(--button-bg)',
            color: 'var(--button-text)',
            border: 'none',
            borderRadius: '6px',
            marginTop: '20px'
          }}
        >
          ← Torna al Generatore
        </button>
      </div>
    );
  }

  // Genera array di orari (ogni 30 minuti)
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 8; h <= 23; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 23) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    slots.push('24:00'); // Mezzanotte
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Converte orario "HH:MM" in minuti dal midnight
  const timeToMinutes = (time) => {
    if (!time) return null;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Verifica se un collaboratore lavora in un certo slot orario in un certo giorno
  const isWorking = (username, day, slotTime) => {
    const dayData = shift.grid[username]?.[day];
    if (!dayData) return false;

    const slotMinutes = timeToMinutes(slotTime);
    const in1 = timeToMinutes(dayData.in1);
    const out1 = timeToMinutes(dayData.out1);
    const in2 = timeToMinutes(dayData.in2);
    const out2 = timeToMinutes(dayData.out2);

    // Verifica se lo slot rientra in uno dei due turni
    const inFirstShift = in1 !== null && out1 !== null && slotMinutes >= in1 && slotMinutes < out1;
    const inSecondShift = in2 !== null && out2 !== null && slotMinutes >= in2 && slotMinutes < out2;

    return inFirstShift || inSecondShift;
  };

  const days = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
  const dayLabels = {
    lunedi: 'Lunedì',
    martedi: 'Martedì',
    mercoledi: 'Mercoledì',
    giovedi: 'Giovedì',
    venerdi: 'Venerdì',
    sabato: 'Sabato',
    domenica: 'Domenica'
  };

  // Calcola le date effettive per ogni giorno
  const getDayDate = (dayIndex) => {
    const startDate = new Date(shift.startDate);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + dayIndex);
    return dayDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  };

  // Ordina i collaboratori per posizione (cucina, sala, bar) e alfabeticamente dentro ogni gruppo
  const collaborators = Object.keys(shift.grid).sort((a, b) => {
    const userA = users.find(u => u.username === a);
    const userB = users.find(u => u.username === b);
    
    const posA = userA?.posizione || "sala";
    const posB = userB?.posizione || "sala";
    
    // Ordine posizioni: cucina (0), sala (1), bar (2)
    const posOrder = { "cucina": 0, "sala": 1, "bar": 2 };
    const orderA = posOrder[posA] ?? 1;
    const orderB = posOrder[posB] ?? 1;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Se stessa posizione, ordina alfabeticamente
    return a.localeCompare(b);
  });

  // Applica il filtro ai collaboratori
  const displayedCollaborators = filteredCollaborators === null 
    ? collaborators 
    : collaborators.filter(c => filteredCollaborators.includes(c));

  // Funzioni per il filtro
  const handleSelectAll = () => {
    setFilteredCollaborators(collaborators);
  };

  const handleDeselectAll = () => {
    setFilteredCollaborators([]);
  };

  const toggleCollaborator = (username) => {
    if (filteredCollaborators === null) {
      // Inizializza il filtro con tutti tranne questo
      setFilteredCollaborators(collaborators.filter(c => c !== username));
    } else if (filteredCollaborators.includes(username)) {
      setFilteredCollaborators(filteredCollaborators.filter(c => c !== username));
    } else {
      setFilteredCollaborators([...filteredCollaborators, username]);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>📊 {shift.name}</h2>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
            {shift.startDate} → {shift.endDate} | Modello: {shift.templateName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowFilter(!showFilter)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: showFilter ? '#27ae60' : 'var(--button-bg)',
              color: 'var(--button-text)',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            🔍 Filtro {filteredCollaborators && filteredCollaborators.length > 0 && `(${filteredCollaborators.length})`}
          </button>
          <button 
            onClick={() => navigate('/generatore-turni')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: 'var(--button-bg)',
              color: 'var(--button-text)',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            ← Torna al Generatore
          </button>
        </div>
      </div>

      {showFilter && (
        <>
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              background: 'rgba(0,0,0,0.5)', 
              backdropFilter: 'blur(4px)',
              zIndex: 1000 
            }}
            onClick={() => setShowFilter(false)}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            zIndex: 1001,
            minWidth: '350px',
            maxHeight: '70vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>🔍 Filtra Collaboratori</h3>
              <button
                onClick={() => setShowFilter(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  flex: 1
                }}
              >
                ✓ Tutti
              </button>
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  flex: 1
                }}
              >
                ✗ Nessuno
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  const cucinaUsers = collaborators.filter(username => {
                    const user = users.find(u => u.username === username);
                    return user?.posizione === 'cucina';
                  });
                  const allSelected = cucinaUsers.every(u => filteredCollaborators === null || filteredCollaborators.includes(u));
                  if (allSelected) {
                    setFilteredCollaborators(prev => {
                      const current = prev === null ? [...collaborators] : prev;
                      return current.filter(u => !cucinaUsers.includes(u));
                    });
                  } else {
                    setFilteredCollaborators(prev => {
                      const current = prev === null ? [] : [...prev];
                      const newSet = new Set([...current, ...cucinaUsers]);
                      return Array.from(newSet);
                    });
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#FFA366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                🍳 Cucina
              </button>
              <button
                onClick={() => {
                  const salaUsers = collaborators.filter(username => {
                    const user = users.find(u => u.username === username);
                    return user?.posizione === 'sala';
                  });
                  const allSelected = salaUsers.every(u => filteredCollaborators === null || filteredCollaborators.includes(u));
                  if (allSelected) {
                    setFilteredCollaborators(prev => {
                      const current = prev === null ? [...collaborators] : prev;
                      return current.filter(u => !salaUsers.includes(u));
                    });
                  } else {
                    setFilteredCollaborators(prev => {
                      const current = prev === null ? [] : [...prev];
                      const newSet = new Set([...current, ...salaUsers]);
                      return Array.from(newSet);
                    });
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#5AC8FA',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                🍽️ Sala
              </button>
              <button
                onClick={() => {
                  const barUsers = collaborators.filter(username => {
                    const user = users.find(u => u.username === username);
                    return user?.posizione === 'bar';
                  });
                  const allSelected = barUsers.every(u => filteredCollaborators === null || filteredCollaborators.includes(u));
                  if (allSelected) {
                    setFilteredCollaborators(prev => {
                      const current = prev === null ? [...collaborators] : prev;
                      return current.filter(u => !barUsers.includes(u));
                    });
                  } else {
                    setFilteredCollaborators(prev => {
                      const current = prev === null ? [] : [...prev];
                      const newSet = new Set([...current, ...barUsers]);
                      return Array.from(newSet);
                    });
                  }
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#C084FC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}
              >
                🍸 Bar
              </button>
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {collaborators.map(username => {
                const user = users.find(u => u.username === username);
                const isChecked = filteredCollaborators === null ? true : filteredCollaborators.includes(username);
                const posizione = user?.posizione || "sala";
                let posBadgeColor = '#5AC8FA'; // Sala
                if (posizione === "cucina") {
                  posBadgeColor = '#FFA366'; // Cucina
                } else if (posizione === "bar") {
                  posBadgeColor = '#C084FC'; // Bar
                }
                
                return (
                  <label 
                    key={username} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      padding: '10px',
                      borderRadius: '6px',
                      transition: 'background-color 0.2s',
                      backgroundColor: isChecked ? 'rgba(84, 200, 250, 0.1)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(84, 200, 250, 0.05)'
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCollaborator(username)}
                      style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500' }}>
                        {user?.nome} {user?.cognome}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {username}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: posBadgeColor,
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}
                    >
                      {posizione.charAt(0).toUpperCase() + posizione.slice(1)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}

      {days.map((day, dayIndex) => (
        <div key={day} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ 
              backgroundColor: 'var(--button-bg)', 
              color: 'var(--button-text)',
              padding: '10px 15px',
              borderRadius: '6px',
              margin: 0
            }}>
              {dayLabels[day]} - {getDayDate(dayIndex)}
            </h3>
            <div style={{
              backgroundColor: '#27ae60',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '13px'
            }}>
              Totale: {(() => {
                const totalMinutes = displayedCollaborators.reduce((sum, username) => {
                  const dayData = shift.grid[username]?.[day];
                  if (!dayData) return sum;
                  const timeToMinutes = (time) => {
                    if (!time) return 0;
                    const [h, m] = time.split(':').map(Number);
                    return h * 60 + m;
                  };
                  let dayMinutes = 0;
                  if (dayData.in1 && dayData.out1) dayMinutes += timeToMinutes(dayData.out1) - timeToMinutes(dayData.in1);
                  if (dayData.in2 && dayData.out2) dayMinutes += timeToMinutes(dayData.out2) - timeToMinutes(dayData.in2);
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
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      minWidth: '140px',
                      height: '40px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      Collaboratore
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCollaborators.map((username, idx) => {
                    const user = users.find(u => u.username === username);
                    const displayName = user ? `${user.nome} ${user.cognome}` : username;
                    
                    return (
                      <tr key={username} style={{ height: '44px' }}>
                        <td style={{
                          backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                          padding: '8px',
                          border: '1px solid var(--border-color)',
                          fontWeight: '500',
                          minWidth: '140px',
                          verticalAlign: 'middle',
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
                        padding: '8px 4px',
                        border: '1px solid var(--border-color)',
                        minWidth: '40px',
                        height: '40px',
                        fontSize: '10px'
                      }}>
                        {slot.endsWith(':00') ? slot : '·'}
                      </th>
                    ))}
                    <th style={{
                      backgroundColor: 'var(--table-header-bg)',
                      color: 'var(--button-text)',
                      padding: '8px 4px',
                      border: '1px solid var(--border-color)',
                      minWidth: '50px',
                      height: '40px',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}>
                      Ore
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedCollaborators.map((username, idx) => {
                    return (
                      <tr key={username} style={{ height: '44px' }}>
                        {timeSlots.map((slot, slotIndex) => {
                          const working = isWorking(username, day, slot);
                          const prevWorking = slotIndex > 0 && isWorking(username, day, timeSlots[slotIndex - 1]);
                          const nextWorking = slotIndex < timeSlots.length - 1 && isWorking(username, day, timeSlots[slotIndex + 1]);
                          
                          // Ottieni il colore in base alla posizione
                          const user = users.find(u => u.username === username);
                          const posizione = user?.posizione || "sala";
                          let barColor = '#5AC8FA'; // Sala (blu soft)
                          if (posizione === "cucina") {
                            barColor = '#FFA366'; // Cucina (arancione soft)
                          } else if (posizione === "bar") {
                            barColor = '#C084FC'; // Bar (viola soft)
                          }
                          
                          // Determina i border-radius
                          let borderRadius = '0px';
                          if (working) {
                            const topLeft = !prevWorking ? '14px' : '0px';
                            const bottomLeft = !prevWorking ? '14px' : '0px';
                            const topRight = !nextWorking ? '14px' : '0px';
                            const bottomRight = !nextWorking ? '14px' : '0px';
                            borderRadius = `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
                          }
                          
                          return (
                            <td key={slot} style={{
                              backgroundColor: working 
                                ? barColor
                                : (idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)'),
                              borderTop: '1px solid var(--border-color)',
                              borderBottom: '1px solid var(--border-color)',
                              borderLeft: slotIndex === 0 || (!prevWorking && working) ? '1px solid var(--border-color)' : 'none',
                              borderRight: nextWorking && working ? 'none' : '1px solid var(--border-color)',
                              padding: '4px',
                              textAlign: 'center',
                              borderRadius: borderRadius,
                              verticalAlign: 'middle'
                            }}>
                            </td>
                          );
                        })}
                        <td style={{
                          backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                          border: '1px solid var(--border-color)',
                          padding: '4px 6px',
                          textAlign: 'center',
                          minWidth: '50px',
                          fontWeight: 'bold',
                          fontSize: '10px',
                          verticalAlign: 'middle',
                          whiteSpace: 'nowrap'
                        }}>
                          {(() => {
                            const dayData = shift.grid[username]?.[day];
                            if (!dayData) return '0h';
                            return calculateHours(dayData.in1, dayData.out1, dayData.in2, dayData.out2);
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
      ))}

      {/* Riepilogo settimanale */}
      <div style={{ marginTop: '60px', borderTop: '3px solid var(--border-color)', paddingTop: '20px' }}>
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
                {displayedCollaborators.map((username, idx) => {
                  const user = users.find(u => u.username === username);
                  const displayName = user ? `${user.nome} ${user.cognome}` : username;
                  return (
                    <tr key={username} style={{ height: '36px' }}>
                      <td style={{
                        backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                        padding: '8px',
                        border: '1px solid var(--border-color)',
                        fontWeight: '500',
                        verticalAlign: 'middle'
                      }}>
                        {displayName}
                      </td>
                    </tr>
                  );
                })}
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
                    <th key={d} style={{
                      backgroundColor: 'var(--table-header-bg)',
                      color: 'var(--button-text)',
                      padding: '8px',
                      border: '1px solid var(--border-color)',
                      minWidth: '80px',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '10px'
                    }}>
                      {dayLabels[d]}
                    </th>
                  ))}
                  <th style={{
                    backgroundColor: '#27ae60',
                    color: 'white',
                    padding: '8px',
                    border: '1px solid var(--border-color)',
                    minWidth: '80px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    fontSize: '10px'
                  }}>
                    TOTALE
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedCollaborators.map((username, idx) => {
                  return (
                    <tr key={username} style={{ height: '36px' }}>
                      {days.map(d => {
                        const dayData = shift.grid[username]?.[d];
                        return (
                          <td key={d} style={{
                            backgroundColor: idx % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                            border: '1px solid var(--border-color)',
                            padding: '8px',
                            textAlign: 'center',
                            fontWeight: '500',
                            fontSize: '10px',
                            verticalAlign: 'middle',
                            whiteSpace: 'nowrap'
                          }}>
                            {dayData ? calculateHours(dayData.in1, dayData.out1, dayData.in2, dayData.out2) : '0h'}
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
                            const dayData = shift.grid[username]?.[d];
                            if (!dayData) return sum;
                            const timeToMinutes = (time) => {
                              if (!time) return 0;
                              const [h, m] = time.split(':').map(Number);
                              return h * 60 + m;
                            };
                            let dayMinutes = 0;
                            if (dayData.in1 && dayData.out1) dayMinutes += timeToMinutes(dayData.out1) - timeToMinutes(dayData.in1);
                            if (dayData.in2 && dayData.out2) dayMinutes += timeToMinutes(dayData.out2) - timeToMinutes(dayData.in2);
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
    </div>
  );
}
