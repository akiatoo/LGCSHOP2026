
import { collection, getDocs, doc, setDoc, query, where, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import { mapDoc, withTimestamp } from "./base";
import { PrintTemplate } from "../types";

export const TemplateRepo = {
  getTemplates: async (): Promise<PrintTemplate[]> => {
    const q = query(collection(db, COLLECTIONS.TEMPLATES));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as PrintTemplate[];
  },

  getTemplateByType: async (type: string): Promise<PrintTemplate | null> => {
    const q = query(collection(db, COLLECTIONS.TEMPLATES), where("type", "==", type), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return mapDoc(snapshot.docs[0]) as PrintTemplate;
  },

  saveTemplate: async (template: PrintTemplate) => {
    const data = withTimestamp(template, !template.createdAt);
    await setDoc(doc(db, COLLECTIONS.TEMPLATES, template.id), data);
  },

  deleteTemplate: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.TEMPLATES, id));
  }
};
