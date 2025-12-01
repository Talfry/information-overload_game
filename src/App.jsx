import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail, Folder, Trash2, Send, Clock, Play, RotateCcw, Settings,
  Search, Star, StarOff, Archive, MoreHorizontal, Inbox, Tag
} from 'lucide-react';

// Pre-made emails that arrive over time
const GAME_EMAILS = [
  { id: 1, from: "sarah.chen@company.com", subject: "Project Update - Urgent", body: "The quarterly report shows unusual patterns in department spending. I think you should look into this before the board meeting.", arriveAt: 3000 },
  { id: 2, from: "mike.torres@company.com", subject: "Re: Budget Concerns", body: "I've noticed the same thing Sarah mentioned. The numbers don't add up in the marketing department's expenses.", arriveAt: 8000 },
  { id: 3, from: "hr@company.com", subject: "Confidential: Employee Investigation", body: "We've received anonymous reports about policy violations. Please review the attached guidelines and report any knowledge you have.", arriveAt: 15000 },
  { id: 4, from: "alex.kim@company.com", subject: "Let's talk", body: "Can we meet privately? I have information about what's really happening with the budget issues. I'm worried about retaliation.", arriveAt: 22000 },
  { id: 5, from: "ceo@company.com", subject: "Board Meeting Tomorrow", body: "I need your assessment of the situation by end of day. The board is asking tough questions and I need to know where you stand.", arriveAt: 30000 }
];

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: Inbox, iconClass: 'text-blue-600' },
  { id: 'important', name: 'Important', icon: Tag, iconClass: 'text-red-600' },
  { id: 'evidence', name: 'Evidence', icon: Folder, iconClass: 'text-yellow-600' },
  { id: 'personal', name: 'Personal', icon: Folder, iconClass: 'text-green-600' },
  { id: 'trash', name: 'Trash', icon: Trash2, iconClass: 'text-gray-600' }
];

const FINAL_CHOICES = [
  { id: 'report', label: 'Report everything to HR immediately', emoji: '📋', result: 'You reported the issues through official channels. HR launched a full investigation. While this was the ethical choice, it created tension in the office. Some colleagues appreciate your integrity, others see you as a whistleblower. The company implements new oversight policies.', score: 85 },
  { id: 'ceo', label: 'Side with the CEO and downplay concerns', emoji: '🤝', result: 'You chose loyalty to leadership. The issues were swept under the rug temporarily, but eventually came to light through external audits. Your credibility was damaged, though your relationship with the CEO remained intact in the short term.', score: 45 },
  { id: 'investigate', label: 'Investigate privately before deciding', emoji: '🔍', result: 'You took a measured approach, gathering more information before acting. This revealed the full scope of the issue - a well-intentioned but poorly documented expense system. You helped implement better procedures, earning respect from all parties.', score: 95 },
  { id: 'collaborate', label: 'Organize a meeting with all involved parties', emoji: '👥', result: 'You brought everyone together for transparent discussion. This collaborative approach helped clear up misunderstandings and led to systemic improvements. The team appreciated your inclusive leadership style.', score: 90 },
  { id: 'resign', label: 'Remove yourself from the situation', emoji: '🚪', result: "You decided this ethical dilemma was too much and submitted your resignation. While you maintained your personal integrity, you left colleagues to handle the situation without your input. Sometimes stepping away is self-care, sometimes it's avoidance.", score: 60 }
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
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}h`;
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
  const [allEmailsReceived, setAllEmailsReceived] = useState(false);
  const [showFinalChoice, setShowFinalChoice] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [search, setSearch] = useState('');

  // Game timer
  useEffect(() => {
    if (!gameStarted || gameResult) return;
    const timer = setInterval(() => setGameTime(prev => prev + 100), 100);
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
          const newEmail = {
            ...email,
            folder: 'inbox',
            read: false,
            starred: false,
            receivedAt: Date.now()
          };
          if (typeof Notification !== 'undefined' && Notification?.permission === 'granted') {
            new Notification('New Email', { body: `From: ${email.from}\n${email.subject}` });
          }
          return [...prev, newEmail];
        });
      }, adjustedTime);
      timers.push(timer);
    });

    const maxTime = Math.max(...GAME_EMAILS.map(e => e.arriveAt)) / speedMultiplier;
    const finalTimer = setTimeout(() => setAllEmailsReceived(true), maxTime + 2000);
    timers.push(finalTimer);

    return () => timers.forEach(t => clearTimeout(t));
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
    setSearch('');
    if (typeof Notification !== 'undefined' && Notification?.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Move and keep selected state in sync
  const moveEmail = (emailId, newFolder) => {
    setEmails(prev => {
      let nextSelected = selectedEmail;
      const next = prev.map(email => {
        if (email.id !== emailId) return email;
        const updated = email.folder === newFolder ? email : { ...email, folder: newFolder };
        if (selectedEmail?.id === emailId) nextSelected = { ...updated };
        return updated;
      });
      if (selectedEmail?.id === emailId) setSelectedEmail(nextSelected);
      return next;
    });
  };

  const selectEmail = (email) => {
    setSelectedEmail(email);
    setEmails(prev => prev.map(e => (e.id === email.id ? { ...e, read: true } : e)));
  };

  const toggleStar = (emailId) => {
    setEmails(prev => prev.map(e => (e.id === emailId ? { ...e, starred: !e.starred } : e)));
    if (selectedEmail?.id === emailId) setSelectedEmail(prev => ({ ...prev, starred: !prev.starred }));
  };

  const toggleRead = (emailId) => {
    setEmails(prev => prev.map(e => (e.id === emailId ? { ...e, read: !e.read } : e)));
    if (selectedEmail?.id === emailId) setSelectedEmail(prev => ({ ...prev, read: !prev.read }));
  };

  const deleteEmail = (emailId) => {
    moveEmail(emailId, 'trash');
    if (selectedEmail?.id === emailId) setSelectedEmail(prev => ({ ...prev, folder: 'trash' }));
  };

  const makeChoice = (choice) => {
    setSelectedChoice(choice);
    setGameResult(choice);
    setTimeout(() => {
      setEmails([]);
      setSelectedEmail(null);
    }, 5000);
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

  // Result screen
  if (gameResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{selectedChoice.emoji}</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Game Over</h2>
            <div className="text-5xl font-bold text-indigo-600 mb-4">{selectedChoice.score}/100</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Your Choice:</h3>
            <p className="text-gray-700 mb-4">{selectedChoice.label}</p>
            <h3 className="font-semibold text-gray-800 mb-2">Result:</h3>
            <p className="text-gray-700 leading-relaxed">{selectedChoice.result}</p>
          </div>
          <div className="text-sm text-gray-500 mb-6 text-center">
            <p>Time played: {formatTimeClock(gameTime)}</p>
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
            You're a manager caught in an ethical dilemma. Over the next {Math.round(30 / speedMultiplier)} seconds,
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
            <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>

          {showSettings && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Game Speed</label>
              <div className="flex gap-2 justify-center">
                {[0.5, 1, 2, 4].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSpeedMultiplier(speed)}
                    className={classNames('px-4 py-2 rounded border', speedMultiplier === speed ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50')}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Game duration: {Math.round(30 / speedMultiplier)}s</p>
            </div>
          )}

          <button onClick={startGame} className="bg-indigo-600 text-white px-10 py-4 rounded-lg text-xl hover:bg-indigo-700 transition flex items-center gap-3 mx-auto">
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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-800">Make Your Decision</h2>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="font-mono text-gray-700">{formatTimeClock(gameTime)}</span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6">
          <p className="text-gray-600 mb-6 text-lg">
            You've reviewed all the emails. How will you handle this corporate crisis?
          </p>
          <div className="space-y-3">
            {FINAL_CHOICES.map(choice => (
              <button
                key={choice.id}
                onClick={() => makeChoice(choice)}
                className="w-full text-left p-5 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition flex items-center gap-4 group"
              >
                <span className="text-2xl">{choice.emoji}</span>
                <span className="text-gray-800 group-hover:text-indigo-700 font-medium">{choice.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main inbox interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / App Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-gray-800">Corporate Crisis</span>
          </div>
          <div className="flex-1 relative max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search mail"
              className="w-full bg-gray-100 border border-transparent focus:border-indigo-300 focus:bg-white rounded-full pl-9 pr-4 py-2 text-sm outline-none transition"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm">{formatTimeClock(gameTime)}</span>
            </div>
            {allEmailsReceived ? (
              <button onClick={() => setShowFinalChoice(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2">
                <Send className="w-4 h-4" />
                Final Decision
              </button>
            ) : (
              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-md">
                Waiting for emails... ({emails.length}/{GAME_EMAILS.length})
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-3 xl:col-span-2 bg-white border rounded-lg overflow-hidden">
          <div className="p-3 border-b">
            <button onClick={() => setCurrentFolder('inbox')} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center justify-center gap-2">
              <Inbox className="w-4 h-4" />
              Inbox
            </button>
          </div>
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
                  className={classNames('w-full px-3 py-2 rounded-md flex items-center justify-between text-sm transition', active ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50')}
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

        {/* Message list */}
        <section className="col-span-5 xl:col-span-5 bg-white border rounded-lg flex flex-col">
          {/* Toolbar */}
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                disabled={!selectedEmail}
                onClick={() => selectedEmail && toggleRead(selectedEmail.id)}
                className={classNames('px-2.5 py-1.5 rounded-md text-sm border', selectedEmail ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                title="Mark read/unread"
              >
                {selectedEmail?.read ? 'Mark as Unread' : 'Mark as Read'}
              </button>

              {/* Optional select to move (no auto folder switch) */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Move to</label>
                <select
                  disabled={!selectedEmail}
                  value={selectedEmail?.folder || 'inbox'}
                  onChange={(e) => selectedEmail && moveEmail(selectedEmail.id, e.target.value)}
                  className={classNames('text-sm border rounded-md px-2 py-1', selectedEmail ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                >
                  {FOLDERS.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <button
                disabled={!selectedEmail}
                onClick={() => selectedEmail && deleteEmail(selectedEmail.id)}
                className={classNames('px-2.5 py-1.5 rounded-md text-sm border flex items-center gap-1', selectedEmail ? 'bg-white hover:bg-gray-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {filteredEmails.length} conversation{filteredEmails.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-auto">
            {filteredEmails.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <Mail className="w-12 h-12 mb-2" />
                <p className="text-sm">No emails to display</p>
              </div>
            ) : (
              <ul className="divide-y">
                {filteredEmails.map(email => (
                  <li
                    key={email.id}
                    onClick={() => selectEmail(email)}
                    className={classNames('px-4 py-3 cursor-pointer hover:bg-indigo-50/50 transition', selectedEmail?.id === email.id ? 'bg-indigo-50' : 'bg-white')}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(email.id); }}
                        className="text-yellow-500"
                        title={email.starred ? 'Unstar' : 'Star'}
                      >
                        {email.starred ? <Star className="w-4 h-4 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0 flex items-center">
                        <span className={classNames('w-48 truncate', email.read ? 'text-gray-700' : 'text-gray-900 font-semibold')}>
                          {email.from}
                        </span>
                        <span className="mx-2 text-gray-300">•</span>
                        <div className="flex-1 min-w-0">
                          <span className={classNames('truncate', email.read ? 'text-gray-600' : 'text-gray-900 font-semibold')}>
                            {email.subject}
                          </span>
                          <span className="text-gray-400"> — {getSnippet(email.body)}</span>
                        </div>
                      </div>
                      <div className="ml-2 text-xs text-gray-500">{formatRelativeTime(email.receivedAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Preview pane */}
        <section className="col-span-4 xl:col-span-5 bg-white border rounded-lg flex flex-col">
          {!selectedEmail ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Mail className="w-16 h-16 mb-3" />
              <p className="text-sm">Select an email to read</p>
              {!allEmailsReceived && (
                <p className="text-xs mt-1 text-gray-500">
                  📬 Emails are arriving... ({emails.length}/{GAME_EMAILS.length})
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Preview toolbar */}
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <button onClick={() => toggleRead(selectedEmail.id)} className="px-2.5 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50">
                  {selectedEmail.read ? 'Mark as Unread' : 'Mark as Read'}
                </button>
                <button onClick={() => toggleStar(selectedEmail.id)} className="px-2.5 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50 flex items-center gap-1">
                  {selectedEmail.starred ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" /> : <StarOff className="w-4 h-4" />}
                  {selectedEmail.starred ? 'Starred' : 'Star'}
                </button>
                <button
                  onClick={() => deleteEmail(selectedEmail.id)}
                  className="px-2.5 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50 text-red-600 border-red-200 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <button className="px-2.5 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50">
                    <Archive className="w-4 h-4 inline-block mr-1" />
                    Archive
                  </button>
                  <button className="px-2.5 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50">
                    <MoreHorizontal className="w-4 h-4 inline-block mr-1" />
                    More
                  </button>
                </div>
              </div>

              {/* Message headers */}
              <div className="px-6 pt-4 pb-2 border-b">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedEmail.subject}</h3>
                <div className="text-sm text-gray-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">From:</span>
                    <span>{selectedEmail.from}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-gray-500">{formatRelativeTime(selectedEmail.receivedAt)}</span>
                  </div>
                  <div className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {FOLDERS.find(f => f.id === selectedEmail.folder)?.name}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 text-gray-800 leading-relaxed whitespace-pre-line">
                {selectedEmail.body}
              </div>

              {/* Move controls: exactly two buttons; stay in current folder */}
              <div className="px-6 pb-6">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Move to</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => moveEmail(selectedEmail.id, 'important')}
                    className="px-3 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50 text-red-700 border-red-200 flex items-center gap-2"
                  >
                    <Tag className="w-4 h-4" />
                    Mark Important
                  </button>
                  <button
                    onClick={() => deleteEmail(selectedEmail.id)}
                    className="px-3 py-1.5 rounded-md text-sm border bg-white hover:bg-gray-50 text-red-600 border-red-200 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
                {/* Optional UX: if the email leaves the current folder, you may want to clear selection so the preview doesn't show an email not in the list:
                    if (selectedEmail.folder !== currentFolder) setSelectedEmail(null);
                   But per your request, we simply stay in the current folder. */}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}