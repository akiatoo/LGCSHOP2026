
// Fix: Use namespace import for firestore to ensure availability of members in all build environments
import * as firestore from "firebase/firestore";
const { query, collection, where, getDocs, runTransaction, doc, getDoc, deleteDoc } = firestore as any;
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import { mapDoc, withTimestamp, cleanupData } from "./base";
import { Product, Category } from "../types";
import { SystemRepo } from "./systemRepo";

export const ProductRepo = {
  getProducts: async (): Promise<Product[]> => {
    // Fix: Use destructured firestore functions
    const q = query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Product[];
  },

  getCategories: async (): Promise<Category[]> => {
    // Fix: Use destructured firestore functions
    const q = query(collection(db, COLLECTIONS.CATEGORIES), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Category[];
  },

  saveCategory: async (category: Category) => {
    const isNew = !category.createdAt;
    // Fix: Use destructured firestore functions
    await runTransaction(db, async (transaction: any) => {
        const data = withTimestamp(cleanupData(category), isNew);
        transaction.set(doc(db, COLLECTIONS.CATEGORIES, category.id), data);
        await SystemRepo.logAction(isNew ? 'CREATE_CATEGORY' : 'UPDATE_CATEGORY', `${isNew ? 'Tạo' : 'Sửa'} danh mục: ${category.name}`);
    });
  },

  deleteCategory: async (id: string) => {
    // Fix: Use destructured firestore functions
    const ref = doc(db, COLLECTIONS.CATEGORIES, id);
    const snap = await getDoc(ref);
    const name = snap.exists() ? snap.data().name : id;
    await deleteDoc(ref);
    await SystemRepo.logAction('DELETE_CATEGORY', `Xóa danh mục: ${name}`);
  },

  saveProduct: async (product: Product) => {
    const isNew = !product.createdAt;
    const now = Date.now();
    
    // Fix: Use destructured firestore functions
    return await runTransaction(db, async (transaction: any) => {
        // 1. Logic tự động đồng bộ tên danh mục từ ID
        let finalCategoryName = product.categoryName || 'Khác';
        if (product.categoryId) {
            const catRef = doc(db, COLLECTIONS.CATEGORIES, product.categoryId);
            const catSnap = await transaction.get(catRef);
            if (catSnap.exists()) {
                finalCategoryName = catSnap.data().name;
            }
        }

        const productData = {
            ...product,
            categoryName: finalCategoryName,
            updatedAt: now
        };

        const finalData = withTimestamp(cleanupData(productData), isNew);
        const productRef = doc(db, COLLECTIONS.PRODUCTS, product.id);
        
        transaction.set(productRef, finalData, { merge: true });

        // 2. Khởi tạo tồn kho đầu kỳ nếu là sản phẩm mới và có số lượng tồn
        if (isNew && product.stock > 0) {
            const txId = `TX_INIT_${now}_${product.id}`;
            transaction.set(doc(db, COLLECTIONS.TRANSACTIONS, txId), cleanupData({
                id: txId,
                code: 'TON-DAU',
                productId: product.id,
                productName: product.name,
                sku: product.sku || `SKU-${now}`,
                type: 'import',
                quantity: product.stock,
                balance: product.stock,
                oldStock: 0,
                newStock: product.stock,
                timestamp: now,
                unitPrice: product.costPrice || 0,
                note: 'Khởi tạo tồn kho ban đầu',
                createdAt: now,
                updatedAt: now,
                isActive: true
            }));
        }

        await SystemRepo.logAction(
            isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT', 
            `${isNew ? 'Thêm mới' : 'Cập nhật'} ${product.type === 'material' ? 'vật tư' : 'sản phẩm'}: ${product.name}`
        );

        return true;
    });
  },

  deleteProduct: async (id: string) => {
    // Fix: Use destructured firestore functions
    const ref = doc(db, COLLECTIONS.PRODUCTS, id);
    const snap = await getDoc(ref);
    const name = snap.exists() ? snap.data().name : id;
    await deleteDoc(ref);
    await SystemRepo.logAction('DELETE_PRODUCT', `Xóa vĩnh viễn hàng hóa: ${name}`);
  }
};
