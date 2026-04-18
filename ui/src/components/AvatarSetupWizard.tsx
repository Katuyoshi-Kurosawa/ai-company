import { useState, useEffect, useRef, useMemo } from 'react';
import type { Agent, AgentVisual, RoomId } from '../types';
import { HAIR_STYLES, HAIR_COLORS, SUIT_COLORS, ACCESSORIES, ROOMS, SKILLS, SKILL_CATEGORIES } from '../data/constants';
import { PixelCharacter } from './PixelCharacter';

type Step = 'intro' | 'gender' | 'hair-style' | 'hair-color' | 'suit' | 'accessory' | 'skills' | 'room' | 'complete';

const STEPS: Step[] = ['intro', 'gender', 'hair-style', 'hair-color', 'suit', 'accessory', 'skills', 'room', 'complete'];

interface Message {
  from: 'interviewer' | 'agent';
  text: string;
  step: Step;
}

const INTERVIEWER_LINES: Record<Step, string> = {
  'intro': 'はじめまして！プロフィール面接を始めましょう。あなたのことを教えてください。',
  'gender': 'では最初の質問です。性別を教えていただけますか？',
  'hair-style': '素敵ですね！次に、髪型を教えてください。',
  'hair-color': 'いい感じですね。髪の色はどうでしょう？',
  'suit': 'お仕事の服装を選んでください。',
  'accessory': 'アクセサリーはお好みですか？',
  'skills': 'それでは、あなたの得意なスキルを教えてください。複数選択できます。',
  'room': '最後に、配置場所を選びましょう。',
  'complete': '面接完了！素晴らしいプロフィールができました。',
};

interface Props {
  agent: Agent;
  onUpdate: (id: string, updates: Partial<Agent>) => void;
  onClose: () => void;
}

export function AvatarSetupWizard({ agent, onUpdate, onClose }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [visual, setVisual] = useState<AgentVisual>({ ...agent.visual });
  const [skills, setSkills] = useState<string[]>([...(agent.skills || [])]);
  const [room, setRoom] = useState<RoomId>(agent.room);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const stepIndex = STEPS.indexOf(step);

  // Add interviewer message when step changes
  useEffect(() => {
    setTyping(true);
    const timer = setTimeout(() => {
      setMessages(prev => [...prev, { from: 'interviewer', text: INTERVIEWER_LINES[step], step }]);
      setTyping(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [step]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const addResponse = (text: string) => {
    setMessages(prev => [...prev, { from: 'agent', text, step }]);
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
    }
  };

  const handleGender = (g: 'male' | 'female') => {
    setVisual(v => ({ ...v, gender: g }));
    addResponse(g === 'male' ? '男性です' : '女性です');
    onUpdate(agent.id, { visual: { ...visual, gender: g } });
    setTimeout(nextStep, 300);
  };

  const handleHairStyle = (id: string) => {
    const label = HAIR_STYLES.find(h => h.id === id)?.label ?? id;
    setVisual(v => ({ ...v, hairStyle: id }));
    addResponse(label);
    onUpdate(agent.id, { visual: { ...visual, hairStyle: id } });
    setTimeout(nextStep, 300);
  };

  const handleHairColor = (id: string) => {
    const label = HAIR_COLORS.find(c => c.id === id)?.label ?? id;
    setVisual(v => ({ ...v, hairColor: id }));
    addResponse(label);
    onUpdate(agent.id, { visual: { ...visual, hairColor: id } });
    setTimeout(nextStep, 300);
  };

  const handleSuit = (id: string) => {
    const label = SUIT_COLORS.find(c => c.id === id)?.label ?? id;
    setVisual(v => ({ ...v, suitColor: id }));
    addResponse(label);
    onUpdate(agent.id, { visual: { ...visual, suitColor: id } });
    setTimeout(nextStep, 300);
  };

  const handleAccessory = (id: string) => {
    const label = ACCESSORIES.find(a => a.id === id)?.label ?? id;
    setVisual(v => ({ ...v, accessory: id }));
    addResponse(label);
    onUpdate(agent.id, { visual: { ...visual, accessory: id } });
    setTimeout(nextStep, 300);
  };

  const handleSkillToggle = (id: string) => {
    setSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSkillsConfirm = () => {
    const names = skills.map(id => SKILLS.find(s => s.id === id)?.name ?? id);
    addResponse(names.length > 0 ? names.join('、') : 'なし');
    onUpdate(agent.id, { skills });
    setTimeout(nextStep, 300);
  };

  const handleRoom = (id: RoomId) => {
    const label = ROOMS.find(r => r.id === id)?.label ?? id;
    setRoom(id);
    addResponse(label);
    onUpdate(agent.id, { room: id });
    setTimeout(nextStep, 300);
  };

  const handleComplete = () => {
    onClose();
  };

  // Current visual for preview
  const previewVisual = visual;

  // Grouped skills by category
  const groupedSkills = useMemo(() => {
    return SKILL_CATEGORIES.map(cat => ({
      ...cat,
      skills: SKILLS.filter(s => s.category === cat.id),
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#12141e] border border-[#2a2e40] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex"
        onClick={e => e.stopPropagation()}>

        {/* Left: Character Preview */}
        <div className="w-72 shrink-0 flex flex-col items-center justify-center border-r border-[#2a2e40] p-6"
          style={{ background: 'linear-gradient(180deg, #1a1d2e 0%, #12141e 100%)' }}>
          <div className="relative mb-4">
            <div className="w-40 h-40 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}>
              <PixelCharacter visual={previewVisual} size="lg" active />
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-3 rounded-full bg-black/30 blur-sm" />
          </div>
          <h3 className="text-lg font-bold text-white">{agent.name}</h3>
          <p className="text-xs text-slate-400 mt-1">{agent.title}</p>

          {/* Progress dots */}
          <div className="flex gap-1.5 mt-6">
            {STEPS.map((s, i) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < stepIndex ? 'bg-indigo-400' :
                i === stepIndex ? 'bg-indigo-400 scale-125 ring-2 ring-indigo-400/30' :
                'bg-slate-600'
              }`} />
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">{stepIndex + 1} / {STEPS.length}</p>

          {/* Skill badges preview */}
          {skills.length > 0 && (
            <div className="mt-4 w-full">
              <p className="text-[10px] text-slate-500 mb-1.5 text-center">Skills</p>
              <div className="flex flex-wrap gap-1 justify-center">
                {skills.slice(0, 8).map(id => {
                  const sk = SKILLS.find(s => s.id === id);
                  return sk ? (
                    <span key={id} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      {sk.icon} {sk.name}
                    </span>
                  ) : null;
                })}
                {skills.length > 8 && (
                  <span className="text-[10px] text-slate-500">+{skills.length - 8}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Interview Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2e40]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-sm">
                🎤
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">プロフィール面接</h4>
                <p className="text-[10px] text-slate-500">{agent.name} のセットアップ</p>
              </div>
            </div>
            <button onClick={onClose} className="text-lg opacity-30 hover:opacity-80 transition cursor-pointer">✕</button>
          </div>

          {/* Chat area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'agent' ? 'justify-end' : 'justify-start'} animate-in`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm ${
                  msg.from === 'interviewer'
                    ? 'bg-[#1e2130] text-slate-200 rounded-bl-sm'
                    : 'bg-indigo-500/20 text-indigo-200 rounded-br-sm border border-indigo-500/20'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-[#1e2130] px-4 py-2.5 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area - changes per step */}
          <div className="border-t border-[#2a2e40] p-4 bg-[#14161f]">
            {step === 'intro' && !typing && (
              <button onClick={nextStep}
                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold cursor-pointer transition text-sm">
                面接を始める
              </button>
            )}

            {step === 'gender' && !typing && (
              <div className="flex gap-3">
                {(['male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => handleGender(g)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer transition border ${
                      visual.gender === g
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    }`}>
                    {g === 'male' ? '♂ 男性' : '♀ 女性'}
                  </button>
                ))}
              </div>
            )}

            {step === 'hair-style' && !typing && (
              <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                {HAIR_STYLES.map(h => (
                  <button key={h.id} onClick={() => handleHairStyle(h.id)}
                    className={`px-2 py-2 rounded-lg text-xs cursor-pointer transition border ${
                      visual.hairStyle === h.id
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    }`}>
                    {h.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'hair-color' && !typing && (
              <div className="flex gap-2 flex-wrap">
                {HAIR_COLORS.map(c => (
                  <button key={c.id} onClick={() => handleHairColor(c.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer transition border ${
                      visual.hairColor === c.id
                        ? 'border-indigo-500/40 ring-1 ring-indigo-400/30'
                        : 'border-white/10 hover:bg-white/[0.06]'
                    }`}
                    style={{ background: `${c.id}15` }}>
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: c.id }} />
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'suit' && !typing && (
              <div className="flex gap-2 flex-wrap">
                {SUIT_COLORS.map(c => (
                  <button key={c.id} onClick={() => handleSuit(c.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm cursor-pointer transition border ${
                      visual.suitColor === c.id
                        ? 'border-indigo-500/40 ring-1 ring-indigo-400/30'
                        : 'border-white/10 hover:bg-white/[0.06]'
                    }`}
                    style={{ background: `${c.id}15` }}>
                    <span className="w-4 h-4 rounded-full border border-white/20" style={{ background: c.id }} />
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'accessory' && !typing && (
              <div className="flex gap-2 flex-wrap">
                {ACCESSORIES.map(a => (
                  <button key={a.id} onClick={() => handleAccessory(a.id)}
                    className={`px-4 py-2.5 rounded-lg text-sm cursor-pointer transition border ${
                      visual.accessory === a.id
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'skills' && !typing && (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto space-y-3 pr-1">
                  {groupedSkills.map(cat => (
                    <div key={cat.id}>
                      <p className="text-[10px] font-semibold text-slate-400 mb-1">{cat.icon} {cat.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.skills.map(sk => {
                          const selected = skills.includes(sk.id);
                          return (
                            <button key={sk.id} onClick={() => handleSkillToggle(sk.id)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition border ${
                                selected
                                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                  : 'bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/[0.06] hover:text-slate-200'
                              }`}>
                              {sk.icon} {sk.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleSkillsConfirm}
                  className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold cursor-pointer transition text-sm">
                  {skills.length > 0 ? `${skills.length}個のスキルで決定` : 'スキップ'}
                </button>
              </div>
            )}

            {step === 'room' && !typing && (
              <div className="grid grid-cols-2 gap-2">
                {ROOMS.map(r => (
                  <button key={r.id} onClick={() => handleRoom(r.id as RoomId)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition border text-left ${
                      room === r.id
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-white/[0.03] text-slate-300 border-white/10 hover:bg-white/[0.06]'
                    }`}>
                    <span className="text-base">{r.icon}</span>
                    <div>
                      <span className="block text-xs font-semibold">{r.label}</span>
                      <span className="block text-[10px] opacity-50">{r.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 'complete' && !typing && (
              <button onClick={handleComplete}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold cursor-pointer transition text-sm">
                完了して閉じる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
