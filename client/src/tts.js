let voices = [];
const load = () => { voices = window.speechSynthesis?.getVoices().filter((v) => v.lang.startsWith('ja')) ?? []; };
if ('speechSynthesis' in window) { load(); window.speechSynthesis.onvoiceschanged = load; }

export const ttsSupported = () => 'speechSynthesis' in window;
export const hasJapaneseVoice = () => voices.length > 0;

export function speak(text, { pitch = 1, rate = 0.85 } = {}) {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.pitch = pitch;
    u.rate = rate;
    if (voices[0]) u.voice = voices[0];
    u.onend = u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export async function speakDialogue(lines, signal) {
  window.speechSynthesis?.cancel();
  for (const [who, text] of lines) {
    if (signal?.aborted) return;
    await speak(text, { pitch: who === 'A' ? 1.3 : 0.8 });
    await new Promise((r) => setTimeout(r, 350));
  }
}
export const stopSpeaking = () => window.speechSynthesis?.cancel();
