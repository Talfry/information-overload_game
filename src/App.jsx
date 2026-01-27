import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Mail, Trash2, Send, Clock, Play, RotateCcw,
  Search, Star, StarOff, Archive, Inbox, Tag, Brain, AlertTriangle
} from 'lucide-react';

// Complete email templates from HTML version
const emailTemplates = {
  critical: [
    {
      sender: "Sarah Chen (Manager)",
      subject: "URGENT: Q4 Report Deadline Today",
      body: "Hi,\n\nI need the Q4 financial report by end of day. This is critical for tomorrow's board meeting. Can you confirm you'll have it ready?\n\nThe report should include revenue projections, expense breakdowns, and the strategic recommendations we discussed.\n\nPlease respond ASAP.\n\nBest,\nSarah",
      requiresReply: true
    },
    {
      sender: "IT Security Team",
      subject: "Action Required: Password Reset",
      body: "Dear User,\n\nWe've detected unusual activity on your account. For security purposes, you must reset your password within the next hour.\n\nClick the link below to reset:\n[Reset Password]\n\nIf you don't complete this action, your account will be temporarily locked.\n\nIT Security",
      requiresReply: true
    },
    {
      sender: "Client - Marcus Johnson",
      subject: "Re: Project Timeline - Need Confirmation",
      body: "Hi,\n\nI haven't heard back about the revised timeline for the website redesign. We're making decisions about our marketing launch and need to know if you can meet the March 15th deadline.\n\nCan you confirm today? Otherwise we may need to look at other options.\n\nThanks,\nMarcus",
      requiresReply: true
    }
  ],
  spam: [
    { sender: "deals@shopping.com", subject: "50% OFF EVERYTHING TODAY ONLY!", body: "Don't miss out on our biggest sale of the year! Shop now and save big on all items. Limited time offer. Click here to start saving!" },
    { sender: "newsletter@techblog.com", subject: "10 Ways AI is Changing Everything", body: "Check out our latest article on AI trends. Subscribe for more insights delivered weekly. Plus get a free ebook when you sign up today!" },
    { sender: "notifications@social.com", subject: "You have 47 new notifications", body: "See what you missed:\n- Jessica liked your photo\n- Mark commented on your post\n- You were mentioned in a comment\n- 44 other notifications" },
    { sender: "promo@fitness.com", subject: "Get Fit in 30 Days - Special Offer", body: "Transform your body with our proven program. Join now and get 30% off your first month. Thousands of success stories. Start your journey today!" },
    { sender: "updates@news.com", subject: "Your Daily News Digest", body: "Top stories today: Breaking news in politics, technology updates, sports highlights, entertainment news, and more. Stay informed with our daily digest." }
  ],
  normal: [
    { sender: "HR Department", subject: "Reminder: Benefits Enrollment", body: "This is a reminder that benefits enrollment ends next Friday. Please review your options and make your selections in the HR portal at your earliest convenience." },
    { sender: "Team Calendar", subject: "Weekly Team Meeting - Tomorrow 2pm", body: "Reminder: Our weekly team sync is scheduled for tomorrow at 2pm in Conference Room B. Agenda items include project updates and Q1 planning." },
    { sender: "Finance", subject: "Expense Report Approved", body: "Your expense report #4521 has been approved and payment will be processed in the next payroll cycle. Thank you for your timely submission." },
    { sender: "Office Manager", subject: "Building Maintenance - Saturday", body: "Please note that building maintenance will take place this Saturday from 8am-12pm. Internet and elevator access may be temporarily interrupted." },
    { sender: "Learning & Development", subject: "New Training Courses Available", body: "We've added new courses to our learning platform covering project management, data analysis, and leadership skills. Check them out when you have time." },
    { sender: "colleague@company.com", subject: "FYI: Meeting Notes from Yesterday", body: "Hi, just sharing the notes from yesterday's client meeting. Nothing urgent, but wanted to keep you in the loop on what was discussed. Let me know if you have questions." }
  ],
  cc: [
    { sender: "Projects Team", subject: "Re: Re: Re: Design Mockups", body: "[You're CC'd on this thread]\n\nJohn: I updated the mockups based on feedback.\nSarah: Looks good, let's proceed.\nMike: Approved from my end.\nJessica: Sounds great!" },
    { sender: "Facilities", subject: "All Staff: Kitchen Cleaning Schedule", body: "[Mass email]\n\nPlease remember to clean up after using the kitchen. We've posted a new cleaning schedule on the bulletin board. Thank you for your cooperation." }
  ]
};

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Inbox, iconClass: 'text-blue-600' },
  { id: 'important', name: 'Important', icon: Tag, iconClass: 'text-red-600' },
  { id: 'drafts', name: 'Drafts', icon: Mail, iconClass: 'text-yellow-600' }
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

function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function getSnippet(text, len = 60) {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '...' : text;
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
  
  // UI state
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [drafts, setDrafts] = useState({});
  const [emailNotification, setEmailNotification] = useState(null);
  
  // Notifications
  const [pointNotification, setPointNotification] = useState(null);
  const [aiMistakeMsg, setAiMistakeMsg] = useState(null);
  
  const timersRef = useRef([]);
  const emailTimestamps = useRef({});
  const pointDrainIntervals = useRef({});
  const alertTimerRef = useRef(null);

  const playPing = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      // Audio might not be supported
    }
  }, []);

  const changePoints = useCallback((amount) => {
    setPoints(prev => Math.max(0, prev + amount));
    setPointNotification({ amount, id: Date.now() });
    setTimeout(() => setPointNotification(null), 1000);
  }, []);

  const drainFocusAmount = useCallback((amount) => {
    setFocus(prev => Math.max(0, prev - amount * 1.2));
  }, []);

  const endGame = useCallback(() => {
    setGameEnded(true);
    timersRef.current.forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    Object.values(pointDrainIntervals.current).forEach(t => {
      clearTimeout(t);
      clearInterval(t);
    });
    if (alertTimerRef.current) {
      clearInterval(alertTimerRef.current);
    }
  }, []);

  const startPointDrain = useCallback((emailId) => {
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
  }, [changePoints]);

  const showNotification = useCallback((email) => {
    setEmailNotification(email);
    setTimeout(() => setEmailNotification(null), 3000);
  }, []);

  const generateEmail = useCallback(() => {
    const rand = Math.random();
    let template;
    let isCritical = false;

    if (rand < 0.3) {
      const availableCritical = emailTemplates.critical.filter(t => 
        !emails.some(e => e.subject === t.subject && e.unread)
      );
      if (availableCritical.length > 0) {
        template = availableCritical[Math.floor(Math.random() * availableCritical.length)];
      } else {
        const base = emailTemplates.critical[Math.floor(Math.random() * emailTemplates.critical.length)];
        template = {
          ...base,
          subject: "URGENT: " + base.subject,
          sender: base.sender + " (Follow-up)"
        };
      }
      isCritical = true;
    } else if (rand < 0.6) {
      template = emailTemplates.spam[Math.floor(Math.random() * emailTemplates.spam.length)];
    } else {
      const combined = [...emailTemplates.normal, ...emailTemplates.cc];
      template = combined[Math.floor(Math.random() * combined.length)];
    }

    setEmailIdCounter(prev => {
      const newId = prev + 1;
      
      const newEmail = {
        id: newId,
        sender: template.sender,
        subject: template.subject,
        body: template.body,
        folder: 'inbox',
        unread: true,
        starred: false,
        time: formatTime(new Date()),
        receivedAt: Date.now(),
        critical: isCritical,
        completed: false,
        requiresReply: template.requiresReply || false
      };

      emailTimestamps.current[newId] = Date.now();
      setEmails(prev => [newEmail, ...prev]);

      if (isCritical) {
        const drainTimer = setTimeout(() => {
          startPointDrain(newId);
        }, 10000);
        pointDrainIntervals.current[newId] = drainTimer;
      }

      showNotification(newEmail);
      playPing();
      
      return newId;
    });
  }, [emails, startPointDrain, showNotification, playPing]);

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      setGameTime(prev => {
        const newTime = prev + 1000;
        if (newTime >= 300000) {
          endGame();
        }
        return newTime;
      });
    }, 1000);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded, endGame]);

  // Focus drain
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      setFocus(prev => Math.max(0, prev - 0.12));
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
  }, [gameStarted, gameEnded, emailInterval, generateEmail]);

  // Priority alerts
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    
    const triggerAlert = () => {
      setShowPriorityAlert(true);
      setAlertTimeLeft(2.0);
      
      alertTimerRef.current = setInterval(() => {
        setAlertTimeLeft(prev => {
          const newTime = prev - 0.1;
          if (newTime <= 0) {
            clearInterval(alertTimerRef.current);
            setShowPriorityAlert(false);
            changePoints(-5);
            drainFocusAmount(10);
            return 0;
          }
          return newTime;
        });
      }, 100);
    };
    
    const timer = setInterval(triggerAlert, 8000);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded, changePoints, drainFocusAmount]);

  // AI automation
  useEffect(() => {
    if (!aiEnabled || gameEnded || emails.length === 0) return;
    
    const performAction = () => {
      setEmails(prev => {
        const unreadEmails = prev.filter(e => e.unread && e.folder === 'inbox');
        if (unreadEmails.length === 0) return prev;

        const email = unreadEmails[Math.floor(Math.random() * unreadEmails.length)];
        setAiDecisions(d => d + 1);

        const decision = Math.random();

        if (email.critical && decision < 0.4) {
          setAiMistakes(m => m + 1);
          changePoints(-10);
          setAiMistakeMsg({ subject: email.subject, id: Date.now() });
          setTimeout(() => setAiMistakeMsg(null), 3000);
          
          return prev.filter(e => e.id !== email.id);
        } else if (!email.critical && decision < 0.7) {
          drainFocusAmount(5);
          setTimeout(() => {
            setEmails(p => p.filter(e => e.id !== email.id));
          }, 2000);
          return prev.map(e => 
            e.id === email.id ? { ...e, unread: false } : e
          );
        } else {
          return prev.filter(e => e.id !== email.id);
        }
      });
    };
    
    const timer = setInterval(performAction, 3000);
    timersRef.current.push(timer);
    return () => clearInterval(timer);
  }, [aiEnabled, gameEnded, emails.length, changePoints, drainFocusAmount]);

  // Show AI modal when appropriate
  useEffect(() => {
    if (!aiModalShown && totalProcessed > 8 && focus < 40 && !gameEnded) {
      setAiModalShown(true);
      setShowAIModal(true);
    }
  }, [totalProcessed, focus, aiModalShown, gameEnded]);

  const dismissAlert = () => {
    if (alertTimerRef.current) {
      clearInterval(alertTimerRef.current);
    }
    setShowPriorityAlert(false);
    drainFocusAmount(3);
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
    setShowReplyBox(false);
    setReplyText('');
    setDrafts({});
    emailTimestamps.current = {};
    pointDrainIntervals.current = {};
  };

  const selectEmail = (email) => {
    // Save draft if switching from another email
    if (selectedEmail && showReplyBox) {
      setDrafts(prev => ({ ...prev, [selectedEmail.id]: replyText }));
    }
    
    setSelectedEmail(email);
    drainFocusAmount(2);
    setEmails(prev => prev.map(e => (e.id === email.id ? { ...e, unread: false } : e)));
    
    // Load draft if exists
    if (drafts[email.id]) {
      setReplyText(drafts[email.id]);
    } else {
      setReplyText('');
    }
    setShowReplyBox(false);
  };

  const deleteEmail = (emailId) => {
    drainFocusAmount(1);
    if (pointDrainIntervals.current[emailId]) {
      clearInterval(pointDrainIntervals.current[emailId]);
      clearTimeout(pointDrainIntervals.current[emailId]);
      delete pointDrainIntervals.current[emailId];
    }
    setEmails(prev => prev.filter(e => e.id !== emailId));
    setTotalProcessed(prev => prev + 1);
    
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
      setShowReplyBox(false);
    }
  };

  const archiveEmail = (emailId) => {
    deleteEmail(emailId);
  };

  const toggleReply = () => {
    setShowReplyBox(prev => !prev);
    if (!showReplyBox) {
      drainFocusAmount(3);
    }
  };

  const sendReply = () => {
    if (!selectedEmail) return;
    
    drainFocusAmount(5);
    
    if (selectedEmail.critical) {
      const responseTime = (Date.now() - emailTimestamps.current[selectedEmail.id]) / 1000;
      let pointsEarned = responseTime < 10 ? 15 : responseTime < 20 ? 10 : responseTime < 40 ? 5 : 2;
      changePoints(pointsEarned);
      
      if (pointDrainIntervals.current[selectedEmail.id]) {
        clearInterval(pointDrainIntervals.current[selectedEmail.id]);
        clearTimeout(pointDrainIntervals.current[selectedEmail.id]);
        delete pointDrainIntervals.current[selectedEmail.id];
      }
      
      setEmails(prev => prev.map(e => 
        e.id === selectedEmail.id ? { ...e, completed: true } : e
      ));
    } else {
      setUnnecessaryReplies(prev => prev + 1);
      setEmailInterval(prev => Math.max(800, prev * 0.9));
      changePoints(-3);
    }

    setTotalProcessed(prev => prev + 1);
    setDrafts(prev => {
      const newDrafts = { ...prev };
      delete newDrafts[selectedEmail.id];
      return newDrafts;
    });
    deleteEmail(selectedEmail.id);
  };

  const getFolderEmails = (folderId) => {
    if (folderId === 'drafts') {
      return emails.filter(e => drafts[e.id]);
    }
    return emails.filter(e => e.folder === folderId);
  };
  
  const getUnreadCount = (folderId) => {
    if (folderId === 'drafts') {
      return Object.keys(drafts).length;
    }
    return emails.filter(e => e.folder === folderId && e.unread).length;
  };

  const filteredEmails = useMemo(() => {
    const list = getFolderEmails(currentFolder);
    if (!search.trim()) return [...list].sort((a, b) => b.receivedAt - a.receivedAt);
    const q = search.toLowerCase();
    return list
      .filter(e =>
        e.sender.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q)
      )
      .sort((a, b) => b.receivedAt - a.receivedAt);
  }, [emails, currentFolder, search, drafts]);

  // Game over screen
  if (gameEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⏰</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Time&apos;s Up</h2>
            <div className="text-5xl font-bold text-indigo-600 mb-4">{points} points</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-2">
            <div className="text-gray-700">Emails Processed: {totalProcessed}</div>
            <div className="text-gray-700">Final Focus Level: {Math.round(focus)}%</div>
            <div className="text-gray-700">AI Decisions: {aiDecisions} ({totalProcessed > 0 ? Math.round((aiDecisions / totalProcessed) * 100) : 0}%)</div>
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
            &quot;The inbox never stops. The emails never end.&quot;
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
          <h1 className="text-6xl font-bold text-gray-800 mb-4">INBOX</h1>
          <p className="text-xl text-gray-600 mb-6">An Allegory of Information Overload</p>
          <p className="text-base text-gray-600 mb-8 leading-relaxed">
            Your task is simple: respond to critical emails as quickly as possible to earn points.
            But emails keep arriving. Faster than you can read them. Every second counts.
            When you&apos;re exhausted, the AI will offer help. But can you trust it?
          </p>
          <button onClick={startGame} className="bg-white text-indigo-600 px-10 py-4 rounded-full text-xl font-semibold hover:scale-105 transition">
            Start Working
          </button>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Priority Alert */}
      {showPriorityAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-pulse">
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-12 rounded-2xl shadow-2xl text-center">
            <div className="text-3xl font-bold mb-4">⚠️ HIGH PRIORITY</div>
            <div className="text-xl mb-4">Urgent action required!</div>
            <div className="text-6xl font-mono font-bold mb-6">{alertTimeLeft.toFixed(1)}</div>
            <button
              onClick={dismissAlert}
              className="bg-white text-red-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition hover:scale-110"
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
            <div className="text-3xl mb-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
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
                Enable AI Help
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Notification Popup */}
      {emailNotification && (
        <div className="fixed top-20 right-5 bg-white p-4 rounded-lg shadow-xl z-30 flex items-center gap-4 animate-slide-in">
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xl">
            📧
          </div>
          <div>
            <div className="font-semibold text-sm">{emailNotification.sender}</div>
            <div className="text-xs text-gray-600">{emailNotification.subject}</div>
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
            &quot;{aiMistakeMsg.subject}&quot;
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-indigo-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xl font-semibold">
            📧 Inbox
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-xs opacity-90">TIME LEFT</div>
              <div className="font-semibold text-lg">{formatTimeClock(300000 - gameTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-90">POINTS</div>
              <div className="text-xl font-bold">{points}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-90 mb-1">FOCUS</div>
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
              className={`px-5 py-2 rounded-full text-sm font-semibold transition flex items-center gap-2 ${
                aiEnabled
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              <Brain className="w-4 h-4" />
              {aiEnabled ? '✓ AI Active' : '🤖 Enable AI Assistant'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-52 bg-white border-r">
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
                    'w-full px-4 py-3 rounded-md flex items-center justify-between text-sm transition mb-1',
                    active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={classNames('w-4 h-4', folder.iconClass)} />
                    <span className="font-medium">{folder.name}</span>
                  </div>
                  {unread > 0 && <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">{unread}</span>}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Email List */}
        <section className="w-96 bg-white border-r flex flex-col">
          <div className="flex-1 overflow-auto">
            {filteredEmails.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <Mail className="w-12 h-12 mb-2" />
                <p className="text-sm">No emails</p>
              </div>
            ) : (
              <div>
                {filteredEmails.map(email => (
                  <div
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={classNames(
                      'px-5 py-4 border-b cursor-pointer transition relative',
                      selectedEmail?.id === email.id ? 'bg-indigo-50' : 'hover:bg-gray-50',
                      email.unread && 'bg-blue-50 font-semibold'
                    )}
                  >
                    <div className="text-xs text-gray-500 absolute top-4 right-5">{email.time}</div>
                    <div className="text-sm mb-1">{email.sender}</div>
                    <div className="text-sm text-gray-700 mb-1">{email.subject}</div>
                    <div className="text-xs text-gray-500 truncate pr-12">{getSnippet(email.body)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Reading Pane */}
        <section className="flex-1 bg-white flex flex-col overflow-hidden">
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-sm">Select an email to read</p>
            </div>
          ) : (
            <>
              <div className="px-8 pt-6 pb-4 border-b">
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">{selectedEmail.subject}</h3>
                <div className="text-sm text-gray-600 flex gap-5">
                  <div><strong>From:</strong> {selectedEmail.sender}</div>
                  <div><strong>Time:</strong> {selectedEmail.time}</div>
                </div>
              </div>

              <div className="flex-1 p-8 text-gray-800 leading-relaxed whitespace-pre-line overflow-auto">
                {selectedEmail.body}
              </div>

              <div className="px-8 pb-4 border-t pt-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={toggleReply}
                    className="px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    ↩️ Reply
                  </button>
                  <button
                    onClick={() => archiveEmail(selectedEmail.id)}
                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="px-5 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition flex items-center gap-2"
                  >
                    🗑️ Delete
                  </button>
                  {focus < 50 && !aiEnabled && (
                    <button
                      onClick={() => setShowAIModal(true)}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded hover:from-purple-700 hover:to-indigo-700 transition animate-pulse"
                    >
                      🤖 AI Reply
                    </button>
                  )}
                </div>

                {showReplyBox && (
                  <div className="bg-gray-50 p-5 rounded-lg">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="w-full h-32 p-3 border border-gray-300 rounded resize-none focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={sendReply}
                        className="px-5 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
                      >
                        Send
                      </button>
                      <button
                        onClick={toggleReply}
                        className="px-5 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}