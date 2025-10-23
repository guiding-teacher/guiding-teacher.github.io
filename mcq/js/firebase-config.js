// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2_hkRSFP97JmpEQFdC_WefIT5EYBzYus",
  authDomain: "exam-system-ddd41.firebaseapp.com",
  projectId: "exam-system-ddd41",
  storageBucket: "exam-system-ddd41.firebasestorage.app",
  messagingSenderId: "663156235913",
  appId: "1:663156235913:web:490d114ae5ce4a7cf8f058",
  measurementId: "G-TE548Q0BQ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Export the database connection
export { db };