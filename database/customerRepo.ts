
// Fix: Use namespace import for firestore to ensure all modular functions are accessible
import * as firestore from "firebase/firestore";
const { collection, getDocs, doc, query, where, writeBatch, setDoc, deleteDoc, runTransaction, getDoc } = firestore as any;
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import { mapDoc, withTimestamp } from "./base";
import { Customer, Supplier } from "../types";
import { SystemRepo } from "./systemRepo";

// Hàm tiện ích chuẩn hóa số điện thoại (chỉ giữ lại số)
const normalizePhone = (phone: string) => phone ? phone.replace(/[^0-9]/g, '') : '';

export const CustomerRepo = {
  getCustomers: async (): Promise<Customer[]> => {
    const q = query(collection(db, COLLECTIONS.CUSTOMERS), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Customer[];
  },

  getSuppliers: async (): Promise<Supplier[]> => {
    const q = query(collection(db, COLLECTIONS.SUPPLIERS), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Supplier[];
  },

  saveCustomer: async (customer: Customer) => {
    const isNew = !customer.createdAt;
    const cleanPhone = normalizePhone(customer.phone);
    
    if (cleanPhone.length < 10) {
      throw new Error("Số điện thoại không hợp lệ (tối thiểu 10 số).");
    }

    return await runTransaction(db, async (transaction: any) => {
      // Kiểm tra trùng lặp dựa trên số điện thoại đã chuẩn hóa
      const phoneQuery = query(
        collection(db, COLLECTIONS.CUSTOMERS), 
        where("phone", "==", cleanPhone),
        where("isActive", "==", true)
      );
      const phoneSnap = await getDocs(phoneQuery);
      
      const duplicate = phoneSnap.docs.find(d => d.id !== customer.id);
      if (duplicate) {
        throw new Error(`Số điện thoại ${cleanPhone} đã được đăng ký bởi khách hàng "${duplicate.data().name}".`);
      }

      const customerRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
      const data = withTimestamp({ ...customer, phone: cleanPhone }, isNew);
      transaction.set(customerRef, data, { merge: true });

      await SystemRepo.logAction(
        isNew ? 'CREATE_CUSTOMER' : 'UPDATE_CUSTOMER', 
        `${isNew ? 'Thêm mới' : 'Cập nhật'} khách hàng: ${customer.name} (${cleanPhone})`
      );

      return customer;
    });
  },

  deleteCustomer: async (id: string) => {
    const customerRef = doc(db, COLLECTIONS.CUSTOMERS, id);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) return;

    const name = snap.data().name;
    await deleteDoc(customerRef);
    await SystemRepo.logAction('DELETE_CUSTOMER', `Xóa khách hàng: ${name} (ID: ${id})`);
  },

  saveSupplier: async (supplier: Supplier) => {
    const isNew = !supplier.createdAt;
    const cleanName = supplier.name.trim();
    const cleanPhone = normalizePhone(supplier.phone);

    if (!cleanName) throw new Error("Tên nhà cung cấp không được để trống.");
    if (cleanPhone.length < 10) throw new Error("Số điện thoại nhà cung cấp không hợp lệ.");

    return await runTransaction(db, async (transaction: any) => {
      // 1. Kiểm tra trùng tên (không phân biệt hoa thường)
      const nameQuery = query(
        collection(db, COLLECTIONS.SUPPLIERS), 
        where("isActive", "==", true)
      );
      const allSuppliersSnap = await getDocs(nameQuery);
      
      const duplicateName = allSuppliersSnap.docs.find(d => 
        d.id !== supplier.id && 
        d.data().name.trim().toLowerCase() === cleanName.toLowerCase()
      );
      
      if (duplicateName) {
        throw new Error(`Nhà cung cấp "${cleanName}" đã tồn tại trên hệ thống.`);
      }

      // 2. Kiểm tra trùng số điện thoại
      const duplicatePhone = allSuppliersSnap.docs.find(d => 
        d.id !== supplier.id && 
        normalizePhone(d.data().phone) === cleanPhone
      );

      if (duplicatePhone) {
        throw new Error(`Số điện thoại "${cleanPhone}" đã được sử dụng bởi đối tác "${duplicatePhone.data().name}".`);
      }

      const supplierRef = doc(db, COLLECTIONS.SUPPLIERS, supplier.id);
      const data = withTimestamp({ 
        ...supplier, 
        name: cleanName, 
        phone: cleanPhone,
        email: supplier.email?.trim().toLowerCase() || ''
      }, isNew);
      
      transaction.set(supplierRef, data, { merge: true });

      await SystemRepo.logAction(
        isNew ? 'CREATE_SUPPLIER' : 'UPDATE_SUPPLIER', 
        `${isNew ? 'Thêm mới' : 'Cập nhật'} nhà cung cấp: ${cleanName}`
      );

      return supplier;
    });
  },

  deleteSupplier: async (id: string) => {
    const supplierRef = doc(db, COLLECTIONS.SUPPLIERS, id);
    const snap = await getDoc(supplierRef);
    if (!snap.exists()) return;

    const name = snap.data().name;
    
    // Thực hiện xóa cứng nhưng lưu log để hậu kiểm
    await deleteDoc(supplierRef);
    await SystemRepo.logAction('DELETE_SUPPLIER', `Xóa nhà cung cấp: ${name} (ID: ${id})`);
  },

  saveCustomers: async (customers: Customer[]) => {
    const batch = writeBatch(db);
    customers.forEach(c => {
      const data = withTimestamp({ ...c, phone: normalizePhone(c.phone) }, !c.createdAt);
      batch.set(doc(db, COLLECTIONS.CUSTOMERS, c.id), data);
    });
    await batch.commit();
  },

  saveSuppliers: async (suppliers: Supplier[]) => {
    const batch = writeBatch(db);
    suppliers.forEach(s => {
      const data = withTimestamp({
        ...s,
        name: s.name.trim(),
        phone: normalizePhone(s.phone)
      }, !s.createdAt);
      batch.set(doc(db, COLLECTIONS.SUPPLIERS, s.id), data);
    });
    await batch.commit();
  }
};
