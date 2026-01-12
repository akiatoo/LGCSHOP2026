
// Fix: Use namespace import for firestore to ensure availability of modular exports in all configurations
import * as firestore from "firebase/firestore";
const { collection, getDocs, doc, setDoc, query, where, orderBy, writeBatch, limit, deleteDoc, updateDoc, runTransaction, getDoc } = firestore as any;
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import { mapDoc, withTimestamp, cleanupData, getCurrentUserSync } from "./base";
import { User, AuditLog, Gift, InventoryTransaction } from "../types";
import { GoogleGenAI } from "@google/genai";
import { LocalDB } from "./localDb";

export const SystemRepo = {
  checkConnection: async (): Promise<{ success: boolean; hasAdmin: boolean }> => {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where("role", "==", "admin"), limit(1));
      const snapshot = await getDocs(q);
      return { success: true, hasAdmin: !snapshot.empty };
    } catch (e) {
      return { success: false, hasAdmin: false };
    }
  },

  login: async (username: string, password: string): Promise<User | null> => {
    const q = query(
      collection(db, COLLECTIONS.USERS), 
      where("username", "==", username.toLowerCase().trim()), 
      where("password", "==", password),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const user = mapDoc(snapshot.docs[0]) as User;
    localStorage.setItem('vietpos_session_user', JSON.stringify(user));
    await SystemRepo.logAction('LOGIN', `Đăng nhập thành công vào hệ thống.`);
    return user;
  },

  // Fix: Adding missing createAdmin method to initialize system administrator
  createAdmin: async (username: string, password: string): Promise<void> => {
    const id = 'admin_root';
    const user: Partial<User> = {
      id,
      username: username.toLowerCase().trim(),
      password,
      fullName: 'Quản trị viên hệ thống',
      role: 'admin',
      isActive: true
    };
    await setDoc(doc(db, COLLECTIONS.USERS, id), withTimestamp(user, true));
    await SystemRepo.logAction('INITIALIZE_ADMIN', `Khởi tạo tài khoản quản trị gốc.`);
  },

  // Fix: Adding missing resetByRecoveryCode method to recover account access
  resetByRecoveryCode: async (username: string, code: string): Promise<boolean> => {
    if (code.trim().toUpperCase() !== 'LGC2026') return false;
    
    const q = query(
      collection(db, COLLECTIONS.USERS), 
      where("username", "==", username.toLowerCase().trim()),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    
    const userDoc = snapshot.docs[0];
    await updateDoc(userDoc.ref, { 
      password: '123', 
      updatedAt: Date.now() 
    });
    
    await SystemRepo.logAction('RECOVERY_PASSWORD', `Khôi phục mật khẩu cho tài khoản: ${username}`);
    return true;
  },

  getNextDocumentNumber: async (type: 'invoice' | 'import' | 'export' | 'scrap' | 'internal' | 'production'): Promise<string> => {
    const counterRef = doc(db, 'counters', type);
    const year = new Date().getFullYear().toString().slice(-2);
    
    return await runTransaction(db, async (transaction: any) => {
      const counterSnap = await transaction.get(counterRef);
      let nextNum = 1;
      if (counterSnap.exists()) {
        const data = counterSnap.data();
        if (data.year === year) {
          nextNum = data.lastNumber + 1;
        }
      }
      
      transaction.set(counterRef, { lastNumber: nextNum, year: year }, { merge: true });
      
      const numStr = nextNum.toString().padStart(8, '0');
      if (type === 'invoice') return `HD${year}-${numStr}`;
      if (type === 'import') return `PN${year}-${numStr}`;
      if (type === 'scrap') return `XH${year}-${numStr}`;
      if (type === 'internal') return `XNB${year}-${numStr}`;
      if (type === 'production') return `XSX${year}-${numStr}`;
      return `PX${year}-${numStr}`;
    });
  },

  getUsers: async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return snapshot.docs.map(mapDoc) as User[];
  },

  saveUser: async (user: User) => {
    const isNew = !user.createdAt;
    
    // Logic bảo vệ tài khoản gốc đặc biệt
    if (user.id === 'admin_root') {
        const userRef = doc(db, COLLECTIONS.USERS, 'admin_root');
        const snap = await getDoc(userRef);
        if (snap.exists()) {
            user.role = 'admin'; // Cưỡng chế quyền
            user.isActive = true; // Cưỡng chế hoạt động
        }
    }

    const userData = { ...user, username: user.username.toLowerCase().trim() };
    await setDoc(doc(db, COLLECTIONS.USERS, user.id), withTimestamp(userData, isNew), { merge: true });
    await SystemRepo.logAction(isNew ? 'CREATE_USER' : 'UPDATE_USER', `${isNew ? 'Tạo mới' : 'Cập nhật'} tài khoản: ${user.fullName}`);
  },

  deleteUser: async (id: string) => {
    if (id === 'admin_root') throw new Error("Hệ thống từ chối xóa tài khoản quản trị gốc.");
    
    const userRef = doc(db, COLLECTIONS.USERS, id);
    const snap = await getDoc(userRef);
    const name = snap.exists() ? snap.data().fullName : id;
    await deleteDoc(userRef);
    await SystemRepo.logAction('DELETE_USER', `Xóa vĩnh viễn quyền truy cập của: ${name}`);
  },

  updateUserPassword: async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> => {
    const user = getCurrentUserSync();
    if (!user) return { success: false, message: 'Chưa đăng nhập' };
    
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) return { success: false, message: 'Người dùng không tồn tại' };
    if (userSnap.data().password !== oldPassword) return { success: false, message: 'Mật khẩu cũ không chính xác' };

    await updateDoc(userRef, { password: newPassword, updatedAt: Date.now() });
    await SystemRepo.logAction('CHANGE_PASSWORD', `Người dùng tự thay đổi mật khẩu đăng nhập.`);
    return { success: true };
  },

  logAction: async (action: string, details: string) => {
    try {
      const currentUser = getCurrentUserSync();
      const userId = currentUser?.id || 'system';
      const id = `LOG_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const finalDetails = currentUser ? `[${currentUser.role.toUpperCase()}] ${details}` : details;

      await setDoc(doc(db, COLLECTIONS.AUDIT_LOGS, id), cleanupData({
        id, userId, userName: currentUser?.fullName || 'Hệ thống',
        action, details: finalDetails, timestamp: Date.now()
      }));
    } catch (e) {}
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const q = query(collection(db, COLLECTIONS.AUDIT_LOGS), orderBy('timestamp', 'desc'), limit(500));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as AuditLog[];
  },

  getGifts: async (): Promise<Gift[]> => {
    const q = query(collection(db, COLLECTIONS.GIFTS), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Gift[];
  },

  saveGift: async (gift: Gift) => {
    const isNew = !gift.createdAt;
    await runTransaction(db, async (transaction: any) => {
        const giftRef = doc(db, COLLECTIONS.GIFTS, gift.id);
        const data = withTimestamp(cleanupData(gift), isNew);
        transaction.set(giftRef, data, { merge: true });
        await SystemRepo.logAction(isNew ? 'CREATE_GIFT' : 'UPDATE_GIFT', `${isNew ? 'Thiết lập' : 'Cập nhật'} quà tặng: ${gift.name}`);
    });
  },

  deleteGift: async (id: string) => {
    const giftRef = doc(db, COLLECTIONS.GIFTS, id);
    const snap = await getDoc(giftRef);
    const name = snap.exists() ? snap.data().name : id;
    await deleteDoc(giftRef);
    await SystemRepo.logAction('DELETE_GIFT', `Hủy bỏ chương trình quà tặng: ${name}`);
  },

  generateProductDescription: async (name: string, category: string, specs: string): Promise<string> => {
    // Fix: Use correct initialization as per Gemini SDK guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const prompt = `Bạn là chuyên gia tư vấn bán hàng chuyên nghiệp. Hãy viết lời giới thiệu ngắn gọn (tối đa 35 từ) cho sản phẩm ${name} thuộc loại ${category} với thông số: ${specs}. Văn phong hiện đại, súc tích.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      // Fix: Access text property directly (it's not a function in the new SDK)
      return response.text?.trim() || "";
    } catch (e) { return "Sản phẩm chất lượng cao, phục vụ tốt nhu cầu khách hàng."; }
  },

  getSmartInsights: async (dataContext?: string): Promise<string> => {
    // Fix: Use correct initialization as per Gemini SDK guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const prompt = `Bạn là cố vấn tài chính kinh doanh. Dựa trên dữ liệu tài chính: ${dataContext || 'Không có dữ liệu'}. Hãy đưa ra 3 lời khuyên cực ngắn gọn để tối ưu hóa doanh thu và quản lý kho.`;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: prompt,
        config: { 
          // Rule: Set maxOutputTokens and thinkingBudget together for Gemini 3 reasoning models
          maxOutputTokens: 2000,
          thinkingConfig: { thinkingBudget: 1000 } 
        }
      });
      // Fix: Access text property directly (it's not a function in the new SDK)
      return response.text || "Duy trì kiểm soát tốt tồn kho và chăm sóc khách hàng thân thiết.";
    } catch { return "AI đang bận phân tích, vui lòng quay lại sau."; }
  },

  factoryReset: async (fullReset: boolean) => {
    await SystemRepo.logAction('FACTORY_RESET', `Dọn dẹp hệ thống: ${fullReset ? 'XÓA TOÀN BỘ' : 'LÀM SẠCH GIAO DỊCH'}`);
    const cols = fullReset 
      ? Object.values(COLLECTIONS)
      : [COLLECTIONS.ORDERS, COLLECTIONS.TRANSACTIONS, COLLECTIONS.AUDIT_LOGS, COLLECTIONS.WARRANTIES, COLLECTIONS.EXPENSES];
    for (const colName of cols) {
        if (colName === COLLECTIONS.PENDING_ORDERS) continue;
        const snap = await getDocs(collection(db, colName));
        const batch = writeBatch(db);
        snap.forEach(d => {
            if (colName === COLLECTIONS.USERS && d.id === 'admin_root') return; 
            batch.delete(d.ref);
        });
        await batch.commit();
    }
    const yr = new Date().getFullYear().toString().slice(-2);
    const batch = writeBatch(db);
    ['invoice', 'import', 'export', 'scrap', 'internal', 'production'].forEach(t => batch.set(doc(db, 'counters', t), { lastNumber: 0, year: yr }));
    await batch.commit();
    if (fullReset) {
      await LocalDB.clearDatabase();
      localStorage.clear();
    }
  }
};
