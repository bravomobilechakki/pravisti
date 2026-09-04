import { Platform, PermissionsAndroid } from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const normalizeTtsLanguage = (code) => {
  if (!code || typeof code !== 'string') return null;
  const clean = code.trim().toLowerCase();
  if (clean.includes('-') || clean.includes('_')) {
    const [l, c] = clean.replace('_', '-').split('-');
    return `${l.toLowerCase()}-${(c || 'IN').toUpperCase()}`;
  }
  const map = {
    en: 'en-IN',
    english: 'en-IN',
    hi: 'hi-IN',
    hindi: 'hi-IN',
    hinglish: 'hi-IN',
    gu: 'gu-IN',
    gujarati: 'gu-IN',
    ta: 'ta-IN',
    tamil: 'ta-IN',
    te: 'te-IN',
    telugu: 'te-IN',
    kn: 'kn-IN',
    kannada: 'kn-IN',
    mr: 'mr-IN',
    marathi: 'mr-IN',
    bn: 'bn-IN',
    bengali: 'bn-IN',
    pa: 'pa-IN',
    punjabi: 'pa-IN',
    ml: 'ml-IN',
    malayalam: 'ml-IN',
    or: 'or-IN',
    odia: 'or-IN',
    ur: 'ur-IN',
    urdu: 'ur-IN',
  };
  return map[clean] || (clean.length === 2 ? `${clean}-IN` : clean);
};

class VoiceService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.isTtsInitialized = false;
    this.currentLanguage = 'en-IN'; // Default to Indian Hinglish (Roman English script)
    this.speechRate = 0.50; // Natural, crisp human speaking rate (0.50 is standard 1.0x in react-native-tts)
    this.pitch = 1.0;
    this.selectedVoiceId = null;
    this.voicePreset = 'female_hindi'; // 'female_hindi' | 'female_english' | 'male_indian'
    this.autoSpeak = true;

    this.listeners = new Set();
    this.activeCallbacks = {};
    this.ttsSafetyTimer = null;
    this.onDoneCallback = null;
    this._setupVoiceListeners();
    this._loadSavedPreferences();
  }

  async _loadSavedPreferences() {
    try {
      const savedPreset = await AsyncStorage.getItem('pravisti_voice_preset');
      const savedVoiceId = await AsyncStorage.getItem('pravisti_voice_id');
      const savedRate = await AsyncStorage.getItem('pravisti_speech_rate');
      const savedPitch = await AsyncStorage.getItem('pravisti_speech_pitch');

      if (savedPreset) this.voicePreset = savedPreset;
      if (savedVoiceId) this.selectedVoiceId = savedVoiceId;
      if (savedRate) this.speechRate = parseFloat(savedRate) || 0.50;
      if (savedPitch) this.pitch = parseFloat(savedPitch) || 1.0;
    } catch (e) {
      console.warn('Notice loading saved voice preferences:', e);
    }
  }

  _setupVoiceListeners() {
    Voice.onSpeechStart = (e) => {
      this.isListening = true;
      if (this.activeCallbacks.onStart) this.activeCallbacks.onStart(e);
      this.emit('speech-start', e);
    };

    Voice.onSpeechRecognized = (e) => {
      this.isListening = true;
      if (this.activeCallbacks.onRecognized) this.activeCallbacks.onRecognized(e);
      this.emit('speech-recognized', e);
    };

    Voice.onSpeechEnd = (e) => {
      this.isListening = false;
      if (this.activeCallbacks.onEnd) this.activeCallbacks.onEnd(e);
      this.emit('speech-end', e);
    };

    Voice.onSpeechError = (e) => {
      this.isListening = false;
      const rawMsg = e?.error?.message || e?.error || 'Speech recognition error';
      const codeStr = String(e?.error?.code || (typeof rawMsg === 'string' ? rawMsg.split('/')[0] : ''));
      const isTimeout =
        codeStr === '6' ||
        codeStr === '7' ||
        String(rawMsg).includes('7') ||
        String(rawMsg).includes('6') ||
        String(rawMsg).toLowerCase().includes('no speech') ||
        String(rawMsg).toLowerCase().includes('no match');

      if (!isTimeout) {
        console.warn('Speech Error:', rawMsg, 'Code:', codeStr);
      }
      if (this.activeCallbacks.onError) {
        this.activeCallbacks.onError(e, isTimeout, codeStr);
      }
      this.emit('speech-error', { error: e, isTimeout, code: codeStr });
    };

    Voice.onSpeechResults = (e) => {
      const text = (e && Array.isArray(e.value) && e.value.length > 0)
        ? e.value[0]
        : (typeof e?.value === 'string' ? e.value : '');
      if (this.activeCallbacks.onResults) {
        this.activeCallbacks.onResults(text, e?.value);
      }
      this.emit('speech-results', { text, values: e?.value });
    };

    Voice.onSpeechPartialResults = (e) => {
      const text = (e && Array.isArray(e.value) && e.value.length > 0)
        ? e.value[0]
        : (typeof e?.value === 'string' ? e.value : '');
      if (this.activeCallbacks.onPartialResults) {
        this.activeCallbacks.onPartialResults(text, e?.value);
      }
      this.emit('speech-partial-results', { text, values: e?.value });
    };

    Voice.onSpeechVolumeChanged = (e) => {
      const vol = typeof e?.value === 'number' ? e.value : (Number(e) || 0);
      if (this.activeCallbacks.onVolumeChanged) {
        this.activeCallbacks.onVolumeChanged(vol);
      }
    };
  }

  /**
   * Request Microphone Permission (Android)
   */
  async requestMicPermission() {
    if (Platform.OS === 'android') {
      try {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (alreadyGranted) return true;

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission Required',
            message: 'Pravisti needs access to your microphone to listen to voice commands.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Microphone permission request error:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Get all Indian Voices on device
   */
  async getAvailableIndianVoices() {
    try {
      await Tts.getInitStatus();
      const voices = await Tts.voices();
      if (!Array.isArray(voices)) return [];

      return voices.filter((v) => {
        const lang = (v.language || '').toLowerCase();
        const id = (v.id || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return (
          lang.includes('hi') ||
          lang.includes('in') ||
          id.includes('hi-in') ||
          id.includes('en-in') ||
          id.includes('lekha') ||
          id.includes('isha') ||
          id.includes('veena') ||
          id.includes('rishi') ||
          name.includes('lekha') ||
          name.includes('isha') ||
          name.includes('veena') ||
          name.includes('rishi')
        );
      });
    } catch (e) {
      console.warn('Error fetching available Indian voices:', e);
      return [];
    }
  }

  /**
   * Apply Best Indian Voice based on Preset or specific Voice ID
   */
  async applyBestIndianVoice(preset = this.voicePreset, specificVoiceId = this.selectedVoiceId) {
    try {
      const voices = await Tts.voices();
      if (!Array.isArray(voices) || voices.length === 0) return;

      let selectedVoice = null;

      // 1. If explicit voice ID provided & exists
      if (specificVoiceId) {
        selectedVoice = voices.find((v) => v.id === specificVoiceId && !v.notInstalled);
      }

      // Helper to check for Female Indian voices
      const isKnownMale = (v) => {
        const id = (v.id || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        const gender = (v.gender || '').toLowerCase();
        return (
          gender === 'male' ||
          id.includes('-hic') ||
          id.includes('-hib') ||
          id.includes('-enc') ||
          id.includes('-enb') ||
          name.includes('rishi') ||
          id.includes('rishi')
        );
      };

      // 2. Female Indian Voice Selection
      if (!selectedVoice) {
        const p = (preset || 'female_hindi').toLowerCase();

        if (p.includes('female_hindi') || p === 'hindi' || p === 'female') {
          // Priority: High quality Neural Hindi Female (hie/hia/hid) -> Lekha -> any non-male Hindi voice
          selectedVoice =
            voices.find((v) => (v.id?.includes('hi-in-x-hie') || v.id?.includes('hi-in-x-hia') || v.id?.includes('hi-in-x-hid') || v.id?.includes('hi-in-x-hif')) && !v.notInstalled) ||
            voices.find((v) => (v.name?.toLowerCase().includes('lekha') || v.id?.toLowerCase().includes('lekha')) && !v.notInstalled) ||
            voices.find((v) => (v.language?.toLowerCase().includes('hi-in') || v.language?.toLowerCase().includes('hi_in')) && !isKnownMale(v) && !v.notInstalled) ||
            voices.find((v) => v.language?.toLowerCase().startsWith('hi') && !isKnownMale(v) && !v.notInstalled);
        } else if (p.includes('female_english') || p === 'english') {
          // Priority: Indian English Female (Isha / Veena / Google en-IN Female end/ene/ena/cxx)
          selectedVoice =
            voices.find((v) => (v.id?.includes('en-in-x-end') || v.id?.includes('en-in-x-ene') || v.id?.includes('en-in-x-ena') || v.id?.includes('en-in-x-cxx')) && !v.notInstalled) ||
            voices.find((v) => (v.name?.toLowerCase().includes('isha') || v.id?.toLowerCase().includes('isha') || v.name?.toLowerCase().includes('veena') || v.id?.toLowerCase().includes('veena')) && !v.notInstalled) ||
            voices.find((v) => (v.language?.toLowerCase().includes('en-in') || v.language?.toLowerCase().includes('en_in')) && !isKnownMale(v) && !v.notInstalled);
        } else if (p.includes('male')) {
          // Indian Male (Rishi / Google Male)
          selectedVoice =
            voices.find((v) => (v.id?.includes('hi-in-x-hic') || v.id?.includes('hi-in-x-hib') || v.id?.includes('en-in-x-enc') || v.id?.includes('en-in-x-enb')) && !v.notInstalled) ||
            voices.find((v) => (v.name?.toLowerCase().includes('rishi') || v.id?.toLowerCase().includes('rishi')) && !v.notInstalled);
        }

        // Fallback strictly prioritizing Female Indian voices
        if (!selectedVoice) {
          selectedVoice =
            voices.find((v) => (v.language?.toLowerCase().includes('hi') || v.language?.toLowerCase().includes('in')) && !isKnownMale(v) && !v.notInstalled) ||
            voices.find((v) => (v.language?.toLowerCase().includes('hi') || v.language?.toLowerCase().includes('in')) && !v.notInstalled);
        }
      }

      if (selectedVoice && selectedVoice.id) {
        this.selectedVoiceId = selectedVoice.id;
        await Tts.setDefaultVoice(selectedVoice.id);
        const voiceLang = selectedVoice.language || this.currentLanguage || 'en-IN';
        try {
          await Tts.setDefaultLanguage(voiceLang);
        } catch { }
      }
    } catch (e) {
      console.warn('Notice setting Indian TTS voice:', e);
    }
  }

  /**
   * Dynamically apply TTS language & matching voice based on backend ttsLanguage metadata
   */
  async applyDynamicTtsLanguage(ttsLanguage, fallbackPreset = this.voicePreset) {
    if (!ttsLanguage) return;
    const normalized = normalizeTtsLanguage(ttsLanguage);
    if (!normalized) return;

    this.currentLanguage = normalized;
    const langPrefix = normalized.split('-')[0]; // e.g. 'gu', 'ta', 'te', 'hi', 'en', 'kn', 'mr', 'bn'

    try {
      await Tts.getInitStatus();
      const voices = await Tts.voices();

      let matchingVoice = null;
      if (Array.isArray(voices) && voices.length > 0) {
        // Priority 1: Match exact language and installed
        matchingVoice = voices.find(
          (v) =>
            !v.notInstalled &&
            (v.language?.toLowerCase() === normalized.toLowerCase() ||
              v.id?.toLowerCase().includes(normalized.toLowerCase()))
        );

        // Priority 2: Match language prefix (e.g. 'gu', 'ta', 'te', 'kn') and installed
        if (!matchingVoice) {
          matchingVoice = voices.find(
            (v) =>
              !v.notInstalled &&
              (v.language?.toLowerCase().startsWith(langPrefix) ||
                v.id?.toLowerCase().includes(`-${langPrefix}-`) ||
                v.id?.toLowerCase().includes(`_${langPrefix}_`))
          );
        }

        // Priority 3: Any voice matching language prefix
        if (!matchingVoice) {
          matchingVoice = voices.find(
            (v) =>
              v.language?.toLowerCase().startsWith(langPrefix) ||
              v.id?.toLowerCase().includes(`-${langPrefix}-`)
          );
        }
      }

      // If matching native voice found on device, set default voice
      if (matchingVoice && matchingVoice.id) {
        this.selectedVoiceId = matchingVoice.id;
        await Tts.setDefaultVoice(matchingVoice.id);
      } else if (langPrefix === 'hi' || langPrefix === 'en') {
        await this.applyBestIndianVoice(fallbackPreset);
      }

      // Set default language for TTS synthesis
      try {
        await Tts.setDefaultLanguage(normalized);
      } catch {
        try {
          await Tts.setDefaultLanguage(normalized.replace('-', '_'));
        } catch {
          try {
            await Tts.setDefaultLanguage(langPrefix);
          } catch (e) {
            console.warn(`TTS setDefaultLanguage (${normalized}) notice:`, e?.message || e);
          }
        }
      }
    } catch (err) {
      console.warn('Error applying dynamic TTS language:', err?.message || err);
    }
  }

  /**
   * Initialize TTS Engine
   */
  async initTts(config = {}) {
    if (this.isTtsInitialized) {
      if (config.speechRate) {
        this.speechRate = config.speechRate;
        await Tts.setDefaultRate(this.speechRate, false);
      }
      if (config.pitch) {
        this.pitch = config.pitch;
        await Tts.setDefaultPitch(this.pitch);
      }
      if (config.voicePreset || config.voiceId) {
        await this.applyBestIndianVoice(config.voicePreset, config.voiceId);
      }
      if (config.language || config.ttsLanguage) {
        await this.applyDynamicTtsLanguage(config.ttsLanguage || config.language);
      }
      return;
    }

    try {
      if (config.language) this.currentLanguage = config.language;
      if (config.speechRate) this.speechRate = config.speechRate;
      if (config.pitch) this.pitch = config.pitch;
      if (config.voicePreset) this.voicePreset = config.voicePreset;
      if (config.voiceId) this.selectedVoiceId = config.voiceId;

      await Tts.getInitStatus();
      this.isTtsInitialized = true;

      // Set standard natural rate (0.50 in react-native-tts is natural 1.0x human tempo)
      await Tts.setDefaultRate(this.speechRate || 0.50, false);
      await Tts.setDefaultPitch(this.pitch || 1.0);

      // Set dynamic language
      const initLang = this.currentLanguage || 'en-IN';
      try {
        await Tts.setDefaultLanguage(initLang);
      } catch {
        try {
          await Tts.setDefaultLanguage('en-IN');
        } catch { }
      }

      // Apply matching voice
      if (config.language || config.ttsLanguage) {
        await this.applyDynamicTtsLanguage(config.ttsLanguage || config.language || initLang);
      } else {
        await this.applyBestIndianVoice(this.voicePreset, this.selectedVoiceId);
      }

      Tts.addEventListener('tts-start', () => {
        this.isSpeaking = true;
        this.emit('tts-start');
      });

      Tts.addEventListener('tts-finish', () => {
        if (this.ttsSafetyTimer) {
          clearTimeout(this.ttsSafetyTimer);
          this.ttsSafetyTimer = null;
        }
        this.isSpeaking = false;
        this.emit('tts-finish');
        if (this.onDoneCallback) {
          const cb = this.onDoneCallback;
          this.onDoneCallback = null;
          cb();
        }
      });

      Tts.addEventListener('tts-cancel', () => {
        if (this.ttsSafetyTimer) {
          clearTimeout(this.ttsSafetyTimer);
          this.ttsSafetyTimer = null;
        }
        this.isSpeaking = false;
        this.emit('tts-cancel');
        if (this.onDoneCallback) {
          const cb = this.onDoneCallback;
          this.onDoneCallback = null;
          cb();
        }
      });

      Tts.addEventListener('tts-error', () => {
        if (this.ttsSafetyTimer) {
          clearTimeout(this.ttsSafetyTimer);
          this.ttsSafetyTimer = null;
        }
        this.isSpeaking = false;
        this.emit('tts-finish');
        if (this.onDoneCallback) {
          const cb = this.onDoneCallback;
          this.onDoneCallback = null;
          cb();
        }
      });
    } catch (err) {
      console.warn('TTS Init Error:', err);
    }
  }

  /**
   * Speak Text via TTS with direct onDone callback support and dynamic backend ttsLanguage
   */
  async speak(text, options = {}) {
    if (!text || typeof text !== 'string') {
      if (options && typeof options === 'object' && options.onDone) options.onDone();
      return;
    }

    const opts = typeof options === 'string'
      ? { ttsLanguage: options, language: options }
      : (typeof options === 'object' && options !== null ? { ...options } : {});

    try {
      // First stop any active speech recognition
      if (this.isListening) {
        await this.stopListening();
      }

      await this.initTts(opts);

      // Dynamically switch TTS language & voice based on target language
      const targetTtsLang = opts.ttsLanguage || opts.language || this.currentLanguage || 'hi-IN';
      if (targetTtsLang) {
        await this.applyDynamicTtsLanguage(targetTtsLang, opts.voicePreset || this.voicePreset);
      }

      if (this.ttsSafetyTimer) {
        clearTimeout(this.ttsSafetyTimer);
        this.ttsSafetyTimer = null;
      }

      this.onDoneCallback = opts.onDone || null;

      try {
        await Tts.stop();
      } catch { }

      // Clean Markdown formatting so TTS speaks naturally
      const cleaned = text
        .replace(/[*_#`~•]/g, ' ')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (cleaned.length > 0) {
        this.isSpeaking = true;
        this.emit('tts-start');

        const utteranceId = `utt_${Date.now()}`;
        Tts.speak(cleaned, {
          androidParams: {
            KEY_PARAM_UTTERANCE_ID: utteranceId,
            KEY_PARAM_STREAM: 'STREAM_MUSIC',
            KEY_PARAM_VOLUME: 1.0,
            KEY_PARAM_PAN: 0.0,
          },
        });

        // Generous fallback safety timer (20s+, only triggered if native TTS drops utterance callback)
        const estimatedMs = Math.max(10000, (cleaned.length / 5) * 1000 + 5000);
        this.ttsSafetyTimer = setTimeout(() => {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.emit('tts-finish');
            if (this.onDoneCallback) {
              const cb = this.onDoneCallback;
              this.onDoneCallback = null;
              cb();
            }
          }
        }, estimatedMs);
      } else {
        this.isSpeaking = false;
        this.emit('tts-finish');
        if (this.onDoneCallback) {
          const cb = this.onDoneCallback;
          this.onDoneCallback = null;
          cb();
        }
      }
    } catch (e) {
      console.warn('Error in Tts.speak:', e);
      this.isSpeaking = false;
      this.emit('tts-finish');
      if (this.onDoneCallback) {
        const cb = this.onDoneCallback;
        this.onDoneCallback = null;
        cb();
      }
    }
  }

  /**
   * Stop TTS Speech
   */
  async stopSpeaking() {
    if (this.ttsSafetyTimer) {
      clearTimeout(this.ttsSafetyTimer);
      this.ttsSafetyTimer = null;
    }
    this.onDoneCallback = null;
    this.isSpeaking = false;
    try {
      await Tts.stop();
    } catch (e) {
      console.warn('Error in stopSpeaking:', e);
    }
  }

  /**
   * Start Speech Recognition (STT)
   */
  async startListening(callbacks = {}, lang = null) {
    const hasPermission = await this.requestMicPermission();
    if (!hasPermission) {
      if (callbacks.onError) {
        callbacks.onError({ message: 'Microphone permission denied' }, false, '9');
      }
      return false;
    }

    try {
      // Stop TTS if speaking and wait for audio track release
      if (this.isSpeaking) {
        await this.stopSpeaking();
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      this.activeCallbacks = callbacks;

      // Ensure any previous speech session is cleanly destroyed
      try {
        await Voice.cancel();
        await Voice.destroy();
      } catch {}
      this._setupVoiceListeners();

      // Short buffer for native audio focus
      await new Promise((resolve) => setTimeout(resolve, 120));

      const selectedLang = lang || this.currentLanguage || 'en-IN';
      const baseCode = selectedLang.split('-')[0];

      try {
        await Voice.start(selectedLang, {
          EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
          EXTRA_MAX_RESULTS: 5,
          EXTRA_PARTIAL_RESULTS: true,
          EXTRA_LANGUAGE: selectedLang,
          EXTRA_LANGUAGE_PREFERENCE: selectedLang,
          EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE: selectedLang,
        });
      } catch (startErr) {
        console.warn('Retrying Voice.start with simple locale:', startErr);
        try {
          await Voice.start(selectedLang);
        } catch {
          await Voice.start(baseCode);
        }
      }

      this.isListening = true;
      return true;
    } catch (error) {
      console.warn('Error starting speech recognition:', error?.message || error);
      this.isListening = false;
      if (callbacks.onError) callbacks.onError(error);
      return false;
    }
  }

  /**
   * Stop Speech Recognition
   */
  async stopListening() {
    this.isListening = false;
    try {
      await Voice.stop();
    } catch (e) {
      console.warn('Error stopping speech:', e);
    }
  }

  /**
   * Cancel and destroy Speech Recognition
   */
  async cancelListening() {
    this.isListening = false;
    this.activeCallbacks = {};
    try {
      await Voice.cancel();
      await Voice.destroy();
      this._setupVoiceListeners();
    } catch (e) {
      console.warn('Error cancelling speech:', e);
    }
  }

  /**
   * App Event emitter
   */
  on(event, callback) {
    const listenerObj = { event, callback };
    this.listeners.add(listenerObj);
    return () => {
      this.listeners.delete(listenerObj);
    };
  }

  emit(event, data) {
    this.listeners.forEach((item) => {
      if (item.event === event) {
        try {
          item.callback(data);
        } catch (e) {
          console.warn('VoiceService listener error:', e);
        }
      }
    });
  }

  /**
   * Clean up all audio and listeners
   */
  async destroy() {
    try {
      await this.stopSpeaking();
      await this.cancelListening();
      this.listeners.clear();
      this.activeCallbacks = {};
    } catch (e) {
      console.warn('Error destroying VoiceService:', e);
    }
  }
}

const voiceServiceInstance = new VoiceService();

/**
 * Centralized speakText function as specified in Pravisti Frontend TTS Language Integration
 * @param {string} text - Customer-facing promptMessage
 * @param {string} ttsLanguage - Backend-provided ttsLanguage code (e.g. 'hi', 'en', 'gu', 'ta', 'te', 'kn')
 * @param {object} options - Optional parameters (e.g. onDone, speechRate, pitch)
 */
export const speakText = async (text, ttsLanguage, options = {}) => {
  return await voiceServiceInstance.speak(text, {
    ttsLanguage,
    ...options,
  });
};

export default voiceServiceInstance;
