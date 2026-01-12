
import { initializeApp } from 'firebase/app';
// Fix: Use namespace import for firestore to avoid member resolution issues in some environments
import * as firestore from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAg8XRhrqPThqNBPbRC0qrH_eJw7UcBOcs",
  authDomain: "lgc-shop-online.firebaseapp.com",
  projectId: "lgc-shop-online",
  storageBucket: "lgc-shop-online.firebasestorage.app",
  messagingSenderId: "118080305360",
  appId: "1:118080305360:web:5a8c7bc1cdcc7826d5c6d5",
  measurementId: "G-DWKTLQWBEM"
};

// Fix: Initialize Firebase app using modular SDK
const app = initializeApp(firebaseConfig);

// Fix: Export db instance using getFirestore from destructured namespace for standard modular access
export const db = (firestore as any).getFirestore(app);
