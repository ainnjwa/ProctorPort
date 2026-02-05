import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldAlert, LogOut, Clock, CheckCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { db, appId } from '../../Config/firebase';
import StudentExam from './StudentExam';
import AIMonitor from '../AIMonitor/AIMonitor'; // Import to use for health check
import './Student.css';

const StudentDashboard = ({ user, onLogout }) => {
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [systemReady, setSystemReady] = useState(false);
  const [healthError, setHealthError] = useState("Wait... Performing AI System Check");

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => setExams(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const handleHealthUpdate = (isReady, errorMsg) => {
    setSystemReady(isReady);
    if (errorMsg) setHealthError(errorMsg);
  };

  const startExam = (exam) => {
    if (!systemReady) return;
    document.documentElement.requestFullscreen().catch((e) => console.log("Full screen denied", e));
    setActiveExam(exam);
  };

  const handleExamFinish = async (answers) => {
    try {
        await addDoc(collection(db, 'submissions'), {
            examId: activeExam.id,
            examSubject: activeExam.subject,
            studentId: user.email,
            studentUid: user.uid,
            answers: answers,
            timestamp: serverTimestamp()
        });
        if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        setActiveExam(null);
        alert("Exam Submitted Successfully.");
    } catch (error) {
        console.error("Error saving exam:", error);
        alert("Submission failed.");
    }
  };

  if (activeExam) {
    return <StudentExam user={user} exam={activeExam} onFinish={handleExamFinish} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
        <nav className="student-nav">
            <div className="flex items-center gap-2 font-bold text-slate-800">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <ShieldAlert size={18} />
                </div>
                ProctorPort
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">{user.email}</span>
                <button onClick={onLogout} className="text-slate-600 hover:text-red-600"><LogOut size={20} /></button>
            </div>
        </nav>

        <div className="max-w-4xl mx-auto p-8">
            {/* HEALTH CHECK BAR */}
            <div className={`p-4 rounded-xl border mb-8 flex items-center justify-between transition-all ${systemReady ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <div className="flex items-center gap-3">
                    {systemReady ? (
                        <CheckCircle className="text-green-600" size={24} />
                    ) : (
                        <Loader2 className="text-yellow-600 animate-spin" size={24} />
                    )}
                    <div>
                        <p className={`font-bold text-sm ${systemReady ? 'text-green-800' : 'text-yellow-800'}`}>
                            {systemReady ? "System Ready: AI Monitoring Active" : "System Check In Progress"}
                        </p>
                        <p className="text-xs text-slate-500">
                            {systemReady ? "Environment calibrated. You may start your exam." : healthError}
                        </p>
                    </div>
                </div>
                {/* Hidden monitor for health check background processing */}
                {!activeExam && (
                   <div className="opacity-0 pointer-events-none absolute h-0 w-0">
                      <AIMonitor examId="health-check" studentId={user.email} onViolation={()=>{}} onReadyChange={handleHealthUpdate} />
                   </div>
                )}
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mb-2">Available Exams</h1>
            <div className="grid gap-4 mt-6">
                {exams.map(exam => (
                    <div key={exam.id} className={`exam-card group ${!systemReady ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{exam.subject}</h3>
                            <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={14} /> {exam.duration} mins</span>
                                <span className="flex items-center gap-1"><FileText size={14} /> {exam.questions?.length || 0} Questions</span>
                            </div>
                        </div>
                        <button 
                            disabled={!systemReady}
                            onClick={() => startExam(exam)} 
                            className={`btn-start-exam ${systemReady ? 'group-hover:bg-blue-600' : 'bg-slate-300'}`}
                        >
                            {systemReady ? "Start Exam" : "Wait..."}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default StudentDashboard;