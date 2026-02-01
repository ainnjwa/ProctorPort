import { initializeApp } from 'firebase/app';
import { getAuth} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC13x0y8BZSeiRA2_teQpep6wfd9SnDX2c",
  authDomain: "proctorport23.firebaseapp.com",
  projectId: "proctorport23",
  storageBucket: "proctorport23.firebasestorage.app",
  messagingSenderId: "1062628430036",
  appId: "1:1062628430036:web:f0b9544b9dcd4e3c3c6b41"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "proctorport-local"; 