import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDdPUsA49_2Y6Gyn_eGKio938maa4SVyDk",
  authDomain: "bin-aoun.firebaseapp.com",
  projectId: "bin-aoun",
  storageBucket: "bin-aoun.firebasestorage.app",
  messagingSenderId: "411987931616",
  appId: "1:411987931616:web:92bf4646df776b9791fb85",
  measurementId: "G-08QRNY7P6V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Safe test connection function as required by Firebase Integration Skill:
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase/Firestore successfully connected.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();
