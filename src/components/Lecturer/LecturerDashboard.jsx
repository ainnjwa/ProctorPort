import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ShieldAlert, FileText, Eye, LogOut, Edit, Save, X, AlertTriangle, Plus, Trash2, FileCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { db, appId } from '../../Config/firebase';
import './LecturerDashboard.css';

const LecturerDashboard = ({ user, onLogout }) => {
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [submissions, setSubmissions] = useState([]); 
  
  const [view, setView] = useState('create'); 
  const [selectedSubmission, setSelectedSubmission] = useState(null); 

  // Exam Form State
  const [newExam, setNewExam] = useState({ subject: '', duration: 60, questions: [] });
  const [currentQ, setCurrentQ] = useState({ type: 'text', text: '', options: ['', '', '', ''], correctAnswer: '' });
  
  // EDIT MODE STATE
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

  // --- QUESTION HANDLERS ---
  const addQuestion = () => {
    if (!currentQ.text.trim()) { alert("Enter question text"); return; }
    setNewExam(prev => ({ ...prev, questions: [...(prev.questions || []), { ...currentQ, id: Date.now() }] }));
    setCurrentQ({ type: 'text', text: '', options: ['', '', '', ''], correctAnswer: '' });
  };

  const removeQuestion = (id) => setNewExam(prev => ({ ...prev, questions: prev.questions.filter(q => q.id !== id) }));

  // --- EDITING HANDLERS (NEW) ---
  const startEditing = (exam) => {
    setNewExam({
        subject: exam.subject,
        duration: exam.duration,
        questions: exam.questions || []
    });
    setEditingExamId(exam.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setNewExam({ subject: '', duration: 60, questions: [] });
    setEditingExamId(null);
  };

  // --- SAVE / UPDATE HANDLER ---
  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!newExam.questions?.length) { alert("Add questions first"); return; }

    try {
        if (editingExamId) {
            // UPDATE EXISTING EXAM
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', editingExamId), {
                ...newExam,
                updatedAt: serverTimestamp()
            });
            alert('Exam Updated Successfully');
        } else {
            // CREATE NEW EXAM
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), {
                ...newExam, lecturerId: user.uid, createdAt: serverTimestamp(), status: 'active'
            });
            alert('Exam Created Successfully');
        }
        cancelEditing(); // Reset form
    } catch (err) {
        console.error(err);
        alert("Error saving exam.");
    }
  };

  const handleDeleteExam = async (examId) => {
      if(!window.confirm("Are you sure you want to delete this exam?")) return;
      try {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'exams', examId));
      } catch (err) {
          console.error(err);
          alert("Error deleting exam");
      }
  };

  // --- GROUPING HELPER ---
  const getGroupedData = (dataItems) => {
      const groups = exams.map(exam => ({ id: exam.id, subject: exam.subject, items: [] }));
      const unknownItems = [];
      dataItems.forEach(item => {
          const group = groups.find(g => g.id === item.examId);
          if (group) group.items.push(item);
          else unknownItems.push(item);
      });
      return { activeGroups: groups.filter(g => g.items.length > 0), unknownItems };
  };

  const getQuestionDetails = (examId, questionId) => {
    const exam = exams.find(e => e.id === examId);
    if (!exam || !exam.questions) return { text: "Question not found", type: 'text' };
    const q = exam.questions.find(q => q.id === questionId || q.id === parseInt(questionId)); 
    return q || { text: "Question deleted", type: 'text' };
  };

  return (
    <div className="lecturer-layout">
      {/* SIDEBAR */}
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
                <FileCheck size={18} /> Review Answers
            </button>
        </nav>
        <div className="sidebar-footer">
            <div className="user-profile-info">
                <p className="profile-label">Logged in as</p>
                <p className="profile-id" title={user.email}>
                    {user.email}
                </p>
        </div>

    {/* The Line */}
    <div className="sidebar-divider"></div>

    {/* Logout Button (Bigger) */}
    <button onClick={onLogout} className="sidebar-logout-btn">
        <LogOut size={22} /> 
        <span>Log Out</span>
    </button>
</div>
      </div>

      {/* CONTENT AREA */}
      <div className="lecturer-content">
        
        {/* --- VIEW 1: CREATE / EDIT EXAM --- */}
        {view === 'create' && (
            <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">
                        {editingExamId ? 'Edit Exam' : 'Create Exam'}
                    </h1>
                    {editingExamId && (
                        <button onClick={cancelEditing} className="text-sm text-red-600 font-bold hover:underline">
                            Cancel Editing
                        </button>
                    )}
                </div>

                <div className={`p-6 rounded-xl shadow-sm border mb-8 transition-colors ${editingExamId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input className="std-input" value={newExam.subject} onChange={e => setNewExam({...newExam, subject: e.target.value})} placeholder="Subject Name" />
                        <input type="number" className="std-input" value={newExam.duration} onChange={e => setNewExam({...newExam, duration: parseInt(e.target.value)})} placeholder="Duration (mins)" />
                    </div>
                    
                    {/* Question Builder */}
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
                        <button onClick={addQuestion} className="w-full bg-slate-800 text-white py-2 rounded flex justify-center items-center gap-2 hover:bg-slate-700">
                            <Plus size={16}/> Add Question
                        </button>
                    </div>

                    {/* Question List */}
                    <div className="space-y-2 mb-4">
                        {newExam.questions?.map((q,i) => (
                            <div key={q.id} className="p-3 bg-white border rounded flex justify-between items-start">
                                <div>
                                    <span className="font-bold text-slate-700 block">Q{i+1}: {q.text}</span>
                                    {q.type === 'mcq' && <span className="text-xs text-slate-500">Multiple Choice</span>}
                                </div>
                                <button onClick={()=>removeQuestion(q.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        onClick={handleSaveExam} 
                        className={`w-full text-white py-3 rounded font-bold shadow-md transition-colors ${editingExamId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {editingExamId ? 'Update Exam' : 'Publish Exam'}
                    </button>
                </div>
                
                {/* Active Exams List */}
                <h3 className="font-bold text-slate-800 mb-2">Active Exams</h3>
                <div className="space-y-2">
                    {exams.map(e => (
                        <div key={e.id} className={`p-3 rounded shadow-sm border flex justify-between items-center ${editingExamId === e.id ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : 'bg-white'}`}>
                            <div>
                                <div className="font-bold text-slate-800">{e.subject}</div>
                                <div className="text-sm text-slate-500">{e.questions?.length || 1} Questions • {e.duration} mins</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => startEditing(e)} className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors" title="Edit Exam">
                                    <Edit size={18} />
                                </button>
                                <button onClick={() => handleDeleteExam(e.id)} className="p-2 text-red-400 hover:bg-red-50 rounded transition-colors" title="Delete Exam">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- VIEW 2: MONITORING --- */}
        {view === 'monitor' && (
            <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Live AI Logs</h1>
                
                {getGroupedData(violations).activeGroups.length === 0 && getGroupedData(violations).unknownItems.length === 0 ? (
                     <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-400">No violations recorded yet.</div>
                ) : (
                    <>
                        {getGroupedData(violations).activeGroups.map(group => (
                            <div key={group.id} className="mb-8">
                                <h3 className="text-lg font-bold text-slate-700 mb-2 bg-slate-100 p-3 rounded-t-lg border-b-0 border border-slate-200 inline-block">{group.subject}</h3>
                                <div className="bg-white rounded-xl rounded-tl-none shadow border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr><th className="p-4">Time</th><th className="p-4">Student</th><th className="p-4">Violation</th><th className="p-4">Confidence</th></tr>
                                        </thead>
                                        <tbody>
                                            {group.items.map(v => (
                                                <tr key={v.id} className="border-b hover:bg-red-50">
                                                    <td className="p-4 text-slate-500">{v.timestamp?.seconds ? new Date(v.timestamp.seconds*1000).toLocaleTimeString() : '...'}</td>
                                                    <td className="p-4 font-medium">{v.studentId}</td>
                                                    <td className="p-4 text-red-600 font-bold flex gap-2"><AlertTriangle size={16}/>{v.type_of_violation}</td>
                                                    <td className="p-4">{v.confidence_score}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        )}

        {/* --- VIEW 3: REVIEW --- */}
        {view === 'review' && (
            <div>
                {!selectedSubmission ? (
                    <>
                        <h1 className="text-2xl font-bold text-slate-800 mb-6">Student Submissions</h1>
                        {getGroupedData(submissions).activeGroups.map(group => (
                            <div key={group.id} className="mb-8">
                                <h3 className="text-lg font-bold text-blue-700 mb-2 bg-blue-50 p-3 rounded-t-lg border-b-0 border border-blue-100 inline-block">{group.subject}</h3>
                                <div className="bg-white rounded-xl rounded-tl-none shadow border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b">
                                            <tr><th className="p-4">Submitted At</th><th className="p-4">Student ID</th><th className="p-4">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {group.items.map(sub => (
                                                <tr key={sub.id} className="border-b hover:bg-slate-50">
                                                    <td className="p-4 text-slate-500">{sub.timestamp?.seconds ? new Date(sub.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</td>
                                                    <td className="p-4 font-medium text-slate-900">{sub.studentId}</td>
                                                    <td className="p-4"><button onClick={() => setSelectedSubmission(sub)} className="text-blue-600 font-bold flex items-center gap-1">Review <ChevronRight size={16} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                        {getGroupedData(submissions).activeGroups.length === 0 && <div className="bg-white p-8 rounded-xl shadow-sm text-center text-slate-400">No submissions yet.</div>}
                    </>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <button onClick={() => setSelectedSubmission(null)} className="mb-4 text-slate-500 hover:text-slate-800 flex items-center gap-2"><ArrowLeft size={16} /> Back to List</button>
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-8 border-b pb-6">
                                <div><h1 className="text-2xl font-bold text-slate-800">{selectedSubmission.examSubject}</h1><p className="text-slate-500">Student: {selectedSubmission.studentId}</p></div>
                                <div className="text-right"><span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">Submitted</span></div>
                            </div>
                            <div className="space-y-8">
                                {Object.entries(selectedSubmission.answers || {}).map(([qId, answer], index) => {
                                    const qDetails = getQuestionDetails(selectedSubmission.examId, qId);
                                    return (
                                        <div key={qId} className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                            <h3 className="font-bold text-slate-700 mb-3 flex gap-2"><span className="bg-slate-200 text-slate-600 px-2 rounded text-sm flex items-center">Q{index + 1}</span>{qDetails.text}</h3>
                                            <div className="ml-8"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Student Answer:</p><div className="text-slate-800 text-lg whitespace-pre-wrap font-medium">{answer}</div></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default LecturerDashboard;