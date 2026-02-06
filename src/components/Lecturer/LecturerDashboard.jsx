import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  ShieldAlert, FileText, Eye, LogOut, Edit, Plus, Trash2, 
  FileCheck, ChevronRight, ChevronDown, ArrowLeft, AlertTriangle, User, Info, CheckCircle 
} from 'lucide-react';
import { db, appId } from '../../Config/firebase';
import './LecturerDashboard.css';

const LecturerDashboard = ({ user, onLogout }) => {
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [view, setView] = useState('create');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  
  // Tracks expanded state for Subject headers and Student headers
  const [expandedGroups, setExpandedGroups] = useState({});
  const [grading, setGrading] = useState({});

  // Exam Form State (Original Manage Exam Logic)
  const [newExam, setNewExam] = useState({ subject: '', duration: 60, questions: [] });
  const [currentQ, setCurrentQ] = useState({ type: 'text', text: '', options: ['', '', '', ''], correctAnswer: '' });
  const [editingExamId, setEditingExamId] = useState(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user?.uid) return;

    const unsubSub = onSnapshot(query(collection(db, 'submissions'), orderBy('timestamp', 'desc')), (snap) => {
        setSubmissions(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    const unsubVio = onSnapshot(query(collection(db, 'violations'), orderBy('timestamp', 'desc')), (snap) => {
        setViolations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubExam = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), orderBy('createdAt', 'desc')), (snap) => {
         setExams(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => { unsubSub(); unsubVio(); unsubExam(); };
  }, [user]);

  const startEditing = (exam) => {
    setNewExam({ subject: exam.subject, duration: exam.duration, questions: exam.questions || [] });
    setEditingExamId(exam.id);
  };

  const cancelEditing = () => {
    setNewExam({ subject: '', duration: 60, questions: [] });
    setEditingExamId(null);
  };

  const handleDeleteExam = async (examId) => {
    if(!window.confirm("Delete this exam? All related logs will be hidden.")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', examId));
    } catch (err) {
      console.error(err);
      alert("Error deleting exam");
    }
  };

  const handleReleaseMarks = async () => {
    if (!selectedSubmission?.id) return;
    const totalMark = Object.values(grading).reduce((sum, val) => sum + (Number(val) || 0), 0);
    try {
      const subRef = doc(db, 'submissions', selectedSubmission.id);
      await updateDoc(subRef, {
        marks: grading,
        totalMark: totalMark,
        status: 'Released',
        gradedAt: serverTimestamp()
      });
      alert(`Marks released! Total: ${totalMark}`);
      setSelectedSubmission(null);
    } catch (e) {
      console.error(e);
      alert("Error releasing marks. Check your Firebase Rules update.");
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const getNestedData = (items) => {
    const map = {};
    exams.forEach(e => { map[e.id] = { subject: e.subject, students: {} }; });
    items.forEach(item => {
      if (!map[item.examId]) return;
      if (!map[item.examId].students[item.studentId]) map[item.examId].students[item.studentId] = [];
      map[item.examId].students[item.studentId].push(item);
    });
    return map;
  };

   /* dataItems.forEach(item => {
        const examId = item.examId;
        const studentId = item.studentId || "Unknown Student";
        if (!subjectMap[examId]) return;
        if (!subjectMap[examId].students[studentId]) {
            subjectMap[examId].students[studentId] = [];
        }
        subjectMap[examId].students[studentId].push(item);
    });
    return subjectMap;
  }; */

  const SectionHeader = ({ id, label, count, icon: Icon, type = "subject" }) => (
    <button 
      onClick={() => toggleGroup(id)}
      className={`w-full flex items-center justify-between p-4 mb-2 rounded-lg border transition-all ${
        type === "subject" 
        ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700 shadow-md" 
        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 ml-4 w-[calc(100%-1rem)]"
      }`}
    >
      <span className="flex items-center gap-3">
        {Icon && <Icon size={18} />}
        <span className={type === "subject" ? "font-bold uppercase tracking-wide text-sm" : "font-medium"}>{label}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${type === "subject" ? "bg-slate-600" : "bg-white border shadow-sm"}`}>
          {count}
        </span>
      </span>
      {expandedGroups[id] ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
    </button>
  );

  // Original Manage Exam Logic (Keep as is)
  const addQuestion = () => {
    if (!currentQ.text.trim()) { alert("Enter question text"); return; }
    setNewExam(prev => ({ ...prev, questions: [...(prev.questions || []), { ...currentQ, id: Date.now() }] }));
    setCurrentQ({ type: 'text', text: '', options: ['', '', '', ''], correctAnswer: '' });
  };
  const removeQuestion = (id) => setNewExam(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));
  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!newExam.questions?.length) { alert("Add questions first"); return; }
    try {
        if (editingExamId) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', editingExamId), { ...newExam, updatedAt: serverTimestamp() });
            alert('Exam Updated');
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), { ...newExam, lecturerId: user.uid, createdAt: serverTimestamp(), status: 'active' });
            alert('Exam Created');
        }
        setNewExam({ subject: '', duration: 60, questions: [] });
        setEditingExamId(null);
         } catch (err) { console.error(err); }
    };

  return (
    <div className="lecturer-layout">
      <div className="lecturer-sidebar">
        <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
            <ShieldAlert className="text-purple-400" /> ProctorPort
        </h2>
        <nav className="flex-1 space-y-2">
            <button onClick={() => { setView('create'); cancelEditing(); setSelectedSubmission(null); }} className={`sidebar-btn ${view === 'create' ? 'active' : ''}`}>
                <FileText size={18} /> Manage Exams
            </button>
            <button onClick={() => { setView('monitor'); setSelectedSubmission(null); }} className={`sidebar-btn ${view === 'monitor' ? 'active' : ''}`}>
                <Eye size={18} /> Live Monitoring
            </button>
            <button onClick={() => { setView('review'); setSelectedSubmission(null); }} className={`sidebar-btn ${view === 'review' ? 'active' : ''}`}>
                <FileCheck size={18} /> Review & Grade 
            </button>
        </nav>
        <div className="sidebar-footer">
            <p className="text-[10px] text-slate-500 mb-2 px-4 uppercase font-bold">Authenticated as</p>
            <p className="text-xs text-slate-400 mb-4 px-4 truncate">{user.email}</p>
            <button onClick={onLogout} className="sidebar-logout-btn"><LogOut size={22} /><span>Log Out</span></button>
        </div>
      </div>

      <div className="lecturer-content">
        
        {/* --- VIEW 1: MANAGE EXAMS (RESTORED TO ORIGINAL UI) --- */}
        {view === 'create' && (
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">{editingExamId ? 'Edit Exam' : 'Create Exam'}</h1>
                    {editingExamId && <button onClick={cancelEditing} className="text-sm text-red-600 font-bold hover:underline">Cancel Editing</button>}
                </div>

                <div className={`p-6 rounded-xl shadow-sm border mb-8 transition-colors ${editingExamId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input className="std-input" value={newExam.subject} onChange={e => setNewExam({...newExam, subject: e.target.value})} placeholder="Subject Name" />
                        <input type="number" className="std-input" value={newExam.duration} onChange={e => setNewExam({...newExam, duration: parseInt(e.target.value)})} placeholder="Duration (mins)" />
                    </div>
                    
                    <div className="bg-white p-4 rounded mb-4 border border-slate-200 shadow-sm">
                        <div className="flex gap-2 mb-2">
                            <button onClick={()=>setCurrentQ({...currentQ, type:'text'})} className={`px-3 py-1 text-sm rounded ${currentQ.type==='text'?'bg-blue-600 text-white':'bg-slate-100 border'}`}>Text</button>
                            <button onClick={()=>setCurrentQ({...currentQ, type:'mcq'})} className={`px-3 py-1 text-sm rounded ${currentQ.type==='mcq'?'bg-blue-600 text-white':'bg-slate-100 border'}`}>MCQ</button>
                        </div>
                        <textarea className="std-input mb-2" placeholder="Question Text..." value={currentQ.text} onChange={e=>setCurrentQ({...currentQ, text:e.target.value})} />
                        {currentQ.type === 'mcq' && (
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                {currentQ.options.map((o,i) => <input key={i} className="std-input" placeholder={`Option ${i+1}`} value={o} onChange={e=>{const newOps=[...currentQ.options]; newOps[i]=e.target.value; setCurrentQ({...currentQ, options:newOps})}} />)}
                            </div>
                        )}
                        <button onClick={addQuestion} className="w-full bg-slate-800 text-white py-2 rounded flex justify-center items-center gap-2 hover:bg-slate-700"><Plus size={16}/> Add Question</button>
                    </div>

                    <div className="space-y-2 mb-4">
                        {newExam.questions?.map((q,i) => (
                            <div key={q.id} className="p-3 bg-white border rounded flex justify-between items-start">
                                <div><span className="font-bold text-slate-700 block">Q{i+1}: {q.text}</span>{q.type === 'mcq' && <span className="text-xs text-slate-500">Multiple Choice</span>}</div>
                                <button onClick={()=>removeQuestion(q.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    
                    <button onClick={handleSaveExam} className={`w-full text-white py-3 rounded font-bold shadow-md transition-colors ${editingExamId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                        {editingExamId ? 'Update Exam' : 'Publish Exam'}
                    </button>
                </div>
                
                <h3 className="font-bold text-slate-800 mb-2">Active Exams</h3>
                <div className="space-y-2">
                    {exams.map(e => (
                        <div key={e.id} className={`p-3 rounded shadow-sm border flex justify-between items-center ${editingExamId === e.id ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}>
                            <div><div className="font-bold text-slate-800">{e.subject}</div><div className="text-sm text-slate-500">{e.questions?.length || 0} Questions • {e.duration} mins</div></div>
                            <div className="flex gap-2">
                                <button onClick={() => startEditing(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={18} /></button>
                                <button onClick={() => handleDeleteExam(e.id)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- VIEW 2: LIVE MONITORING (NESTED COLLAPSIBLE + FILTERED) --- */}
        {view === 'monitor' && (
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Live AI Logs</h1>
                    <p className="text-sm text-slate-500">Filtering active exams and applying spatial noise reduction.</p>
                </div>

                {Object.entries(getNestedData(violations)).map(([exId, data]) => (
                    <div key={exId} className="mb-4">
                        <SectionHeader id={`mon-ex-${exId}`} label={data.subject} count={Object.keys(data.students).length + " Students"} icon={FileText} />
                        
                        {expandedGroups[`mon-ex-${exId}`] && Object.entries(data.students).map(([stuId, logs]) => (
                            <div key={stuId} className="mb-2">
                                <SectionHeader id={`mon-stu-${exId}-${stuId}`} label={stuId} count={logs.length + " Alerts"} icon={User} type="student" />
                                
                                {expandedGroups[`mon-stu-${exId}-${stuId}`] && (
                                    <div className="ml-8 mb-4 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-lg">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-slate-600 border-b">
                                                <tr><th className="p-3">Time</th><th className="p-3">Violation</th><th className="p-3 text-right">Confidence</th></tr>
                                            </thead>
                                            <tbody>
                                                {logs.map(v => (
                                                    <tr key={v.id} className={`border-t transition-colors ${v.confidence_score >= 99 ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                                                        <td className="p-3 text-slate-500 font-mono">
                                                            {v.timestamp?.seconds ? new Date(v.timestamp.seconds*1000).toLocaleTimeString() : 'Just now'}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex flex-col">
                                                                <span className={`font-bold ${v.confidence_score >= 99 ? 'text-red-700' : 'text-slate-700'}`}>{v.type_of_violation}</span>
                                                                {v.confidence_score >= 99 && <span className="text-[10px] text-red-500 font-bold uppercase">Multi-Sensor Correlation</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                                    <div className={`h-full ${v.confidence_score >= 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${v.confidence_score}%` }} />
                                                                </div>
                                                                <span className="font-mono font-bold w-10">{v.confidence_score}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="p-3 bg-slate-50 border-t text-[10px] text-slate-400 flex gap-4 uppercase font-bold">
                                            <span className="flex items-center gap-1"><Info size={12}/> Baseline Noise Subtraction Active</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        )}

        {/* --- VIEW 3: REVIEW ANSWERS (NESTED COLLAPSIBLE + FILTERED) --- */}
        {view === 'review' && (
          <div className="max-w-4xl mx-auto">
            {!selectedSubmission ? (
              <>
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Review & Grading</h1>
                {Object.entries(getNestedData(submissions)).map(([exId, data]) => (
                  <div key={exId} className="mb-4">
                    <SectionHeader id={`r-e-${exId}`} label={data.subject} count={Object.keys(data.students).length} icon={FileCheck} />
                    {expandedGroups[`r-e-${exId}`] && Object.entries(data.students).map(([stuId, subs]) => (
                      <div key={stuId}>
                        <SectionHeader id={`r-s-${exId}-${stuId}`} label={stuId} count={subs.length} icon={User} type="student" />
                        {expandedGroups[`r-s-${exId}-${stuId}`] && (
                          <div className="ml-8 mb-4 bg-white border rounded-lg overflow-hidden">
                            {subs.map(sub => (
  <div key={sub.id} className="p-4 flex justify-between items-center border-b hover:bg-slate-50">
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase">
        {sub.timestamp?.seconds ? new Date(sub.timestamp.seconds * 1000).toLocaleString() : '...'}
      </span>
      {/* If this text appears, the database sync is working */}
      {sub.status === 'Released' && (
        <span className="ml-3 text-green-600 font-bold text-xs uppercase tracking-tighter">● Graded</span>
      )}
    </div>

    {sub.status === 'Released' ? (
      <button 
        disabled 
        className="bg-green-600 text-white px-4 py-1.5 rounded text-[10px] font-bold uppercase cursor-default opacity-100"
      >
        Graded
      </button>
    ) : (
      <button 
        onClick={() => { 
          setSelectedSubmission(sub); 
          setGrading(sub.marks || {}); 
        }} 
        className="bg-cyan-600 text-white px-4 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-cyan-700"
      >
        Grade
      </button>
    )}
  </div>
))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-lg border">
                <button onClick={() => setSelectedSubmission(null)} className="mb-4 text-slate-500 flex items-center gap-1"><ArrowLeft size={16}/> Back</button>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{selectedSubmission.studentId}</h2>
                    <button onClick={handleReleaseMarks} className="bg-green-600 text-white px-4 py-2 rounded font-bold">Release Mark</button>
                </div>
                {Object.entries(selectedSubmission.answers || {}).map(([qId, answer], idx) => (
                    <div key={qId} className="mb-4 p-4 bg-slate-50 rounded border">
                        <div className="flex justify-between mb-2">
                            <p className="font-bold">Question {idx+1}</p>
                            <input type="number" className="w-16 border rounded text-center" value={grading[qId] || 0} onChange={(e) => setGrading({...grading, [qId]: e.target.value})} />
                        </div>
                        <p>{answer}</p>
                    </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default LecturerDashboard;