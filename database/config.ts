
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

// Fix: Khởi tạo Firebase bằng named export initializeApp
const app = initializeApp(firebaseConfig);

// Fix: Khởi tạo Firestore bằng modular functions thay vì namespace property access
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});