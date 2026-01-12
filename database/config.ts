import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAg8XRhrqPThqNBPbRC0qrH_eJw7UcBOcs",
  authDomain: "lgc-shop-online.firebaseapp.com",
  projectId: "lgc-shop-online",
  storageBucket: "lgc-shop-online.firebasestorage.app",
  messagingSenderId: "118080305360",
  appId: "1:118080305360:web:5a8c7bc1cdcc7826d5c6d5",
  measurementId: "G-DWKTLQWBEM"
};

// Khởi tạo Firebase với cấu hình bộ nhớ đệm bền vững (Persistent Cache)
// Hỗ trợ hoạt động Offline và xử lý lỗi "Could not reach Cloud Firestore backend"
// Fix: Ensure standard modular named import for initializeApp from 'firebase/app'
const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});