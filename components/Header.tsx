import React from 'react';

interface HeaderProps {
  isMirrorMode: boolean;
  setIsMirrorMode: (val: boolean) => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isMirrorMode, setIsMirrorMode, onExport }) => {
  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 justify-between flex-shrink-0">
      <div className="flex items-center space-x-2">
          <span className="material-icons-round text-yellow-500">fitness_center</span>
          <h1 className="text-lg font-bold tracking-wide">GymAnimator</h1>
      </div>
      
      <div className="flex items-center space-x-4">
          {/* Mirror Toggle */}
           <label className="flex items-center space-x-2 text-sm cursor-pointer select-none bg-gray-900 px-3 py-1.5 rounded border border-gray-700 hover:border-gray-600 transition-colors">
              <input 
                  type="checkbox" 
                  checked={isMirrorMode} 
                  onChange={(e) => setIsMirrorMode(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-500 focus:ring-0 bg-gray-700 border-gray-600"
              />
              <span className={isMirrorMode ? "text-yellow-400 font-semibold" : "text-gray-400"}>Mirror Mode</span>
          </label>

          <button 
              onClick={onExport}
              className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-4 py-1.5 rounded font-semibold text-sm flex items-center transition-colors"
          >
              <span className="material-icons-round text-sm mr-2">download</span> Export SVG
          </button>
      </div>
    </header>
  );
};