import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function GeneratoreTurni({ templates, generatedShifts, onAddGeneratedShift, onDeleteGeneratedShift }) {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
    startDate: getNextMonday(),
    endDate: getSundayOfWeek(getNextMonday())
  });

  // Calcola il prossimo lunedì
  function getNextMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? 1 : (day === 1 ? 0 : 8 - day); // Se domenica: +1, se lunedì: 0, altrimenti prossimo lunedì
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + diff);
    return nextMonday.toISOString().split('T')[0];
  }

  // Calcola la domenica della settimana di una data
  function getSundayOfWeek(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    const sunday = new Date(date);
    sunday.setDate(date.getDate() + diff);
    return sunday.toISOString().split('T')[0];
  }

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setFormData({
      ...formData,
      startDate: newStart,
      endDate: getSundayOfWeek(newStart)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.templateId) {
      alert('⚠️ Inserisci nome turno e seleziona un modello');
      return;
    }

    const selectedTemplate = templates.find(t => t.id === formData.templateId);
    if (!selectedTemplate) {
      alert('⚠️ Modello non trovato');
      return;
    }

    // Crea il turno generato
    const generatedShift = {
      id: `shift_${Date.now()}`,
      name: formData.name,
      templateId: formData.templateId,
      templateName: selectedTemplate.name,
      startDate: formData.startDate,
      endDate: formData.endDate,
      grid: selectedTemplate.grid, // Copia la griglia dal template
      createdAt: new Date().toISOString()
    };

    onAddGeneratedShift(generatedShift);
    
    // Reindirizza alla vista Gantt
    navigate(`/view?id=${generatedShift.id}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0 }}>📅 Generatore Turni</h2>
        <button
          onClick={() => setShowForm(!showForm)}
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
          {showForm ? '✖ Annulla' : '➕ Nuovo Turno'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--card-bg)',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nome Turno:
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="es: Settimana 20-26 Gennaio"
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Modello:
            </label>
            <select
              value={formData.templateId}
              onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '14px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px'
              }}
            >
              <option value="">-- Seleziona Modello --</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Data Inizio (Lunedì):
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={handleStartDateChange}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Data Fine (Domenica):
              </label>
              <input
                type="date"
                value={formData.endDate}
                readOnly
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  opacity: 0.7
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: '#27ae60',
              color: 'white',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            ✅ Genera Turno
          </button>
        </form>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>📋 Turni Generati ({generatedShifts?.length || 0})</h3>
        {generatedShifts && generatedShifts.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {generatedShifts.map((shift, index) => (
              <div
                key={shift.id}
                style={{
                  backgroundColor: index % 2 === 0 ? 'var(--row-even)' : 'var(--row-odd)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '15px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{shift.name}</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    📅 {shift.startDate} → {shift.endDate}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    📋 Modello: {shift.templateName}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => navigate(`/view?id=${shift.id}`)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      backgroundColor: '#3498db',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    👁️ Visualizza
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Eliminare il turno "${shift.name}"?`)) {
                        onDeleteGeneratedShift(shift.id);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      backgroundColor: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px'
                    }}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Nessun turno generato. Creane uno nuovo!
          </p>
        )}
      </div>
    </div>
  );
}
