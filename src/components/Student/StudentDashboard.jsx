import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ShieldAlert, LogOut, Clock, CheckCircle, FileText } from 'lucide-react';
import { db, appId } from '../../Config/firebase';
import StudentExam from './StudentExam';
import './Student.css';

const StudentDashboard = ({ user, onLogout }) => {
  const [exams, setExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), where('status', '==', 'active'));
    const unsub = onSnapshot(q, (snap) => setExams(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const startExam = (exam) => {
    document.documentElement.requestFullscreen().catch((e) => console.log("Full screen denied", e));
    setActiveExam(exam);
  };

  // --- NEW: HANDLE SUBMISSION TO DB ---
  const handleExamFinish = async (answers) => {
    try {
        await addDoc(collection(db, 'submissions'), {
            examId: activeExam.id,
            examSubject: activeExam.subject,
            studentId: user.email,
            studentUid: user.uid,
            answers: answers, // { questionId: "Answer" }
            timestamp: serverTimestamp()
        });

        if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        setActiveExam(null);
        alert("Exam Submitted Successfully. Answers saved.");
    } catch (error) {
        console.error("Error saving exam:", error);
        alert("Error saving submission. Please try again.");
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
                <button onClick={onLogout} className="text-slate-600 hover:text-red-600">
                    <LogOut size={20} />
                </button>
            </div>
        </nav>

        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Available Exams</h1>
            <p className="text-slate-500 mb-8">Select an exam to begin. The secure OS environment is active.</p>

            <div className="grid gap-4">
                {exams.map(exam => (
                    <div key={exam.id} className="exam-card group">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{exam.subject}</h3>
                            <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Clock size={14} /> {exam.duration} mins</span>
                                <span className="flex items-center gap-1"><FileText size={14} /> {exam.questions ? exam.questions.length : 1} Questions</span>
                                <span className="flex items-center gap-1 text-green-600"><CheckCircle size={14} /> Ready</span>
                            </div>
                        </div>
                        <button onClick={() => startExam(exam)} className="btn-start-exam group-hover:bg-blue-600 group-hover:text-white">
                            Start Exam
                        </button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default StudentDashboard;