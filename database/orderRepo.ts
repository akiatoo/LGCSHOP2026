
import { collection, doc, query, orderBy, getDocs, runTransaction, DocumentSnapshot, where, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config";
import { COLLECTIONS } from "./collections";
import { mapDoc, withTimestamp, getCurrentUserSync, cleanupData } from "./base";
import { Order, InventoryTransaction, WarrantyItem, Product, Customer, Gift } from "../types";
import { SystemRepo } from "./systemRepo";

export const OrderRepo = {
  getOrders: async (): Promise<Order[]> => {
    const q = query(collection(db, COLLECTIONS.ORDERS), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Order[];
  },

  getOrdersByCustomer: async (customerId: string): Promise<Order[]> => {
    const q = query(
      collection(db, COLLECTIONS.ORDERS), 
      where("customerId", "==", customerId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as Order[];
  },

  getTransactions: async (): Promise<InventoryTransaction[]> => {
    const q = query(collection(db, COLLECTIONS.TRANSACTIONS), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as InventoryTransaction[];
  },

  getWarranties: async (): Promise<WarrantyItem[]> => {
    const q = query(collection(db, COLLECTIONS.WARRANTIES), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(mapDoc) as WarrantyItem[];
  },

  saveWarranty: async (warranty: WarrantyItem) => {
    const isNew = !warranty.createdAt;
    const now = Date.now();
    const cleanSerial = warranty.serialNumber.trim().toUpperCase();

    return await runTransaction(db, async (transaction) => {
      const serialQuery = query(
        collection(db, COLLECTIONS.WARRANTIES),
        where("serialNumber", "==", cleanSerial),
        where("isActive", "==", true)
      );
      const serialSnap = await getDocs(serialQuery);
      const duplicate = serialSnap.docs.find(d => d.id !== warranty.id);
      
      if (duplicate) {
        const dData = duplicate.data();
        if (dData.status !== 'void' && dData.status !== 'expired') {
            throw new Error(`Số Serial/IMEI "${cleanSerial}" đã tồn tại cho khách hàng "${dData.customerName}".`);
        }
      }

      const warrantyRef = doc(db, COLLECTIONS.WARRANTIES, warranty.id);
      const oldSnap = await transaction.get(warrantyRef);
      
      let finalHistory = warranty.history || [];
      const updatedData = { ...warranty, serialNumber: cleanSerial };

      if (oldSnap.exists()) {
          const oldData = oldSnap.data() as WarrantyItem;
          if (oldData.status !== warranty.status) {
              const statusLabels: Record<string, string> = {
                  active: 'Kích hoạt/Còn hạn',
                  repairing: 'Đang sửa chữa',
                  expired: 'Hết hạn',
                  void: 'Hủy bỏ'
              };
              finalHistory.push({
                  date: now,
                  action: 'Đổi trạng thái',
                  note: `Chuyển từ [${statusLabels[oldData.status] || oldData.status}] sang [${statusLabels[warranty.status] || warranty.status}]`
              });
          }
          if (finalHistory.length > 50) finalHistory = finalHistory.slice(-50);
      } else {
          if (finalHistory.length === 0) {
              finalHistory.push({
                  date: now,
                  action: 'Khởi tạo',
                  note: 'Tạo mới hồ sơ bảo hành hệ thống.'
              });
          }
      }

      const dataToSave = withTimestamp(cleanupData({ ...updatedData, history: finalHistory }), isNew);
      transaction.set(warrantyRef, dataToSave, { merge: true });
      await SystemRepo.logAction(isNew ? 'CREATE_WARRANTY' : 'UPDATE_WARRANTY', `${isNew ? 'Lập mới' : 'Cập nhật'} bảo hành: ${cleanSerial}`);
      return true;
    });
  },

  deleteWarranty: async (id: string) => {
    const ref = doc(db, COLLECTIONS.WARRANTIES, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const serial = snap.data().serialNumber;
    await deleteDoc(ref);
    await SystemRepo.logAction('DELETE_WARRANTY', `Xóa vĩnh viễn hồ sơ bảo hành: ${serial}`);
  },

  saveOrder: async (order: Order): Promise<Order> => {
    const now = Date.now();
    const currentUser = getCurrentUserSync();
    const year = new Date().getFullYear().toString().slice(-2);

    return await runTransaction(db, async (transaction) => {
      const counterRef = doc(db, 'counters', 'invoice');
      const counterSnap = await transaction.get(counterRef);

      const productSnapsMap: Record<string, {ref: any, data: Product}> = {};
      for (const item of order.items) {
          const pRef = doc(db, COLLECTIONS.PRODUCTS, item.id);
          const pSnap = await transaction.get(pRef);
          if (pSnap.exists()) {
              productSnapsMap[item.id] = { ref: pRef, data: pSnap.data() as Product };
          }
      }

      const giftRefsMap: Record<string, {ref: any, data: Gift}> = {};
      let totalPointsRequired = 0;
      for (const item of order.items) {
          if (item.isGift) {
              totalPointsRequired += (item.pointsRequired || 0) * item.quantity;
              const giftQuery = query(collection(db, COLLECTIONS.GIFTS), where("productId", "==", item.id));
              const giftQuerySnap = await getDocs(giftQuery);
              if (!giftQuerySnap.empty) {
                  const gDocRef = giftQuerySnap.docs[0].ref;
                  const gSnap = await transaction.get(gDocRef);
                  if (gSnap.exists()) {
                      giftRefsMap[item.id] = { ref: gDocRef, data: gSnap.data() as Gift };
                  }
              }
          }
      }

      let customerRef = null;
      let currentCustomerPoints = 0;
      let currentCustomerTotalSpent = 0;
      if (order.customerId && order.customerId !== 'walk-in') {
          customerRef = doc(db, COLLECTIONS.CUSTOMERS, order.customerId);
          const cSnap = await transaction.get(customerRef);
          if (cSnap.exists()) {
              const cData = cSnap.data() as Customer;
              currentCustomerPoints = cData.loyaltyPoints || 0;
              currentCustomerTotalSpent = cData.totalSpent || 0;
              if (currentCustomerPoints < totalPointsRequired) {
                  throw new Error(`Khách không đủ ${totalPointsRequired} điểm để đổi quà.`);
              }
          }
      } else if (totalPointsRequired > 0) {
          throw new Error("Cần chọn khách hàng thành viên để đổi quà tri ân.");
      }

      let nextNum = 1;
      if (counterSnap.exists()) {
        const cData = counterSnap.data();
        if (cData.year === year) nextNum = cData.lastNumber + 1;
      }
      const finalOrderCode = `HD${year}-${nextNum.toString().padStart(8, '0')}`;

      const processedItems = order.items.map((item, index) => {
          const pEntry = productSnapsMap[item.id];
          if (!pEntry) throw new Error(`Sản phẩm "${item.name}" không tồn tại.`);
          const pData = pEntry.data;
          
          if (pData.stock < item.quantity) {
              throw new Error(`Kho không đủ hàng cho "${item.name}" (Hiện có: ${pData.stock}).`);
          }

          const newStock = pData.stock - item.quantity;
          transaction.update(pEntry.ref, { stock: newStock, updatedAt: now });

          if (item.isGift && giftRefsMap[item.id]) {
              const gEntry = giftRefsMap[item.id];
              const newGiftStock = Math.max(0, (gEntry.data.stock || 0) - item.quantity);
              transaction.update(gEntry.ref, { stock: newGiftStock, updatedAt: now });
          }

          const txId = `TX_${now}_${item.id}_${index}`;
          transaction.set(doc(db, COLLECTIONS.TRANSACTIONS, txId), cleanupData({
            id: txId, code: finalOrderCode, productId: item.id, productName: item.name, sku: pData.sku, 
            type: 'sale', quantity: -item.quantity, balance: newStock, oldStock: pData.stock, newStock, 
            timestamp: now, unitPrice: item.appliedPrice ?? item.price, referenceId: order.id, 
            supplierName: order.customerName, receiver: order.customerName, 
            note: `Bán hàng đơn ${finalOrderCode}`, 
            createdAt: now, updatedAt: now, isActive: true
          }));

          if (item.hasSerial && item.serials?.length > 0 && (item.warrantyPeriod || 0) > 0) {
              item.serials.forEach((sn, snIdx) => {
                  const warrantyId = `W_${finalOrderCode}_${item.id}_${snIdx}`;
                  const expiryDate = new Date(now);
                  expiryDate.setMonth(expiryDate.getMonth() + (item.warrantyPeriod || 0));
                  transaction.set(doc(db, COLLECTIONS.WARRANTIES, warrantyId), cleanupData({
                      id: warrantyId, serialNumber: sn.trim().toUpperCase(), productId: item.id, productName: item.name, 
                      orderId: order.id, customerId: order.customerId || 'walk-in', customerName: order.customerName, 
                      customerPhone: order.customerPhone, purchaseDate: now, expiryDate: expiryDate.getTime(), 
                      durationMonths: item.warrantyPeriod || 0, status: 'active', notes: `Từ đơn ${finalOrderCode}`, 
                      history: [{ date: now, action: 'Kích hoạt', note: `Bảo hành tự động.` }], 
                      createdAt: now, updatedAt: now, isActive: true
                  }));
              });
          }
          // QUAN TRỌNG: Chốt giá vốn thực tế tại thời điểm bán để báo cáo lãi lỗ chính xác
          return { ...item, costPrice: pData.costPrice || 0, type: pData.type };
      });

      if (customerRef) {
          const earnedPoints = Math.floor(order.total / 100000); 
          const newLoyaltyPoints = currentCustomerPoints - totalPointsRequired + earnedPoints;
          transaction.update(customerRef, { 
            loyaltyPoints: newLoyaltyPoints, 
            totalSpent: currentCustomerTotalSpent + order.total,
            lastPurchaseDate: now, 
            updatedAt: now 
          });
      }

      transaction.set(counterRef, { lastNumber: nextNum, year: year }, { merge: true });
      const orderFinal = withTimestamp({ ...order, items: processedItems, code: finalOrderCode, staffName: currentUser?.fullName || 'N/A', timestamp: now, status: 'completed' }, true) as Order;
      transaction.set(doc(db, COLLECTIONS.ORDERS, order.id), orderFinal);
      return orderFinal;
    });
  },

  cancelOrder: async (orderId: string) => {
    const now = Date.now();
    return await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) throw new Error("Đơn hàng không tồn tại.");
      const orderData = orderSnap.data() as Order;
      if (orderData.status === 'cancelled') return true;

      for (const [index, item] of orderData.items.entries()) {
          const pRef = doc(db, COLLECTIONS.PRODUCTS, item.id);
          const pSnap = await transaction.get(pRef);
          
          // Logic hoàn kho an toàn (ngay cả khi sản phẩm đã bị xóa khỏi danh mục)
          if (pSnap.exists()) {
              const pData = pSnap.data() as Product;
              const restoredStock = pData.stock + item.quantity;
              transaction.update(pRef, { stock: restoredStock, updatedAt: now });
              
              const txRetId = `TX_RET_${orderData.code}_${item.id}_${index}`;
              transaction.set(doc(db, COLLECTIONS.TRANSACTIONS, txRetId), cleanupData({
                  id: txRetId, code: `RET-${orderData.code}`, productId: item.id, productName: item.name, sku: item.sku || '', 
                  type: 'return', quantity: item.quantity, balance: restoredStock, oldStock: pData.stock, newStock: restoredStock, 
                  timestamp: now, unitPrice: item.appliedPrice ?? item.price, referenceId: orderData.id, 
                  supplierName: orderData.customerName, receiver: orderData.customerName,
                  note: `Hoàn kho tự động đơn ${orderData.code}`, createdAt: now, updatedAt: now, isActive: true
              }));
          }

          if (item.isGift) {
              const giftQuery = query(collection(db, COLLECTIONS.GIFTS), where("productId", "==", item.id));
              const giftQuerySnap = await getDocs(giftQuery);
              if (!giftQuerySnap.empty) {
                  const gRef = giftQuerySnap.docs[0].ref;
                  const gSnap = await transaction.get(gRef);
                  if (gSnap.exists()) {
                      transaction.update(gRef, { stock: (gSnap.data().stock || 0) + item.quantity, updatedAt: now });
                  }
              }
          }
          
          // Logic vô hiệu hóa bảo hành dây chuyền
          if (item.hasSerial) {
              const warrantyQuery = query(collection(db, COLLECTIONS.WARRANTIES), where("orderId", "==", orderData.id), where("productId", "==", item.id));
              const warrantySnap = await getDocs(warrantyQuery);
              warrantySnap.forEach(wDoc => {
                  const wData = wDoc.data() as WarrantyItem;
                  transaction.update(wDoc.ref, { 
                    status: 'void', 
                    updatedAt: now,
                    history: [...(wData.history || []), { date: now, action: 'Vô hiệu hóa', note: `Hủy theo đơn hàng gốc ${orderData.code}` }]
                  });
              });
          }
      }

      // Logic hoàn trả điểm và chi tiêu chính xác
      if (orderData.customerId && orderData.customerId !== 'walk-in') {
          const cRef = doc(db, COLLECTIONS.CUSTOMERS, orderData.customerId);
          const cSnap = await transaction.get(cRef);
          if (cSnap.exists()) {
              const cData = cSnap.data() as Customer;
              const pointsEarned = Math.floor(orderData.total / 100000);
              const pointsSpent = orderData.items.reduce((sum, i) => sum + (i.isGift ? (i.pointsRequired || 0) * i.quantity : 0), 0);
              const finalLoyaltyPoints = Math.max(0, (cData.loyaltyPoints || 0) - pointsEarned + pointsSpent);
              const finalTotalSpent = Math.max(0, (cData.totalSpent || 0) - orderData.total);
              transaction.update(cRef, { loyaltyPoints: finalLoyaltyPoints, totalSpent: finalTotalSpent, updatedAt: now });
          }
      }

      transaction.update(orderRef, { status: 'cancelled', updatedAt: now });
      await SystemRepo.logAction('CANCEL_ORDER', `Thực hiện hủy đơn hàng điện tử: ${orderData.code}`);
      return true;
    });
  }
};
