
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, GraduationCap, Play, CheckCircle2, MousePointer2, Keyboard, Settings2, GripHorizontal, Sparkles } from 'lucide-react';
import { Pattern, TrackerRow } from '../types';

interface AcademyOverlayProps {
  onClose: () => void;
  onLoadExample: (data: { ch: number; rows: TrackerRow[] }[]) => void;
  onHighlightCell: (highlight: { id: string; type: 'SELECT' | 'EDIT' } | null) => void;
  onClearSelection: () => void;
  activePattern: Pattern | undefined;
  selectedCells: Set<string>;
  isPlaying: boolean;
  isEditorOpen: boolean;
}

type TaskType = 'READ' | 'SELECT_CELL' | 'INPUT_NOTE' | 'CHANGE_VOLUME' | 'CHANGE_DUTY' | 'SELECT_CH4' | 'INPUT_NOISE' | 'PLAY_SELECTION';

interface LessonStep {
  text: string;
  taskType: TaskType;
  target?: string;
  requiredPitch?: string; 
  actionData?: { ch: number; rows: TrackerRow[] }[];
  clearSelection?: boolean;
}

interface Lesson {
  id: string;
  title: string;
  steps: LessonStep[];
}

const LESSONS: Lesson[] = [
  {
    id: 'basic_rhythm',
    title: 'MODULE 1: RITME & MELODIE',
    steps: [
      { 
        text: "Welkom, Cadet! Muziek bestaat uit Tijd en Toon. We gaan een ritmische melodie bouwen op Kanaal 1. Klik 'VOLGENDE'.",
        taskType: 'READ'
      },
      { 
        text: "OPDRACHT: Selecteer het eerste vakje linksboven: Kanaal 1, Rij 01 (Step 0). Kijk naar het oplichtende vakje.",
        taskType: 'SELECT_CELL',
        target: "1-0"
      },
      { 
        text: "Druk op 'Q' voor een C-5 noot. Dit is de start van onze maat.",
        taskType: 'INPUT_NOTE',
        target: "1-0",
        requiredPitch: "C-5"
      },
      {
        text: "Ritme ontstaat door ruimte. Sla 3 vakjes over en selecteer Rij 05 (Step 4).",
        taskType: 'SELECT_CELL',
        target: "1-4"
      },
      {
        text: "Druk op 'E' voor een E-5 noot. We bouwen een akkoord in de tijd.",
        taskType: 'INPUT_NOTE',
        target: "1-4",
        requiredPitch: "E-5"
      },
      {
        text: "Ga nu naar het midden van de maat: Rij 09 (Step 8).",
        taskType: 'SELECT_CELL',
        target: "1-8"
      },
      {
        text: "Druk op 'T' voor een G-5 noot. Nu hebben we C, E en G.",
        taskType: 'INPUT_NOTE',
        target: "1-8",
        requiredPitch: "G-5"
      },
      {
        text: "Sluit af op de laatste tel. Selecteer Rij 13 (Step 12).",
        taskType: 'SELECT_CELL',
        target: "1-12"
      },
      {
        text: "Druk op 'I' voor een C-6 noot (het octaaf).",
        taskType: 'INPUT_NOTE',
        target: "1-12",
        requiredPitch: "C-6"
      },
      {
        text: "Selecteer nu Rij 01 t/m Rij 17 (sleep met de muis) en druk op SPATIE om je loop te horen!",
        taskType: 'PLAY_SELECTION',
        target: "1-0" 
      }
    ]
  },
  {
    id: 'sound_design',
    title: 'MODULE 2: GELUIDS VORMGEVING',
    steps: [
      { 
        text: "Die piepjes kunnen mooier. Selecteer je eerste noot weer (Rij 01).",
        taskType: 'SELECT_CELL',
        target: "1-0"
      },
      { 
        text: "Dubbelklik op de noot (of druk op '-') om het bewerkingsmenu te openen.",
        taskType: 'CHANGE_VOLUME',
        target: "1-0"
      },
      { 
        text: "In het menu: Verander de 'Duty Cycle' naar 25% of 12.5% voor een andere klankkleur.",
        taskType: 'CHANGE_DUTY',
        target: "1-0"
      },
      {
        text: "Belangrijk: Klik rechtsonder op 'TOEPASSEN OP TRACKER' om je wijzigingen op te slaan en het menu te sluiten.",
        taskType: 'READ' 
      },
      {
        text: "Zie je hoe dit werkt? Je kunt per noot het geluid veranderen. Klik 'VOLGENDE' voor de Bas.",
        taskType: 'READ'
      }
    ]
  },
  {
    id: 'bass_line',
    title: 'MODULE 3: DE BAS (WAVE)',
    steps: [
      {
        text: "Kanaal 3 is de 'Wave' generator. Hier programmeren we de baslijn. Klik 'VOLGENDE'.",
        taskType: 'READ',
        clearSelection: true
      },
      {
        text: "Selecteer Kanaal 3, Rij 01 (Step 0).",
        taskType: 'SELECT_CELL',
        target: "3-0"
      },
      {
        text: "Druk op 'Z' (C-4). Op kanaal 3 klinkt dit als een diepe bastoon.",
        taskType: 'INPUT_NOTE',
        target: "3-0",
        requiredPitch: "C-4"
      },
      {
        text: "Ga naar het midden van de maat: Rij 09 (Step 8).",
        taskType: 'SELECT_CELL',
        target: "3-8"
      },
      {
        text: "Druk op 'V' (F-4) voor variatie in de bas.",
        taskType: 'INPUT_NOTE',
        target: "3-8",
        requiredPitch: "F-4"
      },
      {
        text: "Super! De fundering staat. Klik 'VOLGENDE' voor de Drums.",
        taskType: 'READ'
      }
    ]
  },
  {
    id: 'drums_noise',
    title: 'MODULE 4: DE BEAT (NOISE)',
    steps: [
      { 
        text: "Kanaal 4 (rechts) is RUIS. Perfect voor drums.",
        taskType: 'READ',
        clearSelection: true
      },
      { 
        text: "Selecteer Kanaal 4, Rij 01 (Step 0).",
        taskType: 'SELECT_CH4',
        target: "4-0"
      },
      {
        text: "Druk op 'Z' (C-4). In kanaal 4 is dit een Kick Drum.",
        taskType: 'INPUT_NOISE',
        target: "4-0"
      },
      {
        text: "Ga naar Rij 05 (Step 4). Dit is de 'backbeat'.",
        taskType: 'SELECT_CH4',
        target: "4-4"
      },
      {
        text: "Druk op 'R' (F-5). Hoge noten zijn Snares of Hi-Hats.",
        taskType: 'INPUT_NOISE',
        target: "4-4"
      },
      {
        text: "Gefeliciteerd! Ik laad nu automatisch een demo song in zodat je kunt zien wat mogelijk is...",
        taskType: 'READ',
        actionData: [
            { 
                ch: 1, 
                rows: [
                    // FIX: Added missing id property
                    { id: 'l1-r1', step: 0, pitch: 'C-4', volume: 12, dutyCycle: "0.5", instrument: "LEAD" },
                    { id: 'l1-r2', step: 2, pitch: 'E-4', volume: 12, dutyCycle: "0.5", instrument: "LEAD" },
                    { id: 'l1-r3', step: 4, pitch: 'G-4', volume: 12, dutyCycle: "0.5", instrument: "LEAD" },
                    { id: 'l1-r4', step: 6, pitch: 'B-4', volume: 12, dutyCycle: "0.5", instrument: "LEAD" },
                    { id: 'l1-r5', step: 8, pitch: 'C-5', volume: 12, dutyCycle: "0.25", instrument: "LEAD" },
                    { id: 'l1-r6', step: 10, pitch: 'B-4', volume: 10, dutyCycle: "0.25", instrument: "LEAD" },
                    { id: 'l1-r7', step: 12, pitch: 'G-4', volume: 8, dutyCycle: "0.25", instrument: "LEAD" },
                    { id: 'l1-r8', step: 14, pitch: 'E-4', volume: 6, dutyCycle: "0.25", instrument: "LEAD" }
                ] 
            },
            { 
                ch: 3, 
                rows: [
                    // FIX: Added missing id property
                    { id: 'l3-r1', step: 0, pitch: 'C-2', volume: 15, dutyCycle: "0.5", instrument: "SUB" },
                    { id: 'l3-r2', step: 8, pitch: 'G-1', volume: 15, dutyCycle: "0.5", instrument: "SUB" }
                ] 
            },
            { 
                ch: 4, 
                rows: [
                    // FIX: Added missing id property
                    { id: 'l4-r1', step: 0, pitch: 'C-2', volume: 15, instrument: 'KICK', dutyCycle: "0.5" },
                    { id: 'l4-r2', step: 4, pitch: 'C-5', volume: 8, instrument: 'SNARE', dutyCycle: "0.5" },
                    { id: 'l4-r3', step: 8, pitch: 'C-2', volume: 15, instrument: 'KICK', dutyCycle: "0.5" },
                    { id: 'l4-r4', step: 12, pitch: 'C-5', volume: 8, instrument: 'SNARE', dutyCycle: "0.5" },
                    { id: 'l4-r5', step: 14, pitch: 'C-6', volume: 6, instrument: 'HAT', dutyCycle: "0.5" }
                ] 
            }
        ]
      }
    ]
  }
];

const AcademyOverlay: React.FC<AcademyOverlayProps> = ({ onClose, onLoadExample, onHighlightCell, onClearSelection, activePattern, selectedCells, isPlaying, isEditorOpen }) => {
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const actionTriggeredRef = useRef<string | null>(null);
  const clearTriggeredRef = useRef<string | null>(null);
  
  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  // Initialize position
  useEffect(() => {
    if (!initialized.current) {
        const width = 500;
        const x = window.innerWidth / 2 - (width / 2);
        const y = window.innerHeight - 250; 
        setPosition({ x: Math.max(20, x), y: Math.max(20, y) });
        initialized.current = true;
    }
  }, []);

  const lesson = LESSONS[currentLessonIdx];
  const step = lesson.steps[currentStepIdx];
  const isLastStep = currentStepIdx === lesson.steps.length - 1;
  const isLastLesson = currentLessonIdx === LESSONS.length - 1;

  // Auto-Load Action
  useEffect(() => {
    const stepId = `${currentLessonIdx}-${currentStepIdx}`;
    
    // Auto Load Data
    if (step.actionData && actionTriggeredRef.current !== stepId) {
        onLoadExample(step.actionData);
        actionTriggeredRef.current = stepId;
    }

    // Auto Clear Selection
    if (step.clearSelection && clearTriggeredRef.current !== stepId) {
        onClearSelection();
        clearTriggeredRef.current = stepId;
    }
  }, [step, onLoadExample, onClearSelection, currentLessonIdx, currentStepIdx]);

  // Stuur highlight info naar parent
  useEffect(() => {
    if (step.target) {
        const isEditTask = step.taskType === 'CHANGE_VOLUME' || step.taskType === 'CHANGE_DUTY';
        // Only ask for double click if we need to edit and editor is not open
        const type = (isEditTask && !isEditorOpen) ? 'EDIT' : 'SELECT';
        onHighlightCell({ id: step.target, type });
    } else {
        onHighlightCell(null);
    }
    return () => onHighlightCell(null);
  }, [step, onHighlightCell, isEditorOpen]);

  // Validation Logic
  const checkCondition = useMemo(() => {
      if (!activePattern) return false;
      
      if (step.taskType === 'PLAY_SELECTION') return isPlaying;
      if (step.taskType === 'READ') return true;

      // Parse target (e.g. "1-0" -> ch 1, step 0)
      let targetCh = 1, targetStep = 0;
      if (step.target) {
          const parts = step.target.split('-');
          targetCh = parseInt(parts[0]);
          targetStep = parseInt(parts[1]);
      }

      const row = activePattern.channels[targetCh as 1|2|3|4]?.find(r => r.step === targetStep);

      switch (step.taskType) {
          case 'SELECT_CELL':
              return selectedCells.has(step.target || "");
          case 'SELECT_CH4':
              return Array.from(selectedCells).some((id: string) => id.startsWith('4-'));
          case 'INPUT_NOTE':
              const hasNote = !!row && row.pitch !== '---' && row.pitch !== 'OFF';
              if (step.requiredPitch) {
                  return hasNote && row.pitch === step.requiredPitch;
              }
              return hasNote;
          case 'INPUT_NOISE':
              return !!row && row.pitch !== '---';
          case 'CHANGE_VOLUME':
              if (isEditorOpen) return true;
              return !!row && row.volume !== 15 && row.volume !== 12; 
          case 'CHANGE_DUTY':
              return !!row && row.dutyCycle !== "0.5";
          default:
              return false;
      }
  }, [step, activePattern, selectedCells, isPlaying, isEditorOpen]);

  useEffect(() => {
      // Kleine vertraging bij input note zodat de sound kan spelen
      if (step.taskType === 'INPUT_NOTE' || step.taskType === 'INPUT_NOISE') {
          if (checkCondition) setIsCompleted(true);
          else setIsCompleted(false);
      } else {
          setIsCompleted(checkCondition);
      }
  }, [checkCondition, step.taskType]);

  const nextStep = useCallback(() => {
    if (isLastStep) {
        if (!isLastLesson) {
            setCurrentLessonIdx(prev => prev + 1);
            setCurrentStepIdx(0);
        } else {
            onClose();
        }
    } else {
        setCurrentStepIdx(prev => prev + 1);
    }
  }, [isLastStep, isLastLesson, onClose]);

  const prevStep = useCallback(() => {
    if (currentStepIdx > 0) {
        setCurrentStepIdx(prev => prev - 1);
    } else if (currentLessonIdx > 0) {
        setCurrentLessonIdx(prev => prev - 1);
        setCurrentStepIdx(LESSONS[currentLessonIdx - 1].steps.length - 1);
    }
  }, [currentStepIdx, currentLessonIdx]);

  // Automatisch doorgaan
  useEffect(() => {
    if (isCompleted && step.taskType !== 'READ' && step.taskType !== 'CHANGE_VOLUME') {
        const timer = setTimeout(() => {
            nextStep();
        }, 1500); 
        return () => clearTimeout(timer);
    }
  }, [isCompleted, step.taskType, nextStep]);

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Context-aware instruction for editor steps
  const instructionText = useMemo(() => {
      if (step.taskType === 'CHANGE_VOLUME' && isEditorOpen) {
          return "Menu geopend! Pas nu het volume aan met de slider.";
      }
      return step.text;
  }, [step, isEditorOpen]);

  return (
    <div 
        className="fixed z-[150] shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden flex flex-col w-[500px] border-4 border-[#9bbc0f] bg-[#0f380f]"
        style={{ left: position.x, top: position.y }}
    >
        {/* DRAG HANDLE BAR */}
        <div 
            onMouseDown={handleMouseDown}
            className="h-6 bg-[#8bac0f] border-b-4 border-[#0f380f] flex items-center justify-center cursor-move hover:brightness-110 active:cursor-grabbing"
        >
            <GripHorizontal size={16} className="text-[#0f380f] opacity-50" />
        </div>

        <div className="flex flex-row h-full">
            {/* Linker Kant: Avatar & Progress */}
            <div className="w-24 bg-[#8bac0f] border-r-4 border-[#0f380f] p-2 flex flex-col items-center justify-center shrink-0 relative">
                <div className="w-16 h-16 bg-[#0f380f] rounded-full flex items-center justify-center mb-1 shadow-inner relative">
                    <GraduationCap size={32} className={`text-[#9bbc0f] transition-all duration-300 ${isCompleted ? 'scale-110 rotate-12' : ''}`} />
                    {isCompleted && (
                        <div className="absolute -top-1 -right-1 bg-[#9bbc0f] text-[#0f380f] rounded-full p-1 animate-bounce">
                            <CheckCircle2 size={12} fill="currentColor" />
                        </div>
                    )}
                </div>
                <div className="text-[8px] font-black text-[#0f380f] text-center leading-tight uppercase mt-1">
                    Les {currentLessonIdx + 1}/{LESSONS.length}
                </div>
            </div>

            {/* Rechter Kant: Instructie & Knoppen */}
            <div className="flex-1 p-4 flex flex-col justify-between bg-[#0f380f] relative min-h-[120px]">
                
                <div className="flex items-start gap-4 mb-2">
                     <div className="flex-1">
                        <h3 className="text-[#8bac0f] font-black text-[10px] uppercase tracking-widest mb-1 flex items-center gap-2">
                            {lesson.title} 
                            {isCompleted ? <span className="text-[#9bbc0f] animate-pulse">✓ VOLTOOID</span> : <span className="text-gray-500">...WACHTEN OP ACTIE</span>}
                        </h3>
                        <p className={`text-[#9bbc0f] text-xs font-bold leading-relaxed font-mono uppercase tracking-wide transition-opacity duration-300 ${isCompleted ? 'opacity-50' : 'opacity-100'}`}>
                            {instructionText}
                        </p>
                     </div>
                     
                     <button onClick={onClose} className="text-[#306230] hover:text-[#9bbc0f]"><X size={16}/></button>
                </div>

                {step.actionData && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-[#9bbc0f]/10 border border-[#9bbc0f]/20 rounded text-[9px] text-[#9bbc0f] animate-in fade-in">
                        <Sparkles size={12} />
                        <span>Demo automatisch geladen!</span>
                    </div>
                )}

                <div className="flex justify-between items-center mt-2 border-t border-[#306230] pt-2">
                     <div className="flex items-center gap-2 text-[9px] text-[#306230] font-black uppercase">
                        {step.taskType === 'SELECT_CELL' && <><MousePointer2 size={12}/> Klik Oplichtend Vakje</>}
                        {step.taskType === 'INPUT_NOTE' && <><Keyboard size={12}/> Druk {step.requiredPitch ? 'Toets' : 'Q'}</>}
                        {step.taskType === 'CHANGE_VOLUME' && !isEditorOpen && <><MousePointer2 size={12}/> DUBBELKLIK VAKJE</>}
                        {step.taskType === 'PLAY_SELECTION' && <><Play size={12}/> Druk Spatie</>}
                     </div>

                     <div className="flex gap-2">
                        <button 
                            onClick={prevStep}
                            disabled={currentLessonIdx === 0 && currentStepIdx === 0}
                            className="bg-[#306230] text-[#9bbc0f] p-1.5 rounded-sm disabled:opacity-30 hover:bg-[#8bac0f] hover:text-[#0f380f] transition-colors"
                        >
                            <ChevronLeft size={14} strokeWidth={3} />
                        </button>
                        
                        <button 
                            onClick={nextStep}
                            disabled={!isCompleted && step.taskType !== 'READ'}
                            className={`px-4 py-1.5 rounded-sm font-black text-[10px] uppercase flex items-center gap-2 transition-all shadow-lg
                                ${isCompleted 
                                    ? 'bg-[#9bbc0f] text-[#0f380f] hover:bg-[#8bac0f] hover:scale-105 cursor-pointer animate-pulse' 
                                    : (step.taskType === 'READ' ? 'bg-[#9bbc0f] text-[#0f380f] hover:bg-[#8bac0f]' : 'bg-[#1a1a1a] text-gray-500 border border-[#333] cursor-not-allowed opacity-50 grayscale')}
                            `}
                        >
                            {isLastStep && isLastLesson ? 'AFRONDEN' : 'VOLGENDE'} <ChevronRight size={12} strokeWidth={3} />
                        </button>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default AcademyOverlay;
