
export const DB_NAME = 'LGC_SHOP_LOCAL';
export const DB_VERSION = 8;

export const openLocalDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      const stores = [
        'products', 
        'categories', 
        'orders', 
        'customers', 
        'suppliers', 
        'gifts', 
        'transactions', 
        'warranties', 
        'users',
        'templates',
        'audit_logs',
        'settings',
        'pending_orders'
      ];
      
      stores.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => {
      console.error("LocalDB Open Error:", event.target.error);
      reject(event.target.error);
    };
  });
};

export const LocalDB = {
  async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const db = await openLocalDB();
      if (!db.objectStoreNames.contains(storeName)) {
        return [];
      }
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return [];
    }
  },

  async put<T>(storeName: string, data: T): Promise<void> {
    try {
      const db = await openLocalDB();
      if (!db.objectStoreNames.contains(storeName)) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {}
  },

  async putBatch<T>(storeName: string, items: T[]): Promise<void> {
    if (!items || items.length === 0) return;
    try {
      const db = await openLocalDB();
      if (!db.objectStoreNames.contains(storeName)) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        items.forEach(item => {
          if (item) store.put(item);
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {}
  },

  async delete(storeName: string, id: string): Promise<void> {
    try {
      const db = await openLocalDB();
      if (!db.objectStoreNames.contains(storeName)) return;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {}
  },

  // Mới: Xóa sạch hoàn toàn IndexedDB
  async clearDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => {
            console.log("Local IndexedDB deleted successfully");
            resolve();
        };
        request.onerror = () => {
            console.error("Error deleting local IndexedDB");
            reject();
        };
        request.onblocked = () => {
            console.warn("Database deletion blocked. Closing all connections...");
            resolve(); // Vẫn resolve để tránh treo UI
        };
    });
  }
};
