import React from 'react';
import { Keyframe, PlaybackMode } from '../types';

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
  playbackMode: PlaybackMode;
  setPlaybackMode: (mode: PlaybackMode) => void;
  defaultDuration: number;
  onDefaultDurationChange: (val: number) => void;
  onApplyDefaultToAll: () => void;
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
  onToggleExpand,
  playbackMode,
  setPlaybackMode,
  defaultDuration,
  onDefaultDurationChange,
  onApplyDefaultToAll
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
          
          <button
            onClick={() => setPlaybackMode(playbackMode === 'LOOP' ? 'PING_PONG' : 'LOOP')}
            className={`p-2 rounded transition-colors ${playbackMode === 'PING_PONG' ? 'text-yellow-500 bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title={playbackMode === 'LOOP' ? "Mode: Loop" : "Mode: Ping Pong"}
          >
             <span className="material-icons-round text-xl">
                 {playbackMode === 'LOOP' ? 'repeat' : 'compare_arrows'}
             </span>
          </button>

          <div className="h-6 w-px bg-gray-700 mx-2"></div>

          <div className="flex items-center space-x-2 bg-gray-800 p-1 rounded border border-gray-700">
               <span className="text-[10px] text-gray-400 uppercase font-bold pl-1">Default:</span>
               <input 
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={defaultDuration}
                  onChange={(e) => onDefaultDurationChange(Number(e.target.value))}
                  className="w-16 bg-gray-900 text-xs text-blue-300 border border-gray-600 rounded px-1 py-0.5 text-center focus:outline-none focus:border-blue-500"
               />
               <span className="text-[10px] text-gray-500">ms</span>
               <button
                  onClick={onApplyDefaultToAll}
                  className="px-2 py-0.5 ml-1 bg-gray-700 hover:bg-blue-600 text-[10px] text-gray-200 rounded transition-colors uppercase font-bold border border-gray-600"
                  title="Force Apply to ALL frames (Overwrites custom changes)"
               >
                   ALL
               </button>
          </div>

          <span className="text-xs text-gray-500 font-mono ml-2">
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
        <div className="flex-1 overflow-x-auto p-4 flex space-x-4 items-stretch animate-in fade-in duration-300">
          {keyframes.map((frame, index) => (
            <div 
              key={frame.id}
              onClick={() => onSelectFrame(frame.id)}
              className={`
                relative flex flex-col items-center min-w-[140px] p-3 rounded-lg border-2 cursor-pointer transition-all
                ${currentFrameId === frame.id ? 'border-yellow-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:bg-gray-750'}
              `}
            >
              <div className="flex justify-between w-full mb-2 items-center">
                 <span className="text-xs font-bold text-gray-400">Frame {index + 1}</span>
                 {keyframes.length > 1 && (
                     <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFrame(frame.id);
                      }}
                      className="w-5 h-5 hover:bg-red-900/50 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete Frame"
                     >
                       <span className="material-icons-round text-[14px]">close</span>
                     </button>
                 )}
              </div>
              
              {/* Thumbnail Placeholder */}
              <div className="w-full h-12 bg-gray-900 rounded flex items-center justify-center mb-3 overflow-hidden opacity-50">
                 <span className="material-icons-round text-gray-700 text-3xl">accessibility_new</span>
              </div>

              {/* Duration Slider */}
              <div className="w-full mt-auto">
                 <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span className="flex items-center"><span className="material-icons-round text-[10px] mr-1">timer</span> Duration</span>
                    <span className="font-mono text-blue-300">{frame.duration}ms</span>
                 </div>
                 <input 
                    type="range"
                    min="50"
                    max="2000"
                    step="50"
                    value={frame.duration}
                    onChange={(e) => onDurationChange(frame.id, Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                 />
              </div>
            </div>
          ))}

           <button
            onClick={onAddFrame}
            className="flex-shrink-0 flex flex-col items-center justify-center w-[140px] rounded-lg border-2 border-dashed border-gray-600 text-gray-500 hover:text-blue-400 hover:border-blue-500 hover:bg-gray-800/50 transition-all group"
            title="Add New Frame"
          >
             <span className="material-icons-round text-4xl mb-2 group-hover:scale-110 transition-transform">add</span>
             <span className="text-xs font-bold uppercase tracking-wide">Add Frame</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Timeline;