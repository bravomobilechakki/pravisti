import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Mic,
  Volume2,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  CheckCircle,
} from 'lucide-react-native';
import VoiceService from './VoiceService';
import {
  getVoicePreferences,
  updateVoicePreferences,
  resetVoicePreferences,
} from '../../services/api';

const COLORS = {
  primary: '#0B2265',      // Pravisti Royal Navy
  primaryLight: '#1E3A8A',
  accent: '#F59E0B',
  bg: '#F8FAFC',
  cardBg: '#FFFFFF',
  textMain: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  danger: '#EF4444',
  tagBg: '#EFF6FF',
};

export const INDIAN_LANGUAGES_LIST = [
  { label: 'हिन्दी (Hindi)', value: 'hi-IN', ttsCode: 'hi', flag: '🇮🇳', sample: 'नमस्ते! प्रविष्टि असिस्टेंट में आपका स्वागत है। आप आज क्या सौदा करना चाहते हैं?' },
  { label: 'English / Hinglish', value: 'en-IN', ttsCode: 'en', flag: '🇮🇳', sample: 'Hello! Welcome to Pravisti AI Assistant. How can I assist you with your trades today?' },
  { label: 'ગુજરાતી (Gujarati)', value: 'gu-IN', ttsCode: 'gu', flag: '🇮🇳', sample: 'નમસ્તે! પ્રવિષ્ટિ આસિસ્ટન્ટમાં આપનું સ્વાગત છે। હું તમારી શું મદદ કરી શકું?' },
  { label: 'தமிழ் (Tamil)', value: 'ta-IN', ttsCode: 'ta', flag: '🇮🇳', sample: 'வணக்கம்! பிரவிஷ்டி உதவி மையத்திற்கு வரவேற்கிறோம். நான் உங்களுக்கு எப்படி உதவ முடியும்?' },
  { label: 'తెలుగు (Telugu)', value: 'te-IN', ttsCode: 'te', flag: '🇮🇳', sample: 'నమస్కారం! ప్రవిష్టి అసిస్టెంట్‌కు స్వాగతం. నేను మీకు ఎలా సహాయపడగలను?' },
  { label: 'ಕನ್ನಡ (Kannada)', value: 'kn-IN', ttsCode: 'kn', flag: '🇮🇳', sample: 'ನಮಸ್ಕಾರ! ಪ್ರವಿಷ್ಟಿ ಅಸಿಸ್ಟೆಂಟ್ ಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?' },
  { label: 'मराठी (Marathi)', value: 'mr-IN', ttsCode: 'mr', flag: '🇮🇳', sample: 'नमस्कार! प्रविष्टी असिस्टंट मध्ये आपले स्वागत आहे। मी आपली काय मदत करू शकतो?' },
  { label: 'বাংলা (Bengali)', value: 'bn-IN', ttsCode: 'bn', flag: '🇮🇳', sample: 'নমস্কার! প্রবিষ্টি অ্যাসিস্ট্যান্টে আপনাকে স্বাগতম। আমি কীভাবে আপনাকে সাহায্য করতে পারি?' },
  { label: 'ਪੰਜਾਬੀ (Punjabi)', value: 'pa-IN', ttsCode: 'pa', flag: '🇮🇳', sample: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਪ੍ਰਵਿਸ਼ਟੀ ਅਸਿਸਟੈਂਟ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?' },
];

const LANGUAGES = INDIAN_LANGUAGES_LIST;

const INDIAN_VOICE_PRESETS = [
  {
    id: 'female_hindi',
    title: 'भारतीय महिला (Hindi / Regional)',
    desc: 'Sweet, natural & pleasant tone (Lekha / Google Neural)',
    lang: 'hi-IN',
    icon: '🌸',
  },
  {
    id: 'female_english',
    title: 'Indian Female (English / Hinglish)',
    desc: 'Clear & professional Indian English accent (Isha / Veena)',
    lang: 'en-IN',
    icon: '👩‍💼',
  },
  {
    id: 'male_indian',
    title: 'भारतीय पुरुष (Indian Male)',
    desc: 'Crisp, confident & bold tone (Rishi / Google Male)',
    lang: 'hi-IN',
    icon: '👨‍💼',
  },
];

const SPEED_PRESETS = [
  { label: 'धीमी (0.8x)', value: 0.42 },
  { label: 'सामान्य (1.0x)', value: 0.50 },
  { label: 'तेज़ (1.2x)', value: 0.58 },
];

export default function VoicePreferencesScreen({ onBack, userToken }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Preference Form States
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [voicePreset, setVoicePreset] = useState('female_hindi');
  const [speechRate, setSpeechRate] = useState(0.50); // Standard 1.0x natural rate
  const [pitch, setPitch] = useState(1.0);
  const [autoSpeakResponse, setAutoSpeakResponse] = useState(true);
  const [customPhrases, setCustomPhrases] = useState([]);
  const [newPhrase, setNewPhrase] = useState('');
  const [aliases, setAliases] = useState([]); // [{ key: 'Gehu', value: 'Wheat' }]
  const [newAliasKey, setNewAliasKey] = useState('');
  const [newAliasVal, setNewAliasVal] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load Voice Preferences on Mount
  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load Local Saved Settings
      const savedLang = await AsyncStorage.getItem('pravisti_assistant_language');
      const savedPreset = await AsyncStorage.getItem('pravisti_voice_preset');
      const savedRate = await AsyncStorage.getItem('pravisti_speech_rate');
      const savedPitch = await AsyncStorage.getItem('pravisti_speech_pitch');
      if (savedLang) setSelectedLanguage(savedLang);
      if (savedPreset) setVoicePreset(savedPreset);
      if (savedRate) setSpeechRate(parseFloat(savedRate) || 0.50);
      if (savedPitch) setPitch(parseFloat(savedPitch) || 1.0);

      // 2. Load API Preferences (GET /api/v1/voice/preferences)
      const res = await getVoicePreferences(userToken);
      if (res && res.success && res.data) {
        const d = res.data;
        if (d.language) setSelectedLanguage(d.language);
        if (typeof d.speechRate === 'number') {
          // If backend gave 0.88-1.0, normalize to standard 0.50 scale
          const normalizedRate = d.speechRate > 0.7 ? 0.50 : d.speechRate;
          setSpeechRate(normalizedRate);
        }
        if (typeof d.pitch === 'number') setPitch(d.pitch);
        if (typeof d.autoSpeakResponse === 'boolean') setAutoSpeakResponse(d.autoSpeakResponse);

        if (Array.isArray(d.customPhrases)) {
          setCustomPhrases(d.customPhrases);
        } else if (typeof d.customPhrases === 'string') {
          setCustomPhrases([d.customPhrases]);
        }

        if (d.aliases && typeof d.aliases === 'object') {
          const mapped = Object.entries(d.aliases).map(([key, value]) => ({ key, value }));
          setAliases(mapped);
        }
      }
    } catch (e) {
      console.warn('Error loading voice preferences:', e);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Add Custom Phrase
  const handleAddPhrase = () => {
    if (!newPhrase.trim()) return;
    if (!customPhrases.includes(newPhrase.trim())) {
      setCustomPhrases([...customPhrases, newPhrase.trim()]);
    }
    setNewPhrase('');
  };

  // Remove Custom Phrase
  const handleRemovePhrase = (index) => {
    setCustomPhrases(customPhrases.filter((_, i) => i !== index));
  };

  // Add Commodity Alias
  const handleAddAlias = () => {
    if (!newAliasKey.trim() || !newAliasVal.trim()) return;
    const exists = aliases.some(
      (a) => a.key.toLowerCase() === newAliasKey.trim().toLowerCase()
    );
    if (!exists) {
      setAliases([...aliases, { key: newAliasKey.trim(), value: newAliasVal.trim() }]);
    }
    setNewAliasKey('');
    setNewAliasVal('');
  };

  // Remove Commodity Alias
  const handleRemoveAlias = (index) => {
    setAliases(aliases.filter((_, i) => i !== index));
  };

  // Quick Preset Selection
  const handleSelectPreset = async (presetId) => {
    setVoicePreset(presetId);
    await AsyncStorage.setItem('pravisti_voice_preset', presetId);
    await VoiceService.applyBestIndianVoice(presetId);
  };

  // Test Speech Audio with Selected Language Sample
  const handleTestSpeech = async () => {
    const langObj = INDIAN_LANGUAGES_LIST.find((l) => l.value === selectedLanguage) || INDIAN_LANGUAGES_LIST[0];
    const sampleText = langObj.sample;

    VoiceService.speak(sampleText, {
      ttsLanguage: langObj.ttsCode,
      language: selectedLanguage,
      voicePreset,
      speechRate,
      pitch,
    });
  };

  // Save Voice Preferences (PUT /api/v1/voice/preferences)
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      // Save locally
      await AsyncStorage.setItem('pravisti_assistant_language', selectedLanguage);
      await AsyncStorage.setItem('pravisti_voice_preset', voicePreset);
      await AsyncStorage.setItem('pravisti_speech_rate', speechRate.toString());
      await AsyncStorage.setItem('pravisti_speech_pitch', pitch.toString());

      // Apply to active VoiceService instance
      await VoiceService.applyDynamicTtsLanguage(selectedLanguage, voicePreset);
      await VoiceService.initTts({
        language: selectedLanguage,
        voicePreset,
        speechRate,
        pitch,
      });

      const aliasObj = {};
      aliases.forEach((item) => {
        if (item.key && item.value) {
          aliasObj[item.key] = item.value;
        }
      });

      const payload = {
        language: selectedLanguage,
        speechRate,
        pitch,
        autoSpeakResponse,
        customPhrases,
        aliases: aliasObj,
      };

      const res = await updateVoicePreferences(payload, userToken);
      if (res && (res.success || res.status === 200 || res.statusCode === 200)) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        Alert.alert('Success', 'Indian voice preferences saved successfully!');
      } else {
        Alert.alert('Notice', 'Voice settings updated successfully on your device.');
      }
    } catch (e) {
      console.error('Error saving voice preferences:', e);
      Alert.alert('Notice', 'Saved locally to your device.');
    } finally {
      setSaving(false);
    }
  };

  // Reset Voice Preferences to Defaults
  const handleReset = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset your voice settings to default natural Indian voice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await AsyncStorage.removeItem('pravisti_voice_preset');
              await AsyncStorage.removeItem('pravisti_speech_rate');
              await AsyncStorage.removeItem('pravisti_speech_pitch');
              setVoicePreset('female_hindi');
              setSpeechRate(0.50);
              setPitch(1.0);
              setSelectedLanguage('hi-IN');
              await VoiceService.applyBestIndianVoice('female_hindi');

              const res = await resetVoicePreferences(userToken);
              if (res && (res.success || res.statusCode === 200)) {
                fetchPreferences();
              }
              Alert.alert('Reset', 'Default Indian voice restored.');
            } catch (e) {
              console.error('Error resetting voice preferences:', e);
              Alert.alert('Error', e.message || 'Failed to reset preferences.');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Voice Preferences</Text>
          <Text style={styles.headerSub}>Customize AI Voice & Phrases</Text>
        </View>
        <TouchableOpacity
          style={styles.resetHeaderBtn}
          onPress={handleReset}
          disabled={resetting}
        >
          {resetting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RotateCcw size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Voice Preferences...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success Banner */}
          {saveSuccess && (
            <View style={styles.successBanner}>
              <CheckCircle size={18} color="#065F46" />
              <Text style={styles.successBannerText}>Voice preferences saved successfully!</Text>
            </View>
          )}

          {/* ─── SECTION: INDIAN VOICE & TONE ─── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Volume2 size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Indian AI Voice & Tone</Text>
            </View>
            <Text style={styles.fieldDesc}>
              Choose the natural Indian voice persona for voice assistant responses.
            </Text>

            {/* Indian Voice Presets */}
            <View style={styles.presetContainer}>
              {INDIAN_VOICE_PRESETS.map((preset) => {
                const isSelected = voicePreset === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetCard,
                      isSelected ? styles.presetCardSelected : null,
                    ]}
                    onPress={() => handleSelectPreset(preset.id)}
                  >
                    <View style={styles.presetIconBox}>
                      <Text style={styles.presetEmoji}>{preset.icon}</Text>
                    </View>
                    <View style={styles.presetInfo}>
                      <Text
                        style={[
                          styles.presetTitle,
                          isSelected ? styles.presetTitleSelected : null,
                        ]}
                      >
                        {preset.title}
                      </Text>
                      <Text style={styles.presetDesc}>{preset.desc}</Text>
                    </View>
                    {isSelected && (
                      <View style={styles.presetCheck}>
                        <CheckCircle size={18} color={COLORS.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Speed Presets */}
            <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Speaking Speed (बोलने की गति)</Text>
            <View style={styles.speedGrid}>
              {SPEED_PRESETS.map((spd) => {
                const isSelected = Math.abs(speechRate - spd.value) < 0.04;
                return (
                  <TouchableOpacity
                    key={spd.label}
                    style={[
                      styles.speedCard,
                      isSelected ? styles.speedCardSelected : null,
                    ]}
                    onPress={() => setSpeechRate(spd.value)}
                  >
                    <Text
                      style={[
                        styles.speedCardText,
                        isSelected ? styles.speedCardTextSelected : null,
                      ]}
                    >
                      {spd.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Test Voice Button */}
            <TouchableOpacity style={styles.testVoiceBtn} onPress={handleTestSpeech}>
              <Volume2 size={18} color={COLORS.primary} />
              <Text style={styles.testVoiceText}>▶ Test Voice Output (आवाज़ सुनें)</Text>
            </TouchableOpacity>
          </View>

          {/* ─── SECTION: LANGUAGE & RECOGNITION ─── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Mic size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Speech Recognition & Language</Text>
            </View>

            {/* Language Selector */}
            <Text style={styles.fieldLabel}>Default Speech Language</Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.value;
                return (
                  <TouchableOpacity
                    key={lang.value}
                    style={[
                      styles.langCard,
                      isSelected ? styles.langCardSelected : null,
                    ]}
                    onPress={() => setSelectedLanguage(lang.value)}
                  >
                    <Text
                      style={[
                        styles.langCardText,
                        isSelected ? styles.langCardTextSelected : null,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Auto-Speak Toggle */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextBox}>
                <Text style={styles.switchLabel}>Auto-Speak Responses (TTS)</Text>
                <Text style={styles.switchDesc}>Speak AI assistant answers automatically</Text>
              </View>
              <Switch
                value={autoSpeakResponse}
                onValueChange={setAutoSpeakResponse}
                trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
                thumbColor={autoSpeakResponse ? COLORS.primary : '#94A3B8'}
              />
            </View>
          </View>

          {/* ─── SECTION: CUSTOM PHRASES ─── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sparkles size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Custom Spoken Phrases</Text>
            </View>
            <Text style={styles.fieldDesc}>
              Add trade phrases or commodity terms you frequently speak so the AI can recognize them with higher accuracy.
            </Text>

            {/* Input Row */}
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.phraseInput}
                placeholder="e.g. 'Chana 100 quintal', 'Rate update'..."
                placeholderTextColor="#94A3B8"
                value={newPhrase}
                onChangeText={setNewPhrase}
                onSubmitEditing={handleAddPhrase}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddPhrase}>
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Phrase Chips */}
            <View style={styles.chipsContainer}>
              {customPhrases.length === 0 ? (
                <Text style={styles.emptyText}>No custom phrases added yet.</Text>
              ) : (
                customPhrases.map((phrase, idx) => (
                  <View key={idx} style={styles.phraseChip}>
                    <Text style={styles.phraseChipText}>{phrase}</Text>
                    <TouchableOpacity onPress={() => handleRemovePhrase(idx)}>
                      <Trash2 size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ─── SECTION: COMMODITY & TERM ALIASES ─── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Sliders size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Commodity & Keyword Aliases</Text>
            </View>
            <Text style={styles.fieldDesc}>
              Map local spoken words to official commodity/system terms (e.g. "Gehu" ➔ "Wheat").
            </Text>

            {/* Add Alias Row */}
            <View style={styles.aliasInputRow}>
              <TextInput
                style={[styles.phraseInput, { flex: 1 }]}
                placeholder="Spoken Word (e.g. Gehu)"
                placeholderTextColor="#94A3B8"
                value={newAliasKey}
                onChangeText={setNewAliasKey}
              />
              <Text style={styles.aliasArrow}>➔</Text>
              <TextInput
                style={[styles.phraseInput, { flex: 1 }]}
                placeholder="Mapped Term (e.g. Wheat)"
                placeholderTextColor="#94A3B8"
                value={newAliasVal}
                onChangeText={setNewAliasVal}
              />
              <TouchableOpacity style={styles.addBtn} onPress={handleAddAlias}>
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Aliases List */}
            <View style={styles.aliasList}>
              {aliases.length === 0 ? (
                <Text style={styles.emptyText}>No custom aliases defined.</Text>
              ) : (
                aliases.map((item, idx) => (
                  <View key={idx} style={styles.aliasItem}>
                    <View style={styles.aliasTextBox}>
                      <Text style={styles.aliasKey}>{item.key}</Text>
                      <Text style={styles.aliasArrowInline}>➔</Text>
                      <Text style={styles.aliasVal}>{item.value}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveAlias(idx)}>
                      <Trash2 size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* ─── SAVE BUTTON ─── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving ? styles.saveBtnDisabled : null]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#93C5FD',
  },
  resetHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  loadingBox: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },

  // Card Styles
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  fieldDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  // Voice Preset Card Styles
  presetContainer: {
    gap: 10,
    marginTop: 4,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  presetCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  presetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetEmoji: {
    fontSize: 20,
  },
  presetInfo: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  presetTitleSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  presetDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 15,
  },
  presetCheck: {
    marginLeft: 4,
  },

  // Speed Grid Styles
  speedGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  speedCard: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  speedCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  speedCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  speedCardTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  // Language Grid
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  langCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: COLORS.primary,
  },
  langCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  langCardTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },

  // Switch Row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  switchTextBox: {
    flex: 1,
    paddingRight: 10,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  switchDesc: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  testVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  testVoiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Input Row
  addInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phraseInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: COLORS.textMain,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
    alignItems: 'center',
  },
  phraseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.tagBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  phraseChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Aliases
  aliasInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aliasArrow: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
  aliasList: {
    gap: 8,
  },
  aliasItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aliasTextBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aliasKey: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  aliasArrowInline: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  aliasVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },

  // Save Button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    height: 50,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
