import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const STATE_DOC_ID = "mainState"; // ID unico del documento principale

/**
 * Salva lo stato su Firestore
 */
export const saveState = async (state) => {
  try {
    await setDoc(doc(db, "appState", STATE_DOC_ID), state);
    console.log("✅ Stato salvato su Firebase");
  } catch (error) {
    console.error("❌ Errore nel salvataggio:", error);
  }
};

/**
 * Carica lo stato da Firestore
 */
export const loadState = async () => {
  try {
    const docSnap = await getDoc(doc(db, "appState", STATE_DOC_ID));
    if (docSnap.exists()) {
      console.log("✅ Stato caricato da Firebase:", docSnap.data());
      return docSnap.data();
    } else {
      console.log("⚠️ Nessuno stato trovato su Firebase (primo accesso)");
      return null;
    }
  } catch (error) {
    console.error("❌ Errore nel caricamento:", error);
    return null;
  }
};
