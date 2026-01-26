export const initialState = {
  users: [
    // {
    //   nome: "",
    //   cognome: "",
    //   username: "",
    //   password: "",
    //   collaboratore: true,
    //   livelloAmministrazione: 0, // 0: user normale, 1: manager, 2: boss
    //   tipoContratto: "full-time",
    //   oreContratto: 40,
    //   informazioniAggiuntive: ""
    // }
  ],
  templates: [
    // {
    //   id: "template-id",
    //   name: "Modello Settimanale",
    //   grid: {
    //     // chiave riga = username
    //     riccardosperotto: {
    //       lunedi: { in1: "", out1: "", in2: "", out2: "", ruolo: "" },
    //       martedi: { in1: "", out1: "", in2: "", out2: "", ruolo: "" },
    //       // ...
    //     }
    //   }
    // }
  ],
  timePresets: [
    // {
    //   id: "preset-1",
    //   name: "Mattina",
    //   in1: "08:00",
    //   out1: "15:30",
    //   in2: "",
    //   out2: ""
    // }
  ],
  generatedShifts: [
    // {
    //   id: "shift-id",
    //   name: "Settimana 20-26 Gennaio",
    //   templateId: "template-id",
    //   templateName: "Settimana Tipo",
    //   startDate: "2026-01-20",
    //   endDate: "2026-01-26",
    //   grid: { /* copia della grid del template */ },
    //   createdAt: "2026-01-20T10:00:00Z"
    // }
  ],
};
