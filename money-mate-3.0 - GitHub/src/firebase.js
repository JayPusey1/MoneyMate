import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyAv7yykoGi94XuLG5exWBbxrP1Sox7oDZg",
    authDomain: "moeny-mate-3.firebaseapp.com",
    projectId: "moeny-mate-3",
    storageBucket: "moeny-mate-3.firebasestorage.app",
    messagingSenderId: "592053527619",
    appId: "1:592053527619:web:9b5394e0ff3c3c7f6820f6",
    measurementId: "G-4Z984D6X98"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export auth services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Export database
export const db = getFirestore(app);

export default app;