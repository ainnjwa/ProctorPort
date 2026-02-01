import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import AIMonitor from '../AIMonitor/AIMonitor';
import './Student.css';

const StudentExam = ({ user, exam, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [violationMsg, setViolationMsg] = useState(null);
  
  // Store answers: { [questionId]: "user answer" }
  const [answers, setAnswers] = useState({});

  // TIMER + FULLSCREEN ENFORCEMENT
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const enforceFullscreen = () => {
      if (!document.fullscreenElement) {
        setViolationMsg('DO NOT EXIT FULL SCREEN MODE');
      }
    };

    document.addEventListener('fullscreenchange', enforceFullscreen);
    return () => {
      clearInterval(timer);
      document.removeEventListener('fullscreenchange', enforceFullscreen);
    };
  }, [onFinish]);

  // HANDLE AI VIOLATION ALERT
  const handleViolationAlert = (msg) => {
    setViolationMsg(msg);
    setTimeout(() => setViolationMsg(null), 3000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle Input Changes
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
        ...prev,
        [questionId]: value
    }));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <AIMonitor
        examId={exam.id}
        studentId={user.email}   
        onViolation={handleViolationAlert}
      />

      {/* VIOLATION OVERLAY */}
      {violationMsg && (
        <div className="fixed inset-0 bg-red-500/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600 text-white p-8 rounded-2xl shadow-2xl text-center animate-bounce">
            <AlertTriangle size={64} className="mx-auto mb-4" />
            <h2 className="text-3xl font-black mb-2">VIOLATION DETECTED</h2>
            <p className="text-xl">{violationMsg}</p>
            <p className="text-sm mt-4 opacity-80">This incident has been logged.</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow z-40 sticky top-0">
        <div>
          <h1 className="text-lg font-bold">{exam.subject}</h1>
          <p className="text-xs text-slate-400">Student ID: {user.email}</p>
        </div>

        <div className={`text-xl font-mono font-bold px-4 py-2 rounded ${
          timeLeft < 300 ? 'bg-red-600 animate-pulse' : 'bg-slate-800'
        }`}>
          <Clock size={18} className="inline mr-2" />
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* MAIN EXAM CONTENT */}
      <main className="flex-1 p-8 max-w-4xl mx-auto w-full overflow-y-auto">
        
        {/* FALLBACK: Handle Old Exam Format (Single Question) */}
        {!exam.questions && (
             <div className="bg-white p-8 rounded-xl shadow border border-slate-200 mb-6">
                <h3 className="font-bold text-lg mb-4">Question 1</h3>
                <p className="text-lg text-slate-700 mb-8 whitespace-pre-wrap">{exam.question}</p>
                <textarea
                    className="w-full h-64 border border-slate-300 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                    placeholder="Type your answer here..."
                />
             </div>
        )}

        {/* NEW: Handle Multiple Questions */}
        {exam.questions?.map((q, index) => (
            <div key={q.id || index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
                <div className="flex gap-2 mb-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        {q.type === 'mcq' ? 'Multiple Choice' : 'Essay'}
                    </span>
                </div>
                
                <h3 className="font-bold text-lg text-slate-800 mb-2">Question {index + 1}</h3>
                <p className="text-slate-700 mb-6 whitespace-pre-wrap text-lg">{q.text}</p>

                {/* TEXT INPUT RENDERER */}
                {q.type === 'text' && (
                    <textarea
                        className="w-full h-40 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Type your answer here..."
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        value={answers[q.id] || ''}
                    />
                )}

                {/* MCQ INPUT RENDERER */}
                {q.type === 'mcq' && (
                    <div className="space-y-3">
                        {q.options?.map((option, i) => (
                            <label key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition">
                                <input 
                                    type="radio" 
                                    name={`question_${q.id}`} 
                                    value={option}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    checked={answers[q.id] === option}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-slate-700">{option}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        ))}

        <div className="mt-8 flex justify-end pb-12">
          <button
            onClick={() => onFinish(answers)}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-blue-700 transition flex items-center gap-2">
              Submit Exam <CheckCircle size={20} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default StudentExam;