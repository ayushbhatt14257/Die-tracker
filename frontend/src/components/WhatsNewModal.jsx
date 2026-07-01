import { useState, useEffect } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';

const VERSION = 'v2.0';
const STORAGE_KEY = `dt_whats_new_dismissed_${VERSION}`;

const FEATURES = [
  {
    icon: '📊',
    title: 'Dashboard Card Filters',
    desc: 'Click Active Dies, On Track, Delayed, or Overdue cards to instantly filter the die list below.',
  },
  {
    icon: '📅',
    title: 'Month Filter on Dashboard',
    desc: 'Default view shows current month data. Navigate months with arrows or clear to see all-time data.',
  },
  {
    icon: '📄',
    title: 'Pagination',
    desc: 'Dashboard now shows 5 dies per page for faster loading and easier navigation.',
  },
  {
    icon: '🏭',
    title: 'GR1 Receiver Role',
    desc: 'New production flow: Tool Room → Dispatch to GR1 → GR1 Receiver confirms → Flow complete.',
  },
  {
    icon: '🎄',
    title: 'Holiday Timer Pause',
    desc: 'Admin can add holidays. The 36-hour production timer automatically pauses for the entire holiday.',
  },
  {
    icon: '⏱️',
    title: 'VMC Timer Hidden',
    desc: 'VMC operators no longer see the countdown timer — just the machining status.',
  },
  {
    icon: '📝',
    title: 'Model Name Validation',
    desc: 'Model names now auto-convert to UPPERCASE_WITH_UNDERSCORES format (e.g. 22_NOTHING_PHONE_4A).',
  },
  {
    icon: '📋',
    title: 'My History Tab',
    desc: 'Every operator can see dies they completed their stage on, with in/out times per department.',
  },
  {
    icon: '🗓️',
    title: 'Completed Dies History Page',
    desc: 'All dies received at GR1 appear in History with creation date, completion date, and total hours.',
  },
  {
    icon: '✏️',
    title: 'Edit & Delete Die',
    desc: 'Owner, Admin, and Designer can edit or delete a die before the Design stage is marked complete.',
  },
];

const WhatsNewModal = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      // Show after 1.5s delay
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    // Just close for this session — will show again next visit
    setVisible(false);
  };

  const handleDontShow = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl px-5 py-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <div>
              <p className="text-white font-bold text-base">What's New in {VERSION}</p>
              <p className="text-blue-200 text-xs mt-0.5">Die Tracker has been updated with 10 new features</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-blue-200 hover:text-white transition-colors ml-2 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Features list */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-xl flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={handleDontShow}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            Don't show again
          </button>
          <button
            onClick={handleClose}
            className="btn btn-primary text-sm flex items-center gap-1.5"
          >
            Got it! <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
