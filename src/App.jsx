import React, { useState, useEffect } from 'react';
import { Mail, Folder, Trash2, Send, Clock, Play, RotateCcw, Settings } from 'lucide-react';

// Pre-made emails that arrive over time
const GAME_EMAILS = [
  {
    id: 1,
    from: "sarah.chen@company.com",
    subject: "Project Update - Urgent",
    body: "The quarterly report shows unusual patterns in department spending. I think you should look into this before the board meeting.",
    arriveAt: 3000
  },
  {
    id: 2,
    from: "mike.torres@company.com",
    subject: "Re: Budget Concerns",
    body: "I've noticed the same thing Sarah mentioned. The numbers don't add up in the marketing department's expenses.",
    arriveAt: 8000
  },
  {
    id: 3,
    from: "hr@company.com",
    subject: "Confidential: Employee Investigation",
    body: "We've received anonymous reports about policy violations. Please review the attached guidelines and report any knowledge you have.",
    arriveAt: 15000
  },
  {
    id: 4,
    from: "alex.kim@company.com",
    subject: "Let's talk",
    body: "Can we meet privately? I have information about what's really happening with the budget issues. I'm worried about retaliation.",
    arriveAt: 22000
  },
  {
    id: 5,
    from: "ceo@company.com",
    subject: "Board Meeting Tomorrow",
    body: "I need your assessment of the situation by end of day. The board is asking tough questions and I need to know where you stand.",
    arriveAt: 30000
  }
];

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Mail, color: 'blue' },
  { id: 'important', name: 'Important', icon: Folder, color: 'red' },
  { id: 'evidence', name: 'Evidence', icon: Folder, color: 'yellow' },
  { id: 'personal', name: 'Personal', icon: Folder, color: 'green' },
  { id: 'trash', name: 'Trash', icon: Trash2, color: 'gray' }
];

const FINAL_CHOICES = [
  { 
    id: 'report', 
    label: 'Report everything to HR immediately', 
    emoji: '📋',
    result: 'You reported the issues through official channels. HR launched a full investigation. While this was the ethical choice, it created tension in the office. Some colleagues appreciate your integrity, others see you as a whistleblower. The company implements new oversight policies.',
    score: 85
  },
  { 
    id: 'ceo', 
    label: 'Side with the CEO and downplay concerns', 
    emoji: '🤝',
    result: 'You chose loyalty to leadership. The issues were swept under the rug temporarily, but eventually came to light through external audits. Your credibility was damaged, though your relationship with the CEO remained intact in the short term.',
    score: 45
  },
  { 
    id: 'investigate', 
    label: 'Investigate privately before deciding', 
    emoji: '🔍',
    result: 'You took a measured approach, gathering more information before acting. This revealed the full scope of the issue - a well-intentioned but poorly documented expense system. You helped implement better procedures, earning respect from all parties.',
    score: 95
  },
  { 
    id: 'collaborate', 
    label: 'Organize a meeting with all involved parties', 
    emoji: '👥',
    result: 'You brought everyone together for transparent discussion. This collaborative approach helped clear up misunderstandings and led to systemic improvements. The team appreciated your inclusive leadership style.',
    score: 90
  },
  { 
    id: 'resign', 
    label: 'Remove yourself from the situation', 
    emoji: '🚪',
    result: 'You decided this ethical dilemma was too much and submitted your resignation. While you maintained your personal integrity, you left colleagues to handle the situation without your input. Sometimes stepping away is self-care, sometimes it\'s avoidance.',
    score: 60
  }
];

export default function EmailGame() {
  const [gameStarted, setGameStarted] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [gameTime, setGameTime] = useState(0);
  const [allEmailsReceived, setAllEmailsReceived] = useState(false);
  const [showFinalChoice, setShowFinalChoice] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [currentFolder, setCurrentFolder] = useState('inbox');

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameResult) return;
    
    const timer = setInterval(() => {
      setGameTime(prev => prev + 100);
    }, 100);

    return () => clearInterval(timer);
  }, [gameStarted, gameResult]);

  // Email delivery system
  useEffect(() => {
    if (!gameStarted) return;

    const timers = [];
    
    GAME_EMAILS.forEach(email => {
      const adjustedTime = email.arriveAt / speedMultiplier;
      const timer = setTimeout(() => {
        setEmails(prev => {
          if (prev.find(e => e.id === email.id)) return prev;
          const newEmail = { ...email, folder: 'inbox', read: false };
          // Show notification
          if (Notification.permission === 'granted') {
            new Notification('New Email Received!', {
              body: `From: ${email.from}\n${email.subject}`,
              icon: '📧'
            });
          }
          return [...prev, newEmail];
        });
      }, adjustedTime);
      
      timers.push(timer);
    });

    // Check if all emails received
    const maxTime = Math.max(...GAME_EMAILS.map(e => e.arriveAt)) / speedMultiplier;
    const finalTimer = setTimeout(() => {
      setAllEmailsReceived(true);
    }, maxTime + 2000);

    timers.push(finalTimer);

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [gameStarted, speedMultiplier]);

  const startGame = () => {
    setGameStarted(true);
    setEmails([]);
    setGameTime(0);
    setSelectedEmail(null);
    setAllEmailsReceived(false);
    setShowFinalChoice(false);
    setGameResult(null);
    setSelectedChoice(null);
    setCurrentFolder('inbox');
    
    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const moveEmail = (emailId, newFolder) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, folder: newFolder } : email
    ));
    
    // If moving current email, stay on it
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(prev => ({ ...prev, folder: newFolder }));
    }
  };

  const selectEmail = (email) => {
    setSelectedEmail(email);
    setEmails(prev => prev.map(e => 
      e.id === email.id ? { ...e, read: true } : e
    ));
  };

  const makeChoice = (choice) => {
    setSelectedChoice(choice);
    setGameResult(choice);
    
    // Simulate deleting emails after showing result
    setTimeout(() => {
      setEmails([]);
      setSelectedEmail(null);
    }, 5000);
  };

  const getFolderEmails = (folderId) => {
    return emails.filter(e => e.folder === folderId);
  };

  const getUnreadCount = (folderId) => {
    return emails.filter(e => e.folder === folderId && !e.read).length;
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Result screen
  if (gameResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{selectedChoice.emoji}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over</h2>
            <div className="text-5xl font-bold text-indigo-600 mb-4">
              {selectedChoice.score}/100
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Your Choice:</h3>
            <p className="text-gray-700 mb-4">{selectedChoice.label}</p>
            
            <h3 className="font-semibold text-gray-800 mb-2">Result:</h3>
            <p className="text-gray-700 leading-relaxed">{selectedChoice.result}</p>
          </div>
          
          <div className="text-sm text-gray-500 mb-6 text-center">
            <p>Time played: {formatTime(gameTime)}</p>
            <p className="mt-1">All emails will be deleted in 5 seconds...</p>
          </div>
          
          <button
            onClick={startGame}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Welcome screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl text-center">
          <Mail className="w-20 h-20 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Corporate Crisis</h1>
          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            You're a manager caught in an ethical dilemma. Over the next {30 / speedMultiplier} seconds, 
            you'll receive 5 emails revealing a corporate crisis. Read them, organize them into folders, 
            and make a critical decision that will affect your career and the company.
          </p>
          
          <div className="bg-indigo-50 rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-3">How to Play:</h3>
            <ul className="space-y-2 text-gray-700">
              <li>📧 Emails will arrive at scheduled intervals</li>
              <li>📁 Click emails to read them and organize into folders</li>
              <li>⏱️ Wait for all 5 emails to arrive</li>
              <li>✉️ Make your final decision when prompted</li>
              <li>🎯 Your choice determines your score and outcome</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center items-center mb-6">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>

          {showSettings && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Game Speed
              </label>
              <div className="flex gap-2 justify-center">
                {[0.5, 1, 2, 4].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSpeedMultiplier(speed)}
                    className={`px-4 py-2 rounded ${
                      speedMultiplier === speed
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-700 border'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Game duration: {Math.round(30 / speedMultiplier)}s
              </p>
            </div>
          )}
          
          <button
            onClick={startGame}
            className="bg-indigo-600 text-white px-10 py-4 rounded-lg text-xl hover:bg-indigo-700 transition flex items-center gap-3 mx-auto"
          >
            <Play className="w-6 h-6" />
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Final choice screen
  if (showFinalChoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Send className="w-8 h-8 text-indigo-600" />
            <h2 className="text-3xl font-bold text-gray-800">Make Your Decision</h2>
          </div>
          <p className="text-gray-600 mb-8 text-lg">
            You've reviewed all the emails. How will you handle this corporate crisis?
          </p>
          <div className="space-y-3">
            {FINAL_CHOICES.map(choice => (
              <button
                key={choice.id}
                onClick={() => makeChoice(choice)}
                className="w-full text-left p-5 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition flex items-center gap-4 group"
              >
                <span className="text-3xl">{choice.emoji}</span>
                <span className="text-lg text-gray-800 group-hover:text-indigo-700">
                  {choice.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white shadow-sm mb-4 p-4 rounded-lg flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">📧 Corporate Crisis</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-mono">{formatTime(gameTime)}</span>
          </div>
          {allEmailsReceived && (
            <button
              onClick={() => setShowFinalChoice(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 animate-pulse"
            >
              <Send className="w-4 h-4" />
              Make Final Decision
            </button>
          )}
          {!allEmailsReceived && (
            <div className="text-sm text-gray-500 bg-blue-50 px-4 py-2 rounded-lg">
              Waiting for emails... ({emails.length}/{GAME_EMAILS.length})
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {/* Folders Sidebar */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">📁 Folders</h2>
          {FOLDERS.map(folder => {
            const Icon = folder.icon;
            const count = getFolderEmails(folder.id).length;
            const unread = getUnreadCount(folder.id);
            return (
              <button
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className={`w-full p-3 rounded mb-2 flex items-center justify-between transition ${
                  currentFolder === folder.id
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 text-${folder.color}-600`} />
                  <span className="text-gray-700 font-medium">{folder.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {count > 0 && (
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {count}
                    </span>
                  )}
                  {unread > 0 && (
                    <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                      {unread}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Email List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-bold text-gray-800 mb-4 text-lg">
            {FOLDERS.find(f => f.id === currentFolder)?.name} ({getFolderEmails(currentFolder).length})
          </h2>
          <div className="space-y-2">
            {getFolderEmails(currentFolder).length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No emails in this folder</p>
              </div>
            ) : (
              getFolderEmails(currentFolder).map(email => (
                <div
                  key={email.id}
                  onClick={() => selectEmail(email)}
                  className={`p-3 border-2 rounded cursor-pointer transition ${
                    email.read 
                      ? 'bg-white border-gray-200' 
                      : 'bg-blue-50 border-blue-300 font-semibold'
                  } ${
                    selectedEmail?.id === email.id 
                      ? 'ring-2 ring-indigo-500 border-indigo-500' 
                      : 'hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm text-gray-800 mb-1">{email.from}</div>
                  <div className="text-sm text-gray-600 truncate">{email.subject}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Content */}
        <div className="col-span-2 bg-white rounded-lg shadow p-6">
          {selectedEmail ? (
            <>
              <div className="border-b pb-4 mb-4">
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {selectedEmail.subject}
                </h3>
                <div className="text-sm text-gray-600 mb-4">
                  <strong>From:</strong> {selectedEmail.from}
                </div>
                <p className="text-gray-700 leading-relaxed text-lg">
                  {selectedEmail.body}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Move to folder:</h4>
                <div className="flex flex-wrap gap-2">
                  {FOLDERS.map(folder => {
                    const Icon = folder.icon;
                    return (
                      <button
                        key={folder.id}
                        onClick={() => moveEmail(selectedEmail.id, folder.id)}
                        className={`px-4 py-2 rounded text-sm flex items-center gap-2 transition ${
                          selectedEmail.folder === folder.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {folder.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-20">
              <Mail className="w-20 h-20 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select an email to read</p>
              {!allEmailsReceived && (
                <p className="text-sm mt-2">
                  📬 Emails are still arriving... ({emails.length}/{GAME_EMAILS.length})
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}