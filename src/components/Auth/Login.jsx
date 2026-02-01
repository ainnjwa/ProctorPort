import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, Lock, Cpu, Server, CheckCircle } from 'lucide-react'; // Added icons for the left side
import { auth, db } from '../../Config/firebase';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Firebase Authentication
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Fetch user record from Firestore
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error('User not registered in Firestore');
      }

      const userData = userSnap.data();

      // Role validation
      if (userData.role !== role) {
        throw new Error(`You are not registered as a ${role}`);
      }

      // Login success
      onLogin({
        uid,
        email: userData.email,
        role: userData.role
      });

    } catch (error) {
      console.error('Login Error:', error);
      alert(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      
      {/* LEFT SIDE: INFO PANEL (New) */}
      <div className="login-info-side">
        <div className="info-content">
          <div className="illustration-wrapper">
             <ShieldCheck size={180} className="hero-icon" />
             <div className="floating-icon icon-1"><Lock size={32} /></div>
             <div className="floating-icon icon-2"><Cpu size={32} /></div>
             <div className="floating-icon icon-3"><Server size={32} /></div>
          </div>
          
          <h1 className="hero-title">
            SECURE & INTELLIGENT <br /> 
            <span className="highlight-text">PROCTORPORT</span>
          </h1>
          
          <p className="hero-subtitle">
            Powered by AI and Porteus Kiosk for a fair, controlled, and seamless testing environment.
          </p>

          <div className="feature-list">
            <div className="feature-item"><CheckCircle size={20} className="text-teal-300"/> <span>Real-time AI Proctoring</span></div>
            <div className="feature-item"><CheckCircle size={20} className="text-teal-300"/> <span>Secure OS Environment</span></div>
            <div className="feature-item"><CheckCircle size={20} className="text-teal-300"/> <span>Instant Violation Logging</span></div>
          </div>

          <div className="powered-by">
            <span className="powered-label">POWERED BY</span>
            <div className="brand-pill">
              <ShieldCheck size={16} /> ProctorPort
            </div>
          </div>
        </div>
        
        {/* Decorative Background Circles */}
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
      </div>

      {/* RIGHT SIDE: LOGIN FORM (Existing but refined) */}
      <div className="login-form-side">
        <div className="login-card">
          <div className="text-center mb-8">
            <div className="login-logo-container">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
            <p className="text-slate-500 text-sm mt-1">Please login to your ProctorPort account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Role</label>
              <div className="role-group">
                <button type="button" onClick={() => setRole('student')} className={`role-btn ${role === 'student' ? 'active-student' : ''}`}>
                  Student
                </button>
                <button type="button" onClick={() => setRole('lecturer')} className={`role-btn ${role === 'lecturer' ? 'active-lecturer' : ''}`}>
                  Lecturer
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email </label>
              <input 
                type="email" 
                required 
                className="login-input" 
                placeholder="e.g. student@proctorp.edu" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit" disabled={loading}
              className={`submit-btn ${role === 'student' ? 'btn-blue' : 'btn-purple'}`}>
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-xs text-slate-400">
            System v1.0 • Powered by ProctorPort
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;