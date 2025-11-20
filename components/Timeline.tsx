import React from 'react';
import { Keyframe } from '../types';

interface TimelineProps {
  keyframes: Keyframe[];
  currentFrameId: string | null;
  onSelectFrame: (id: string) => void;
  onAddFrame: () => void;
  onDeleteFrame: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  keyframes,
  currentFrameId,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onDurationChange,
  isPlaying,
  onPlayPause,
  isExpanded,
  onToggleExpand
}) => {
  return (
    <div className="h-full flex flex-col bg-gray-800 border-t border-gray-700 overflow-hidden">
      <div className="p-2 bg-gray-900 flex items-center justify-between border-b border-gray-700 h-12 flex-shrink-0">
        <div className="flex items-center space-x-2">
           <button
            onClick={onPlayPause}
            className={`p-2 rounded-full text-white transition-colors ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <span className="material-icons-round text-xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          <span className="text-xs text-gray-400 font-mono">
            {keyframes.length} Frames
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddFrame}
            className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            <span className="material-icons-round text-sm mr-1">add</span> Frame
          </button>
          <button
            onClick={onToggleExpand}
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          >
             <span className="material-icons-round">{isExpanded ? 'expand_more' : 'expand_less'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex-1 overflow-x-auto p-4 flex space-x-4 items-center animate-in fade-in duration-300">
          {keyframes.map((frame, index) => (
            <div 
              key={frame.id}
              onClick={() => onSelectFrame(frame.id)}
              className={`
                relative flex flex-col items-center min-w-[100px] p-2 rounded-lg border-2 cursor-pointer transition-all
                ${currentFrameId === frame.id ? 'border-yellow-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-750'}
              `}
            >
              <span className="text-xs font-bold text-gray-400 mb-2">Frame {index + 1}</span>
              
              {/* Thumbnail Placeholder - could be a mini SVG */}
              <div className="w-16 h-16 bg-gray-900 rounded flex items-center justify-center mb-2">
                 <span className="material-icons-round text-gray-600">accessibility_new</span>
              </div>

              <div className="flex items-center space-x-1 w-full">
                  <span className="material-icons-round text-xs text-gray-500">timer</span>
                  <input 
                      type="number"
                      value={frame.duration}
                      onChange={(e) => onDurationChange(frame.id, Number(e.target.value))}
                      className="w-full bg-gray-900 text-xs text-white border border-gray-700 rounded px-1 py-0.5 text-center"
                      onClick={(e) => e.stopPropagation()} // Prevent selecting frame when editing duration
                  />
                  <span className="text-[10px] text-gray-500">ms</span>
              </div>

              {keyframes.length > 1 && (
                 <button 
                  onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFrame(frame.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 shadow-md"
                 >
                   <span className="material-icons-round text-xs">close</span>
                 </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Timeline;