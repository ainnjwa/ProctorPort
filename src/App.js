// src/App.js
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './Config/firebase';

// 🔹 IMPORT FROM YOUR ACTUAL FOLDERS
import Login from './components/Auth/Login';
import StudentDashboard from './components/Student/StudentDashboard';
import LecturerDashboard from './components/Lecturer/LecturerDashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔐 Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ✅ Called after successful login
  const handleLogin = (userData) => {
    setUser(userData);
  };

  // 🚪 Logout
  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // ⏳ Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading Secure Environment...
      </div>
    );
  }

  // 🔑 Not logged in
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 🎓 Role-based routing
  return user.role === 'lecturer' ? (
    <LecturerDashboard user={user} onLogout={handleLogout} />
  ) : (
    <StudentDashboard user={user} onLogout={handleLogout} />
  );
}

export default App;
