
import React, { useState } from 'react';
import { ListMusic, Trash2 } from 'lucide-react';
import { Pattern } from '../types';

interface TimelineProps {
  arrangement: string[];
  patterns: Pattern[];
  currentArrIdx: number;
  isSongMode: boolean;
  onCurrentArrIdxChange: (idx: number) => void;
  onRemovePatternFromTimeline: (index: number) => void;
  onReorderArrangement: (startIndex: number, endIndex: number) => void;
  onInsertPatternInTimeline: (patternId: string, index: number) => void;
  onAddPatternToTimeline: (patternId: string) => void;
}

const Timeline: React.FC<TimelineProps> = (props) => {
  // dragOverIndex is de *visuele* index waar het item terecht zal komen
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggingSourceIndex, setDraggingSourceIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('application/vgm-timeline-index', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSourceIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Bepaal of we een patroon aan het slepen zijn (Copy) of aan het herordenen (Move)
    const isInternalMove = e.dataTransfer.types.includes('application/vgm-timeline-index');
    e.dataTransfer.dropEffect = isInternalMove ? 'move' : 'copy';
    
    // Bereken of we boven of onder de helft van het item zitten
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const isBottomHalf = offsetY > rect.height / 2;

    // Als we over de onderste helft slepen, willen we invoegen NA dit item (index + 1)
    // Als we over de bovenste helft slepen, willen we invoegen VOOR dit item (index)
    const targetIndex = isBottomHalf ? index + 1 : index;

    setDragOverIndex(targetIndex);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
     e.preventDefault();
     
     // Determine copy/move effect
     const isInternalMove = e.dataTransfer.types.includes('application/vgm-timeline-index');
     e.dataTransfer.dropEffect = isInternalMove ? 'move' : 'copy';

     // Alleen als we écht over de container background slepen (niet over een item)
     if (e.target === e.currentTarget) {
         const container = e.currentTarget as HTMLElement;
         // Filter actual item elements (they are the ones with draggable=true)
         const itemElements = Array.from(container.children).filter(
             (child) => child.getAttribute('draggable') === 'true'
         );

         const mouseY = e.clientY;
         
         // Default to end if no items or below all
         let newIndex = props.arrangement.length;
         
         // Find insertion point based on Y position
         // We zoeken het eerste item waarvan het midden ONDER de muis zit -> invoegen VOOR dat item
         // Of simpeler: loop door items, als muis < center, dan is dat de index.
         for (let i = 0; i < itemElements.length; i++) {
             const rect = itemElements[i].getBoundingClientRect();
             const centerY = rect.top + rect.height / 2;
             if (mouseY < centerY) {
                 newIndex = i;
                 break;
             }
         }
         
         setDragOverIndex(newIndex);
     }
  };

  const handleDrop = (e: React.DragEvent, explicitIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Gebruik de berekende dragOverIndex als er geen expliciete index is meegegeven
    const dropIndex = explicitIndex !== undefined ? explicitIndex : (dragOverIndex ?? props.arrangement.length);

    setDragOverIndex(null);
    setDraggingSourceIndex(null);

    const timelineIndexStr = e.dataTransfer.getData('application/vgm-timeline-index');
    const patternId = e.dataTransfer.getData('application/vgm-pattern');

    // Scenario 1: Reordering binnen tijdlijn
    if (timelineIndexStr !== "") {
      const startIndex = parseInt(timelineIndexStr);
      props.onReorderArrangement(startIndex, dropIndex);
    } 
    // Scenario 2: Nieuw patroon invoegen vanuit lijst
    else if (patternId !== "") {
      // Als dropIndex > length, insert aan eind
      if (dropIndex >= props.arrangement.length) {
          props.onAddPatternToTimeline(patternId);
      } else {
          props.onInsertPatternInTimeline(patternId, dropIndex);
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
     // Check of we echt de container verlaten en niet naar een child gaan
     if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragOverIndex(null);
     }
  };

  const DropPlaceholder = () => (
      <div className="h-8 mb-1 rounded border-2 border-dashed border-[#9bbc0f] bg-[#9bbc0f]/20 flex items-center justify-center animate-pulse pointer-events-none">
         <span className="text-[#9bbc0f] text-[10px] font-black uppercase tracking-widest">Hier Invoegen</span>
      </div>
  );

  return (
    <div className={`flex flex-col h-full ${props.isSongMode ? 'bg-[#161616]' : ''}`}>
      <div className={`p-3 px-4 flex justify-between items-center select-none shrink-0 border-l-4 ${props.isSongMode ? 'border-l-blue-500 bg-[#1a1a1a]' : 'border-l-transparent'}`}>
        <h3 className={`text-[11px] font-bold uppercase flex items-center gap-2 ${props.isSongMode ? 'text-blue-500' : 'text-gray-400'}`}><ListMusic size={14} /> Tijdlijn</h3>
      </div>
      
      <div 
        className="px-2 pb-2 overflow-y-auto bg-[#0a0a0a] inner-shadow flex-1 relative"
        onDragOver={handleContainerDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e)}
      >
        {props.arrangement.length === 0 && dragOverIndex === null && (
             <div className="text-[10px] text-gray-600 font-medium text-center py-6 border-2 border-dashed border-[#222] rounded m-2 pointer-events-none">
                Sleep patronen hierheen
             </div>
        )}

        {props.arrangement.map((pId, i) => {
          // Ghost Block Rendering Logic:
          // We renderen een placeholder VOOR item 'i' als dragOverIndex === i.
          const showPlaceholderBefore = dragOverIndex === i;
          
          return (
            <React.Fragment key={`${pId}-${i}-wrapper`}>
              {showPlaceholderBefore && <DropPlaceholder />}

              <div 
                  draggable="true" 
                  onDragStart={(e) => handleDragStart(e, i)} 
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e)} // Drop handelt af obv dragOverIndex
                  onClick={() => props.onCurrentArrIdxChange(i)} 
                  className={`
                      flex items-center gap-3 p-2 rounded-md mb-1 text-xs font-medium cursor-grab active:cursor-grabbing border-l-4 transition-all relative group
                      ${props.currentArrIdx === i && props.isSongMode ? 'bg-[#1e1e1e] border-l-blue-500 text-white' : 'bg-[#141414] border-l-[#333] text-gray-500 hover:bg-[#1e1e1e] hover:text-gray-300'}
                      ${draggingSourceIndex === i ? 'opacity-30' : ''}
                  `}
              >
                  <span className="text-gray-700 font-mono w-4 text-[10px]">{i+1}</span>
                  <span className="truncate flex-1 pointer-events-none">{props.patterns.find(p => p.id === pId)?.name || '??'}</span>
                  <button onClick={(e) => { e.stopPropagation(); props.onRemovePatternFromTimeline(i); }} className="p-1 hover:text-red-400 text-gray-700 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
              </div>
            </React.Fragment>
          );
        })}
        
        {/* Special case: Als we helemaal onderaan slepen (index === length), render placeholder na de laatste */}
        {dragOverIndex === props.arrangement.length && <DropPlaceholder />}
        
        {/* Hitbox voor onderkant lijst */}
        <div className="h-12 w-full transition-colors" />
      </div>
    </div>
  );
};

export default Timeline;
