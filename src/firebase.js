import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCUw6tMSV044z_9dWUK569wcsbDH7p2ydw",
  authDomain: "soil-sista.firebaseapp.com",
  projectId: "soil-sista",
  storageBucket: "soil-sista.firebasestorage.app",
  messagingSenderId: "364104015252",
  appId: "1:364104015252:web:8eba4ffb3c78677eb6c381",
  measurementId: "G-Y2JEKKWF6J"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);