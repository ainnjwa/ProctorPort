import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ShieldAlert, LogOut, Clock, CheckCircle, FileText, Award, ChevronRight, Loader2 } from 'lucide-react';
import { db, appId } from '../../Config/firebase';
import StudentExam from './StudentExam';
import './Student.css';

const StudentDashboard = ({ user, onLogout }) => {
  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    
    // 1. Listen for available active exams
    const qExams = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'exams'), 
      where('status', '==', 'active')
    );
    
    const unsubExams = onSnapshot(qExams, (snap) => {
      setExams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Listen for current student's submissions (Real-time marks update)
    // This listener ensures that as soon as the lecturer clicks "Release Mark", 
    // the status and totalMark update here instantly.
    const qSubs = query(
      collection(db, 'submissions'), 
      where('studentUid', '==', user.uid), 
      orderBy('timestamp', 'desc')
    );

    const unsubSubs = onSnapshot(qSubs, (snap) => {
      const fetchedSubmissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSubmissions(fetchedSubmissions);
      setLoading(false);
    });

    return () => { 
      unsubExams(); 
      unsubSubs(); 
    };
  }, [user.uid]);

  const handleExamFinish = async (answers) => {
    try {
        await addDoc(collection(db, 'submissions'), {
            examId: activeExam.id,
            examSubject: activeExam.subject,
            studentId: user.email,
            studentUid: user.uid, // Matches the query above
            answers: answers,
            timestamp: serverTimestamp(),
            status: 'Submitted'
        });
        if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
        setActiveExam(null);
        alert("Exam finished and submitted for grading.");
    } catch (error) {
        console.error("Error submitting:", error);
        alert("Submission failed. Please check your connection.");
    }
  };

  if (activeExam) {
    return <StudentExam user={user} exam={activeExam} onFinish={handleExamFinish} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
        <nav className="student-nav bg-white shadow-sm px-8 py-4 flex justify-between items-center sticky top-0 z-10">
            <div className="flex items-center gap-2 font-black text-blue-700 text-xl tracking-tight">
                <ShieldAlert size={24} /> ProctorPort
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Student Account</p>
                    <p className="text-xs font-bold text-slate-700">{user.email}</p>
                </div>
                <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <LogOut size={22} />
                </button>
            </div>
        </nav>

        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">Dashboard Overview</h1>
            
            {/* SECTION 1: EXAMS TO TAKE */}
            <section className="mb-12">
                <div className="flex items-center gap-2 mb-6 text-slate-400">
                    <FileText size={16}/>
                    <h2 className="text-xs font-bold uppercase tracking-widest">Available Assessments</h2>
                </div>
                <div className="grid gap-4">
                    {exams.length === 0 ? (
                        <div className="p-10 bg-white rounded-xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                          No exams scheduled at this time.
                        </div>
                    ) : (
                        exams.map(exam => (
                            <div key={exam.id} className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{exam.subject}</h3>
                                    <div className="flex gap-4 mt-1 text-xs text-slate-500 font-medium">
                                        <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration} Minutes</span>
                                        <span className="flex items-center gap-1"><FileText size={12} /> {exam.questions?.length || 0} Questions</span>
                                    </div>
                                </div>
                                <button onClick={() => setActiveExam(exam)} className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold group-hover:bg-blue-700 transition-colors">
                                  Start Assessment
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* SECTION 2: RESULTS & HISTORY */}
            <section>
                <div className="flex items-center gap-2 mb-6 text-slate-400">
                    <CheckCircle size={16}/>
                    <h2 className="text-xs font-bold uppercase tracking-widest">Performance & Grades</h2>
                </div>
                <div className="grid gap-3">
                    {loading ? (
                        <div className="flex justify-center p-8 text-slate-400 gap-2">
                          <Loader2 className="animate-spin" size={20} /> Loading results...
                        </div>
                    ) : submissions.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm italic">
                          You haven't submitted any exams yet.
                        </div>
                    ) : (
                        submissions.map(sub => (
                            <div key={sub.id} className="bg-white p-5 rounded-xl border border-slate-100 flex justify-between items-center group transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${sub.status === 'Released' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-300'}`}>
                                        <Award size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{sub.examSubject}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                            Submitted {sub.timestamp?.seconds ? new Date(sub.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {sub.status === 'Released' ? (
                                        <div>
                                            <p className="text-2xl font-black text-green-600 leading-none">{sub.totalMark}</p>
                                            <p className="text-[9px] font-black text-slate-300 uppercase mt-1">Final Score</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full text-slate-400">
                                            <span className="text-[10px] font-bold uppercase">Pending Grade</span>
                                            <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    </div>
  );
};

export default StudentDashboard;