import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

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

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom parameters to force Google Account Pick selection (optional, but premium experience)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
