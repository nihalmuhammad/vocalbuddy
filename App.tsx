
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { VOICES, LANGUAGES, ICONS } from './constants';
import { VoiceName, Language, AudioGenerationState } from './types';
import { generateSpeech } from './services/geminiService';
import { createWavFile, decodeBase64 } from './services/audioUtils';

const App: React.FC = () => {
  const [text, setText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Zephyr');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [status, setStatus] = useState<AudioGenerationState>({
    isGenerating: false,
    audioUrl: null,
    error: null,
    rawBuffer: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;

    setStatus(prev => ({ ...prev, isGenerating: true, error: null, audioUrl: null, rawBuffer: null }));
    
    try {
      const base64 = await generateSpeech(text, selectedVoice, selectedLanguage);
      const pcmBytes = decodeBase64(base64);
      const wavBlob = createWavFile(pcmBytes);
      const url = URL.createObjectURL(wavBlob);
      
      setStatus({
        isGenerating: false,
        audioUrl: url,
        error: null,
        rawBuffer: pcmBytes,
      });
    } catch (err: any) {
      setStatus(prev => ({
        ...prev,
        isGenerating: false,
        error: err.message || 'Connection lost. Please try again.',
      }));
    }
  };

  const handleClear = () => {
    setText('');
    if (status.audioUrl) URL.revokeObjectURL(status.audioUrl);
    setStatus({
      isGenerating: false,
      audioUrl: null,
      error: null,
      rawBuffer: null,
    });
  };

  const handleDownload = () => {
    if (!status.audioUrl) return;
    const a = document.createElement('a');
    a.href = status.audioUrl;
    a.download = `vocal-ease-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!status.rawBuffer) return;
    
    const wavBlob = createWavFile(status.rawBuffer);
    const fileName = `voice-${Date.now()}.wav`;
    const file = new File([wavBlob], fileName, { type: 'audio/wav' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'VocalEase Voice Note',
          text: 'Listen to this voice message generated via VocalEase.',
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Sharing failed:', err);
        }
      }
    } else {
      alert("Sharing is not supported on this browser. Use the Save button.");
    }
  };

  const canShareFiles = !!(navigator.canShare && navigator.share);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <ICONS.Mic />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-800">VocalEase</h1>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 shadow-inner">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => {
                setSelectedLanguage(lang.id);
                setStatus(prev => ({ ...prev, audioUrl: null, rawBuffer: null, error: null }));
              }}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                selectedLanguage === lang.id
                  ? 'bg-white text-indigo-600 shadow-md ring-1 ring-black/5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {lang.nativeLabel}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pb-36">
        {/* Input Header */}
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Text Input</span>
             {selectedLanguage === 'ml' && (
               <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter animate-pulse">
                 Malayalam Translation Active
               </span>
             )}
          </div>
          <span className="text-xs font-medium text-slate-400">
            {text.length} / 500
          </span>
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            placeholder={selectedLanguage === 'ml' ? 'Type in English here, it will be translated...' : 'Type your English message here...'}
            className="w-full p-6 h-48 resize-none focus:outline-none text-lg leading-relaxed placeholder:text-slate-300"
          />
          <div className="bg-slate-50/80 px-4 py-3 flex items-center justify-end border-t border-slate-100">
            <button 
              onClick={handleClear}
              className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors group"
              title="Clear text"
            >
              <ICONS.Trash />
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">Voice Profile</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${
                  selectedVoice === v.id
                    ? 'border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-500/10'
                    : 'border-white bg-white hover:border-slate-200 shadow-sm'
                }`}
              >
                <span className={`font-bold text-sm mb-0.5 ${selectedVoice === v.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {v.label}
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-tight">{v.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Result Area */}
        {status.error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-600 text-sm mb-6 flex items-start gap-3 animate-in fade-in zoom-in-95 duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="font-bold">Oops!</p>
              <p className="text-xs opacity-90">{status.error}</p>
            </div>
          </div>
        )}

        {status.audioUrl && (
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-indigo-50 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Voice Note Ready</h3>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-tighter">
                  {selectedLanguage === 'ml' ? 'Malayalam Version' : 'English Version'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDownload}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <ICONS.Download />
                  <span>Save</span>
                </button>
                {canShareFiles && (
                  <button 
                    onClick={handleShare}
                    className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                  >
                    <ICONS.Share />
                    <span>Share</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100">
              <audio 
                ref={audioRef}
                src={status.audioUrl} 
                controls 
                className="w-full h-11"
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-20">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleGenerate}
            disabled={status.isGenerating || !text.trim()}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-extrabold text-lg shadow-2xl transition-all active:scale-[0.97] group ${
              status.isGenerating || !text.trim()
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none opacity-60'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-300/50'
            }`}
          >
            {status.isGenerating ? (
              <>
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="tracking-tight">Converting...</span>
              </>
            ) : (
              <>
                <div className="group-hover:scale-110 transition-transform">
                  <ICONS.Play />
                </div>
                <span className="tracking-tight">
                  {selectedLanguage === 'ml' ? 'Translate & Speak' : 'Generate Voice'}
                </span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
