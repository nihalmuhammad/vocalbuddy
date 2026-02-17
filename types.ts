
export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export interface VoiceOption {
  id: VoiceName;
  label: string;
  description: string;
}

export type Language = 'en' | 'ml';

export interface LanguageOption {
  id: Language;
  label: string;
  nativeLabel: string;
}

export interface AudioGenerationState {
  isGenerating: boolean;
  audioUrl: string | null;
  error: string | null;
  rawBuffer: Uint8Array | null;
}
