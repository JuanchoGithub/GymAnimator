
import React from 'react';
import { ViewType, LayoutMode } from '../types';

interface HeaderProps {
  isMirrorMode: boolean;
  setIsMirrorMode: (val: boolean) => void;
  onExport: () => void;
  exportMode: 'accurate' | 'interpolated';
  setExportMode: (mode: 'accurate' | 'interpolated') => void;
  activeView: ViewType;
  setActiveView: (mode: ViewType) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  isMirrorMode, 
  setIsMirrorMode, 
  onExport,
  activeView,
  setActiveView,
  layoutMode,
  setLayoutMode
}) => {
  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between flex-shrink-0">
      <div className="flex items-center space-x-2">
          <span className="material-icons-round text-yellow-500">fitness_center</span>
          <h1 className="text-lg font-bold tracking-wide hidden sm:block">GymAnimator</h1>
      </div>
      
      <div className="flex items-center space-x-4">
          {/* Layout Toggle */}
          <div className="flex bg-gray-900 rounded border border-gray-700 p-1 space-x-1">
             <button 
                onClick={() => setLayoutMode('SINGLE')} 
                title="Single View" 
                className={`w-9 h-8 rounded flex items-center justify-center transition-colors ${layoutMode === 'SINGLE' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-xl">crop_square</span>
             </button>
             <button 
                onClick={() => setLayoutMode('SIDE_BY_SIDE')} 
                title="Side by Side" 
                className={`w-9 h-8 rounded flex items-center justify-center transition-colors ${layoutMode === 'SIDE_BY_SIDE' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-xl">vertical_split</span>
             </button>
             <button 
                onClick={() => setLayoutMode('TOP_BOTTOM')} 
                title="Top Bottom" 
                className={`w-9 h-8 rounded flex items-center justify-center transition-colors ${layoutMode === 'TOP_BOTTOM' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-xl">view_stream</span>
             </button>
             <button 
                onClick={() => setLayoutMode('THREE_SPLIT')} 
                title="3-View Split" 
                className={`w-9 h-8 rounded flex items-center justify-center transition-colors ${layoutMode === 'THREE_SPLIT' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
             >
                 <span className="material-icons-round text-xl">dashboard</span>
             </button>
          </div>

          {/* View Toggle (Visible/Highlight based on active view) */}
          <div className="flex bg-gray-900 rounded border border-gray-700 p-1 space-x-1">
              {['FRONT', 'SIDE', 'TOP'].map((view) => (
                  <button 
                    key={view}
                    onClick={() => setActiveView(view as ViewType)} 
                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${activeView === view ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    {view}
                  </button>
              ))}
          </div>

           <label className="flex items-center space-x-2 text-sm cursor-pointer select-none bg-gray-900 px-3 py-1.5 rounded border border-gray-700 hover:border-gray-600 transition-colors">
              <input 
                  type="checkbox" 
                  checked={isMirrorMode} 
                  onChange={(e) => setIsMirrorMode(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-0 bg-gray-700 border-gray-600"
              />
              <span className={isMirrorMode ? "text-yellow-400 font-semibold" : "text-gray-400"}>Mirror</span>
          </label>

          <button 
              onClick={onExport}
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-4 py-1.5 rounded font-semibold text-sm flex items-center transition-colors shadow-lg shadow-yellow-500/20"
          >
              <span className="material-icons-round text-sm mr-2">download</span> Export
          </button>
      </div>
    </header>
  );
};
