
import { collection, getDocs, doc, setDoc, query, where, writeBatch, getDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import { mapDoc, withTimestamp, cleanupData } from "./base";
import { Product, Category } from "../types";
import { SystemRepo } from "./systemRepo";

export const ProductRepo = {
  getProducts: async (): Promise<Product[]> => {
    const q = query(collection(db, COLLECTIONS.PRODUCTS), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Product[];
  },

  getCategories: async (): Promise<Category[]> => {
    const q = query(collection(db, COLLECTIONS.CATEGORIES), where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Category[];
  },

  saveCategory: async (category: Category) => {
    const isNew = !category.createdAt;
    await runTransaction(db, async (transaction) => {
        const data = withTimestamp(cleanupData(category), isNew);
        transaction.set(doc(db, COLLECTIONS.CATEGORIES, category.id), data);
        await SystemRepo.logAction(isNew ? 'CREATE_CATEGORY' : 'UPDATE_CATEGORY', `${isNew ? 'Tạo' : 'Sửa'} danh mục: ${category.name}`);
    });
  },

  deleteCategory: async (id: string) => {
    const ref = doc(db, COLLECTIONS.CATEGORIES, id);
    const snap = await getDoc(ref);
    const name = snap.exists() ? snap.data().name : id;
    await deleteDoc(ref);
    await SystemRepo.logAction('DELETE_CATEGORY', `Xóa danh mục: ${name}`);
  },

  saveProduct: async (product: Product) => {
    const isNew = !product.createdAt;
    const now = Date.now();
    
    return await runTransaction(db, async (transaction) => {
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
    const ref = doc(db, COLLECTIONS.PRODUCTS, id);
    const snap = await getDoc(ref);
    const name = snap.exists() ? snap.data().name : id;
    await deleteDoc(ref);
    await SystemRepo.logAction('DELETE_PRODUCT', `Xóa vĩnh viễn hàng hóa: ${name}`);
  }
};
