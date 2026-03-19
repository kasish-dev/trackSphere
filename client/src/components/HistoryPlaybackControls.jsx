import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHistoryRange } from '../redux/locationSlice';
import { Play, Pause, Calendar, Clock, ChevronLeft, ChevronRight, X, Zap } from 'lucide-react';
import UpgradeModal from './UpgradeModal';

const HistoryPlaybackControls = ({ userId, userName, onClose, onPlaybackUpdate }) => {
  const dispatch = useDispatch();
  
  // Settings
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { user } = useSelector((state) => state.auth);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x
  
  // Fetch data when date changes
  useEffect(() => {
    if (!userId) return;
    
    const fetchDate = async () => {
      setIsLoading(true);
      setError('');
      try {
        const start = new Date(dateStr);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(dateStr);
        end.setHours(23, 59, 59, 999);
        
        const result = await dispatch(fetchHistoryRange({ 
          userId, 
          startTime: start.toISOString(), 
          endTime: end.toISOString() 
        })).unwrap();
        
        setHistoryData(result);
        setCurrentIndex(0);
        setIsPlaying(false);
      } catch (err) {
        setError('Failed to load history');
        setHistoryData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDate();
  }, [dateStr, userId, dispatch]);

  // Handle Playback Interval
  useEffect(() => {
    let interval;
    if (isPlaying && historyData.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= historyData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const nextIndex = prev + 1;
          return nextIndex;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, historyData, playbackSpeed]);

  // Synchronize state with parent via Effect to avoid "update while rendering" warnings
  useEffect(() => {
    onPlaybackUpdate({ 
      data: historyData, 
      currentIndex, 
      isPlaying 
    });
  }, [historyData, currentIndex, isPlaying, onPlaybackUpdate]);

  // Adjust date
  const handleDateChange = (newDateStr) => {
    const minAllowedDate = new Date();
    const limitDays = user?.user?.subscriptionTier === 'PREMIUM' ? 30 : 1;
    minAllowedDate.setDate(minAllowedDate.getDate() - limitDays);
    minAllowedDate.setHours(0, 0, 0, 0);

    const selectedDate = new Date(newDateStr);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < minAllowedDate) {
      if (user?.user?.subscriptionTier === 'FREE') {
        setShowUpgradeModal(true);
      }
      return;
    }
    setDateStr(newDateStr);
  };

  const adjustDate = (days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const handleSliderChange = (e) => {
    setCurrentIndex(parseInt(e.target.value));
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-4">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock size={18} className="text-primary-600" />
          Route History: {userName}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-xl p-2 mb-4 border border-gray-200 dark:border-gray-700">
        <button onClick={() => adjustDate(-1)} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">
          <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-primary-600" />
          <input 
            type="date" 
            value={dateStr}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
          />
        </div>
        <button 
          onClick={() => adjustDate(1)} 
          disabled={dateStr === new Date().toISOString().split('T')[0]}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-30"
        >
          <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* State Indicators */}
      {isLoading ? (
        <div className="flex flex-col items-center py-4 text-gray-500">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mb-2"></div>
          <p className="text-xs font-medium">Loading route data...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg">
          {error}
        </div>
      ) : historyData.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 italic bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          No location history found for this date.
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Time & Speed Info */}
          <div className="flex justify-between items-end px-1">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Time</p>
              <p className="text-lg font-black text-primary-700 dark:text-primary-400 font-mono leading-none">
                {formatTime(historyData[currentIndex]?.timestamp)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Speed</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {Math.round(historyData[currentIndex]?.accuracy || 0)} <span className="text-[10px] font-normal text-gray-500">km/h</span> {/* repurposing accuracy for demo */}
              </p>
            </div>
          </div>

          {/* Scrubber */}
          <div className="px-1 relative">
            <input 
              type="range" 
              min="0" 
              max={historyData.length - 1} 
              value={currentIndex}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-1">
              {[1, 2, 5].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                    playbackSpeed === speed 
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => {
                if (currentIndex >= historyData.length - 1) setCurrentIndex(0);
                setIsPlaying(!isPlaying);
              }}
              className={`p-3 rounded-full flex items-center justify-center transition shadow-md ${
                isPlaying 
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' 
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/30'
              }`}
            >
              {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-0.5" />}
            </button>
            
            <div className="w-[84px] text-right">
              <span className="text-[10px] font-bold text-gray-400">
                {currentIndex + 1} / {historyData.length} pts
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Premium Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </div>
  );
};

export default HistoryPlaybackControls;
