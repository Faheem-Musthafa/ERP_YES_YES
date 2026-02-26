// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyBCtWoSYlVP_QI-kXrVfdweHPan7JKKc1M",
  authDomain: "yes-yes-marketing.firebaseapp.com",
  projectId: "yes-yes-marketing",
  storageBucket: "yes-yes-marketing.firebasestorage.app",
  messagingSenderId: "1004491872840",
  appId: "1:1004491872840:web:9cf176b6ff41a7a673967d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
