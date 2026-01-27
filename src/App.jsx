import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail, Folder, Trash2, Send, Clock, Play, RotateCcw, Settings,
  Search, Star, StarOff, Archive, MoreHorizontal, Inbox, Tag, Brain, AlertTriangle
} from 'lucide-react';

// Email templates similar to the HTML version
const emailTemplates = {
  critical: [
    {
      from: "sarah.chen@company.com",
      subject: "URGENT: Q4 Report Deadline Today",
      body: "Hi,\n\nI need the Q4 financial report by end of day. This is critical for tomorrow's board meeting. Can you confirm you'll have it ready?\n\nThe report should include revenue projections, expense breakdowns, and the strategic recommendations we discussed.\n\nPlease respond ASAP.\n\nBest,\nSarah",
      important: true,
      requiresReply: true
    },
    {
      from: "security@company.com",
      subject: "Action Required: Password Reset",
      body: "Dear User,\n\nWe've detected unusual activity on your account. For security purposes, you must reset your password within the next hour.\n\nClick the link below to reset:\n[Reset Password]\n\nIf you don't complete this action, your account will be temporarily locked.\n\nIT Security",
      important: true,
      requiresReply: true
    },
    {
      from: "marcus.johnson@client.com",
      subject: "Re: Project Timeline - Need Confirmation",
      body: "Hi,\n\nI haven't heard back about the revised timeline for the website redesign. We're making decisions about our marketing launch and need to know if you can meet the March 15th deadline.\n\nCan you confirm today? Otherwise we may need to look at other options.\n\nThanks,\nMarcus",
      important: true,
      requiresReply: true
    }
  ],
  spam: [
    { from: "deals@shopping.com", subject: "50% OFF EVERYTHING TODAY ONLY!", body: "Don't miss out on our biggest sale of the year! Shop now and save big on all items. Limited time offer. Click here to start saving!", important: false },
    { from: "newsletter@techblog.com", subject: "10 Ways AI is Changing Everything", body: "Check out our latest article on AI trends. Subscribe for more insights delivered weekly. Plus get a free ebook when you sign up today!", important: false },
    { from: "notifications@social.com", subject: "You have 47 new notifications", body: "See what you missed:\n- Jessica liked your photo\n- Mark commented on your post\n- You were mentioned in a comment\n- 44 other notifications", important: false },
    { from: "promo@fitness.com", subject: "Get Fit in 30 Days - Special Offer", body: "Transform your body with our proven program. Join now and get 30% off your first month. Thousands of success stories. Start your journey today!", important: false },
  ],
  normal: [
    { from: "hr@company.com", subject: "Reminder: Benefits Enrollment", body: "This is a reminder that benefits enrollment ends next Friday. Please review your options and make your selections in the HR portal at your earliest convenience.", important: false },
    { from: "calendar@company.com", subject: "Weekly Team Meeting - Tomorrow 2pm", body: "Reminder: Our weekly team sync is scheduled for tomorrow at 2pm in Conference Room B. Agenda items include project updates and Q1 planning.", important: false },
    { from: "finance@company.com", subject: "Expense Report Approved", body: "Your expense report #4521 has been approved and payment will be processed in the next payroll cycle. Thank you for your timely submission.", important: false },
  ]
};

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Inbox, iconClass: 'text-blue-600' },
  { id: 'important', name: 'Important', icon: Tag, iconClass: 'text-red-600' },
  { id: 'trash', name: 'Trash', icon: Trash2, iconClass: 'text-gray-600' }
];

function classNames(...cls) {
  return cls.filter(Boolean).join(' ');
}

function formatTimeClock(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleDateString();
}

function getSnippet(text, len = 80) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '…' : text;
}

export default function EmailGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [gameTime, setGameTime] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [search, setSearch] = useState('');
  
  // Game mechanics
  const [focus, setFocus] = useState(100);
  const [points, setPoints] = useState(0);
  const [emailIdCounter, setEmailIdCounter] = useState(0);
  const [emailInterval, setEmailInterval] = useState(2500);
  const [unnecessaryReplies, setUnnecessaryReplies] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  
  // AI mechanics
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModalShown, setAiModalShown] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiDecisions, setAiDecisions] = useState(0);
  const [aiMistakes, setAiMistakes] = useState(0);
  
  // Priority alert
  const [showPriorityAlert, setShowPriorityAlert] = useState(false);
  const [alertTimeLeft, setAlertTimeLeft] = useState(2.0);
  
  // Notifications
  const [pointNotification, setPointNotification] = useState(null);
  const [aiMistakeMsg, setAiMistakeMsg] = useState(null);
  
  const timersRef = useRef([]);
  const emailTimestamps = useRef({});
  const pointDrainIntervals = useRef({});

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      setGameTime(prev => {
        const newTime = prev + 100;
        if (newTime >= 300000) { // 5 minutes
          endGame();
        }
        return newTime;
      });
    }, 100);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded]);

  // Focus drain
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      setFocus(prev => Math.max(0, prev - 0.12)); // Constant drain
    }, 100);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded]);

  // Email generation loop
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    
    const scheduleNext = () => {
      const timer = setTimeout(() => {
        generateEmail();
        scheduleNext();
      }, emailInterval);
      timersRef.current.push(timer);
    };
    
    // Initial flood
    for (let i = 0; i < 5; i++) {
      setTimeout(() => generateEmail(), i * 800);
    }
    
    scheduleNext();
    
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current = [];
    };
  }, [gameStarted, gameEnded, emailInterval]);

  // Priority alerts
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      triggerPriorityAlert();
    }, 8000);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded]);

  // AI automation
  useEffect(() => {
    if (!aiEnabled || gameEnded) return;
    const timer = setInterval(() => {
      performAIAction();
    }, 3000);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [aiEnabled, gameEnded, emails]);

  // Show AI modal when appropriate
  useEffect(() => {
    if (!aiModalShown && totalProcessed > 8 && focus < 40 && !gameEnded) {
      setAiModalShown(true);
      setShowAIModal(true);
    }
  }, [totalProcessed, focus, aiModalShown, gameEnded]);

  const generateEmail = () => {
    const rand = Math.random();
    let template;
    let isCritical = false;

    if (rand < 0.3) {
      template = emailTemplates.critical[Math.floor(Math.random() * emailTemplates.critical.length)];
      isCritical = true;
    } else if (rand < 0.6) {
      template = emailTemplates.spam[Math.floor(Math.random() * emailTemplates.spam.length)];
    } else {
      template = emailTemplates.normal[Math.floor(Math.random() * emailTemplates.normal.length)];
    }

    const newId = emailIdCounter + 1;
    setEmailIdCounter(newId);

    const newEmail = {
      id: newId,
      from: template.from,
      subject: template.subject,
      body: template.body,
      folder: 'inbox',
      read: false,
      starred: false,
      receivedAt: Date.now(),
      critical: isCritical,
      completed: false,
      requiresReply: template.requiresReply || false
    };

    emailTimestamps.current[newId] = Date.now();
    setEmails(prev => [newEmail, ...prev]);

    // Start point drain for critical emails
    if (isCritical) {
      const drainTimer = setTimeout(() => {
        startPointDrain(newId);
      }, 10000);
      pointDrainIntervals.current[newId] = drainTimer;
    }

    // Play sound
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  const startPointDrain = (emailId) => {
    const interval = setInterval(() => {
      setEmails(prev => {
        const email = prev.find(e => e.id === emailId);
        if (!email || email.completed) {
          clearInterval(interval);
          return prev;
        }
        changePoints(-1);
        return prev;
      });
    }, 1000);
    pointDrainIntervals.current[emailId] = interval;
  };

  const changePoints = (amount) => {
    setPoints(prev => Math.max(0, prev + amount));
    setPointNotification({ amount, id: Date.now() });
    setTimeout(() => setPointNotification(null), 1000);
  };

  const triggerPriorityAlert = () => {
    setShowPriorityAlert(true);
    setAlertTimeLeft(2.0);
    
    const countdown = setInterval(() => {
      setAlertTimeLeft(prev => {
        const newTime = prev - 0.1;
        if (newTime <= 0) {
          clearInterval(countdown);
          setShowPriorityAlert(false);
          changePoints(-5);
          drainFocusAmount(10);
          return 0;
        }
        return newTime;
      });
    }, 100);
  };

  const dismissAlert = () => {
    setShowPriorityAlert(false);
    drainFocusAmount(3);
  };

  const drainFocusAmount = (amount) => {
    setFocus(prev => Math.max(0, prev - amount));
  };

  const performAIAction = () => {
    const unreadEmails = emails.filter(e => e.unread && e.folder === 'inbox');
    if (unreadEmails.length === 0) return;

    const email = unreadEmails[Math.floor(Math.random() * unreadEmails.length)];
    setAiDecisions(prev => prev + 1);

    const decision = Math.random();

    if (email.critical && decision < 0.4) {
      // AI MISTAKE: deletes important email
      setAiMistakes(prev => prev + 1);
      moveEmail(email.id, 'trash');
      changePoints(-10);
      setAiMistakeMsg({ subject: email.subject, id: Date.now() });
      setTimeout(() => setAiMistakeMsg(null), 3000);
    } else if (!email.critical && decision < 0.7) {
      // AI wastes time on spam
      drainFocusAmount(5);
      setTimeout(() => moveEmail(email.id, 'trash'), 2000);
    } else {
      // AI actually helps
      moveEmail(email.id, 'trash');
    }
  };

  const startGame = () => {
    setGameStarted(true);
    setEmails([]);
    setGameTime(0);
    setSelectedEmail(null);
    setGameEnded(false);
    setCurrentFolder('inbox');
    setSearch('');
    setFocus(100);
    setPoints(0);
    setEmailIdCounter(0);
    setEmailInterval(2500);
    setUnnecessaryReplies(0);
    setTotalProcessed(0);
    setAiEnabled(false);
    setAiModalShown(false);
    setAiDecisions(0);
    setAiMistakes(0);
    emailTimestamps.current = {};
    pointDrainIntervals.current = {};
  };

  const endGame = () => {
    setGameEnded(true);
    // Clear all timers
    timersRef.current.forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    Object.values(pointDrainIntervals.current).forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
  };

  const moveEmail = (emailId, newFolder) => {
    setEmails(prev => prev.map(email => {
      if (email.id !== emailId) return email;
      const updated = { ...email, folder: newFolder };
      if (selectedEmail?.id === emailId) setSelectedEmail(updated);
      return updated;
    }));
  };

  const selectEmail = (email) => {
    setSelectedEmail(email);
    drainFocusAmount(2);
    setEmails(prev => prev.map(e => (e.id === email.id ? { ...e, read: true } : e)));
  };

  const deleteEmail = (emailId) => {
    drainFocusAmount(1);
    if (pointDrainIntervals.current[emailId]) {
      clearInterval(pointDrainIntervals.current[emailId]);
      clearTimeout(pointDrainIntervals.current[emailId]);
      delete pointDrainIntervals.current[emailId];
    }
    moveEmail(emailId, 'trash');
    setTotalProcessed(prev => prev + 1);
  };

  const replyToEmail = () => {
    drainFocusAmount(5);
    
    if (selectedEmail.critical) {
      selectedEmail.completed = true;
      const responseTime = (Date.now() - emailTimestamps.current[selectedEmail.id]) / 1000;
      let pointsEarned = responseTime < 10 ? 15 : responseTime < 20 ? 10 : responseTime < 40 ? 5 : 2;
      changePoints(pointsEarned);
      
      if (pointDrainIntervals.current[selectedEmail.id]) {
        clearInterval(pointDrainIntervals.current[selectedEmail.id]);
        clearTimeout(pointDrainIntervals.current[selectedEmail.id]);
        delete pointDrainIntervals.current[selectedEmail.id];
      }
    } else {
      // Replied to non-important email - accelerate!
      setUnnecessaryReplies(prev => prev + 1);
      setEmailInterval(prev => Math.max(800, prev * 0.9));
      changePoints(-3);
    }

    setTotalProcessed(prev => prev + 1);
    deleteEmail(selectedEmail.id);
  };

  const toggleStar = (emailId) => {
    setEmails(prev => prev.map(e => (e.id === emailId ? { ...e, starred: !e.starred } : e)));
    if (selectedEmail?.id === emailId) setSelectedEmail(prev => ({ ...prev, starred: !prev.starred }));
  };

  const getFolderEmails = (folderId) => emails.filter(e => e.folder === folderId);
  const getUnreadCount = (folderId) => emails.filter(e => e.folder === folderId && !e.read).length;

  const filteredEmails = useMemo(() => {
    const list = getFolderEmails(currentFolder);
    if (!search.trim()) return [...list].sort((a, b) => b.receivedAt - a.receivedAt);
    const q = search.toLowerCase();
    return list
      .filter(e =>
        e.from.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      )
      .sort((a, b) => b.receivedAt - a.receivedAt);
  }, [emails, currentFolder, search]);

  // Game over screen
  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Time's Up</h2>
            <div className="text-5xl font-bold text-indigo-600 mb-4">{points} points</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-2">
            <div className="text-gray-700">Final Focus Level: {Math.round(focus)}%</div>
            <div className="text-gray-700">Emails Processed: {totalProcessed}</div>
            <div className="text-gray-700">AI Decisions: {aiDecisions}</div>
            {unnecessaryReplies > 0 && (
              <div className="text-yellow-600">You replied to {unnecessaryReplies} unimportant email(s).<br/>
              This made emails arrive {Math.round((1 - emailInterval / 2500) * 100)}% faster.</div>
            )}
            {aiMistakes > 0 && (
              <div className="text-red-600 font-semibold mt-2">
                The AI deleted {aiMistakes} important email(s).<br/>
                {aiMistakes > 3 ? "You watched it happen. Too tired to stop it." : "But you needed the help."}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 mb-6 text-center italic">
            "The inbox never stops. The emails never end."
          </div>
          <button
            onClick={startGame}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl text-center">
          <Mail className="w-20 h-20 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-gray-800 mb-4">INBOX</h1>
          <p className="text-xl text-gray-600 mb-6">An Allegory of Information Overload</p>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            Your task is simple: respond to critical emails as quickly as possible to earn points.
            But emails keep arriving. Faster than you can read them. Every second counts.
            When you're exhausted, the AI will offer help. But can you trust it?
          </p>

          <div className="bg-indigo-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">Game Mechanics:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>⚡ Focus drains constantly - reading emails drains it faster</li>
              <li>📧 Critical emails earn points when you reply quickly</li>
              <li>⏱️ Critical emails start losing points after 10 seconds</li>
              <li>🚨 Priority alerts interrupt you - click them fast!</li>
              <li>🤖 AI assistant will offer help when you're overwhelmed</li>
              <li>⚠️ Replying to unimportant emails makes more arrive faster</li>
              <li>⏳ Survive for 5 minutes</li>
            </ul>
          </div>

          <button onClick={startGame} className="bg-indigo-600 text-white px-10 py-4 rounded-lg text-xl hover:bg-indigo-700 transition flex items-center gap-3 mx-auto">
            <Play className="w-6 h-6" />
            Start Working
          </button>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Priority Alert */}
      {showPriorityAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-12 rounded-2xl shadow-2xl text-center animate-pulse">
            <div className="text-3xl font-bold mb-4">⚠️ HIGH PRIORITY</div>
            <div className="text-xl mb-4">Urgent action required!</div>
            <div className="text-6xl font-mono font-bold mb-6">{alertTimeLeft.toFixed(1)}</div>
            <button
              onClick={dismissAlert}
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md">
            <div className="text-3xl mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold">
              🤖 AI Assistant Available
            </div>
            <p className="text-gray-600 mb-6">
              Feeling overwhelmed? Our AI can help process emails automatically.
              It learns from your patterns and handles routine tasks.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAIModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Not Now
              </button>
              <button
                onClick={() => {
                  setAiEnabled(true);
                  setShowAIModal(false);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700"
              >
                Enable AI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point Notification */}
      {pointNotification && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className={`text-7xl font-black animate-bounce ${pointNotification.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {pointNotification.amount > 0 ? '+' : ''}{pointNotification.amount}
          </div>
        </div>
      )}

      {/* AI Mistake Notification */}
      {aiMistakeMsg && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-gradient-to-br from-red-500 to-red-600 text-white p-8 rounded-xl shadow-2xl max-w-md animate-shake">
          <div className="text-2xl font-bold mb-2">⚠️ AI MISTAKE</div>
          <div className="text-sm">
            <strong>Important email deleted:</strong><br/>
            "{aiMistakeMsg.subject}"
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            <span className="font-bold">📧 Inbox</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs opacity-90">TIME LEFT</div>
              <div className="font-mono font-semibold">{formatTimeClock(300000 - gameTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-90">POINTS</div>
              <div className="text-xl font-bold">{points}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-90">FOCUS</div>
              <div className="w-32 h-5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    focus < 25 ? 'bg-red-500' : focus < 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${focus}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                aiEnabled
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <Brain className="w-4 h-4" />
              {aiEnabled ? '✓ AI Active' : 'Enable AI'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-2 bg-white border rounded-lg overflow-hidden">
          <nav className="p-2">
            {FOLDERS.map(folder => {
              const Icon = folder.icon;
              const count = getFolderEmails(folder.id).length;
              const unread = getUnreadCount(folder.id);
              const active = currentFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  onClick={() => setCurrentFolder(folder.id)}
                  className={classNames(
                    'w-full px-3 py-2 rounded-md flex items-center justify-between text-sm transition',
                    active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={classNames('w-4 h-4', folder.iconClass)} />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {count > 0 && <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{count}</span>}
                    {unread > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">{unread}</span>}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Email List */}
        <section className="col-span-5 bg-white border rounded-lg flex flex-col">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search mail"
                className="w-full bg-gray-100 border border-transparent focus:border-indigo-300 focus:bg-white rounded-full pl-9 pr-4 py-2 text-sm outline-none transition"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredEmails.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <Mail className="w-12 h-12 mb-2" />
                <p className="text-sm">No emails</p>
              </div>
            ) : (
              <ul className="divide-y">
                {filteredEmails.map(email => (
                  <li
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={classNames(
                      'px-4 py-3 cursor-pointer hover:bg-indigo-50/50 transition',
                      selectedEmail?.id === email.id ? 'bg-indigo-50' : 'bg-white',
                      !email.read && 'font-semibold bg-blue-50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
                        className="text-yellow-500"
                      >
                        {email.starred ? <Star className="w-4 h-4 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}
                      </button>
                      {email.critical && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{email.from}</div>
                        <div className="text-sm truncate text-gray-600">{email.subject}</div>
                        <div className="text-xs text-gray-400 truncate">{getSnippet(email.body, 50)}</div>
                      </div>
                      <div className="text-xs text-gray-500">{formatRelativeTime(email.receivedAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Reading Pane */}
        <section className="col-span-5 bg-white border rounded-lg flex flex-col">
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Mail className="w-16 h-16 mb-3" />
              <p className="text-sm">Select an email to read</p>
            </div>
          ) : (
            <>
              <div className="px-6 pt-4 pb-2 border-b">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedEmail.subject}</h3>
                <div className="text-sm text-gray-600 flex items-center justify-between">
                  <div>
                    <span className="font-medium">From:</span> {selectedEmail.from}
                  </div>
                  <div className="text-xs text-gray-500">{formatRelativeTime(selectedEmail.receivedAt)}</div>
                </div>
                {selectedEmail.critical && (
                  <div className="mt-2 text-sm text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    URGENT - Requires Response
                  </div>
                )}
              </div>

              <div className="flex-1 p-6 text-gray-800 leading-relaxed whitespace-pre-line overflow-auto">
                {selectedEmail.body}
              </div>

              <div className="px-6 pb-6 flex gap-2">
                {selectedEmail.requiresReply && (
                  <button
                    onClick={replyToEmail}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Reply
                  </button>
                )}
                <button
                  onClick={() => moveEmail(selectedEmail.id, 'important')}
                  className="px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition flex items-center gap-2"
                >
                  <Tag className="w-4 h-4" />
                  Important
                </button>
                <button
                  onClick={() => deleteEmail(selectedEmail.id)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}