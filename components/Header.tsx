
import React, { useState, useRef, useEffect } from 'react';
import { ViewType, LayoutMode } from '../types';

interface HeaderProps {
  isMirrorMode: boolean;
  setIsMirrorMode: (val: boolean) => void;
  onExport: (mode: 'accurate' | 'interpolated' | 'adaptive', action: 'download' | 'clipboard') => void;
  activeView: ViewType;
  setActiveView: (mode: ViewType) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

type ExportMode = 'accurate' | 'interpolated' | 'adaptive';

const EXPORT_MODES: { id: ExportMode; label: string; color: string; icon: string }[] = [
    { id: 'adaptive', label: 'Adaptive', color: 'bg-purple-600 hover:bg-purple-700', icon: 'auto_graph' },
    { id: 'accurate', label: 'Accurate', color: 'bg-blue-600 hover:bg-blue-700', icon: 'show_chart' },
    { id: 'interpolated', label: 'Interpolated', color: 'bg-emerald-600 hover:bg-emerald-700', icon: 'linear_scale' },
];

export const Header: React.FC<HeaderProps> = ({ 
  isMirrorMode, 
  setIsMirrorMode, 
  onExport,
  activeView,
  setActiveView,
  layoutMode,
  setLayoutMode
}) => {
  const [selectedMode, setSelectedMode] = useState<ExportMode>('adaptive');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  
  const activeModeDef = EXPORT_MODES.find(m => m.id === selectedMode)!;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopy = async () => {
      try {
        onExport(selectedMode, 'clipboard');
        showToast(`SVG (${selectedMode}) copied to clipboard!`);
      } catch(e) {
        showToast('Failed to copy.');
      }
  };

  const handleDownload = () => {
      onExport(selectedMode, 'download');
  };

  const handleModeSelect = (mode: ExportMode) => {
      setSelectedMode(mode);
      setIsExportOpen(false);
  };

  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between flex-shrink-0 relative z-40">
      <div className="flex items-center space-x-4 min-w-0">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <span className="material-icons-round text-yellow-500">fitness_center</span>
            <h1 className="text-lg font-bold tracking-wide hidden md:block truncate">GymAnimator</h1>
          </div>
      </div>
      
      <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
          {/* Layout Toggle */}
          <div className="flex bg-gray-900 rounded border border-gray-700 p-1 space-x-1 hidden sm:flex">
             <button 
                onClick={() => setLayoutMode('SINGLE')} 
                title="Single View" 
                className={`w-8 h-7 rounded flex items-center justify-center transition-colors ${layoutMode === 'SINGLE' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-lg">crop_square</span>
             </button>
             <button 
                onClick={() => setLayoutMode('SIDE_BY_SIDE')} 
                title="Side by Side" 
                className={`w-8 h-7 rounded flex items-center justify-center transition-colors ${layoutMode === 'SIDE_BY_SIDE' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-lg">vertical_split</span>
             </button>
             <button 
                onClick={() => setLayoutMode('TOP_BOTTOM')} 
                title="Top Bottom" 
                className={`w-8 h-7 rounded flex items-center justify-center transition-colors ${layoutMode === 'TOP_BOTTOM' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-lg">view_stream</span>
             </button>
             <button 
                onClick={() => setLayoutMode('THREE_SPLIT')} 
                title="3-View Split" 
                className={`w-8 h-7 rounded flex items-center justify-center transition-colors ${layoutMode === 'THREE_SPLIT' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-lg">dashboard</span>
             </button>
          </div>

           <label className="flex items-center space-x-2 text-sm cursor-pointer select-none bg-gray-900 px-2 sm:px-3 py-1.5 rounded border border-gray-700 hover:border-gray-600 transition-colors hidden md:flex">
              <input 
                  type="checkbox" 
                  checked={isMirrorMode} 
                  onChange={(e) => setIsMirrorMode(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-0 bg-gray-700 border-gray-600"
              />
              <span className={isMirrorMode ? "text-yellow-400 font-semibold" : "text-gray-400"}>Mirror</span>
          </label>

          <div className="h-6 w-px bg-gray-700 mx-1 hidden sm:block"></div>

          {/* Export Group */}
          <div className="flex items-center space-x-2" ref={exportDropdownRef}>
              {/* Copy Button */}
              <button
                onClick={handleCopy}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 transition-colors relative group"
                title="Copy to Clipboard"
              >
                 <span className="material-icons-round text-xl">content_copy</span>
              </button>

              {/* Download Split Button */}
              <div className="relative flex items-center rounded shadow-lg">
                  <button 
                      onClick={handleDownload}
                      className={`px-2 sm:px-3 py-2 flex items-center rounded-l text-white font-semibold text-xs sm:text-sm transition-colors border-r border-black/10 ${activeModeDef.color} whitespace-nowrap`}
                  >
                      <span className="material-icons-round text-sm mr-2">{activeModeDef.icon}</span> 
                      <span className="hidden lg:inline">Export {activeModeDef.label}</span>
                      <span className="lg:hidden">Export</span>
                  </button>
                  <button 
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      className="px-1.5 py-2 flex items-center rounded-r bg-yellow-500 hover:bg-yellow-400 text-gray-900 transition-colors"
                      title="Select Export Mode"
                  >
                      <span className="material-icons-round text-sm">arrow_drop_down</span>
                  </button>

                  {isExportOpen && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50">
                          {EXPORT_MODES.map((mode) => (
                              <button
                                  key={mode.id}
                                  onClick={() => handleModeSelect(mode.id)}
                                  className={`w-full text-left px-4 py-2 text-sm flex items-center hover:bg-gray-700 transition-colors ${selectedMode === mode.id ? 'text-yellow-500 bg-gray-700/50' : 'text-gray-300'}`}
                              >
                                  <span className={`material-icons-round text-sm mr-2 ${selectedMode === mode.id ? 'text-yellow-500' : 'text-gray-500'}`}>{mode.icon}</span>
                                  {mode.label}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Notification Toast */}
      {toastMessage && (
          <div className="absolute top-16 right-4 bg-gray-800 text-white px-4 py-2 rounded shadow-lg border border-green-500 flex items-center animate-bounce z-[100]">
              <span className="material-icons-round text-green-400 mr-2">check_circle</span>
              <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
      )}
    </header>
  );
};
