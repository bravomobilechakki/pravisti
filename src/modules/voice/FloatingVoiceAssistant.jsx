import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    Easing,
    ScrollView,
    ActivityIndicator,
    Platform,
    BackHandler,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    X,
    Sparkles,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Building2,
    Package,
    Layers,
    IndianRupee,
    RotateCcw,
    Sliders,
    Globe,
    ChevronDown,
    Check,
    Hand,
} from 'lucide-react-native';
import VoiceService from './VoiceService';
import { processVoiceCommand } from '../../services/api';


export const ASSISTANT_LANGUAGES = [
    {
        "code": "hi-IN",
        "ttsCode": "hi",
        "langName": "hindi",
        "label": "हिन्दी (Hindi)",
        "shortName": "हिन्दी",
        "flag": "🇮🇳"
    },
    {
        "code": "en-IN",
        "ttsCode": "en",
        "langName": "english",
        "label": "English / Hinglish",
        "shortName": "Hinglish",
        "flag": "🇮🇳"
    },
    {
        "code": "gu-IN",
        "ttsCode": "gu",
        "langName": "gujarati",
        "label": "ગુજરાતી (Gujarati)",
        "shortName": "ગુજરાતી",
        "flag": "🇮🇳"
    },
    {
        "code": "ta-IN",
        "ttsCode": "ta",
        "langName": "tamil",
        "label": "தமிழ் (Tamil)",
        "shortName": "தமிழ்",
        "flag": "🇮🇳"
    },
    {
        "code": "te-IN",
        "ttsCode": "te",
        "langName": "telugu",
        "label": "తెలుగు (Telugu)",
        "shortName": "తెలుగు",
        "flag": "🇮🇳"
    },
    {
        "code": "kn-IN",
        "ttsCode": "kn",
        "langName": "kannada",
        "label": "ಕನ್ನಡ (Kannada)",
        "shortName": "ಕನ್ನಡ",
        "flag": "🇮🇳"
    },
    {
        "code": "mr-IN",
        "ttsCode": "mr",
        "langName": "marathi",
        "label": "मराठी (Marathi)",
        "shortName": "मराठी",
        "flag": "🇮🇳"
    },
    {
        "code": "bn-IN",
        "ttsCode": "bn",
        "langName": "bengali",
        "label": "বাংলা (Bengali)",
        "shortName": "বাংলা",
        "flag": "🇮🇳"
    },
    {
        "code": "pa-IN",
        "ttsCode": "pa",
        "langName": "punjabi",
        "label": "ਪੰਜਾਬੀ (Punjabi)",
        "shortName": "ਪੰਜਾਬੀ",
        "flag": "🇮🇳"
    }
];

export default function FloatingVoiceAssistant({
    currentScreen,
    userToken,
    onNavigate,
    onOpenPreferences,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [spokenText, setSpokenText] = useState('');

    // Pravisti Voice Engine State
    const [sessionId, setSessionId] = useState(null);
    const [currentStep, setCurrentStep] = useState(null); // 'COLLECTING_DETAILS' | 'REVIEW_PENDING' | 'COMPLETED' | 'CANCELLED'
    const [promptMessage, setPromptMessage] = useState('');
    const [draftData, setDraftData] = useState(null);
    const [missingFields, setMissingFields] = useState([]);
    const [options, setOptions] = useState([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [autoSpeak, setAutoSpeak] = useState(true);
    const [selectedLang, setSelectedLang] = useState('en-IN'); // Default to Hinglish (en-IN)
    const [langModalVisible, setLangModalVisible] = useState(false);

    // Refs for asynchronous event safety
    const isOpenRef = useRef(false);
    const isListeningRef = useRef(false);
    const isSpeakingRef = useRef(false);
    const isProcessingRef = useRef(false);
    const isCompletedRef = useRef(false);
    const sessionIdRef = useRef(null);
    const silenceTimerRef = useRef(null);
    const spokenTextRef = useRef('');
    const accumulatedSpeechRef = useRef('');
    const currentTtsLangRef = useRef(null);
    const selectedLangRef = useRef(selectedLang);

    // Keep refs synced
    useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
    useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
    useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
    useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
    useEffect(() => { isCompletedRef.current = isCompleted; }, [isCompleted]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { spokenTextRef.current = spokenText; }, [spokenText]);
    useEffect(() => { selectedLangRef.current = selectedLang; }, [selectedLang]);

    // Siri Dynamic Visualizer Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const siriRing1 = useRef(new Animated.Value(0)).current;
    const siriRing2 = useRef(new Animated.Value(0)).current;
    const siriRing3 = useRef(new Animated.Value(0)).current;

    // Real-time 5-Bar Siri Sound Spectrum
    const bar1 = useRef(new Animated.Value(8)).current;
    const bar2 = useRef(new Animated.Value(14)).current;
    const bar3 = useRef(new Animated.Value(22)).current;
    const bar4 = useRef(new Animated.Value(16)).current;
    const bar5 = useRef(new Animated.Value(10)).current;

    // Function refs to avoid stale closures and hook dependency churn
    const sendToVoiceEngineRef = useRef(null);
    const startListeningSessionRef = useRef(null);
    const stopListeningAndSendRef = useRef(null);
    const handleOpenRef = useRef(null);
    const handleCloseRef = useRef(null);

    // Floating Button Ambient Glow Loop
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1.0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulseAnim]);

    // Siri Multi-Ring Pulsing Animation Loop
    useEffect(() => {
        if (!isOpen) return;

        const ringAnim = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(siriRing1, {
                        toValue: 1,
                        duration: isListening ? 1400 : 2200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(siriRing1, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.delay(400),
                    Animated.timing(siriRing2, {
                        toValue: 1,
                        duration: isListening ? 1400 : 2200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(siriRing2, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.delay(800),
                    Animated.timing(siriRing3, {
                        toValue: 1,
                        duration: isListening ? 1400 : 2200,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(siriRing3, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        ringAnim.start();
        return () => ringAnim.stop();
    }, [isOpen, isListening, siriRing1, siriRing2, siriRing3]);

    // Siri 5-Bar Sound Wave Equalizer Loop (Listening / Speaking)
    useEffect(() => {
        if (!isOpen || (!isListening && !isSpeaking)) {
            Animated.parallel([
                Animated.timing(bar1, { toValue: 6, duration: 250, useNativeDriver: false }),
                Animated.timing(bar2, { toValue: 8, duration: 250, useNativeDriver: false }),
                Animated.timing(bar3, { toValue: 10, duration: 250, useNativeDriver: false }),
                Animated.timing(bar4, { toValue: 8, duration: 250, useNativeDriver: false }),
                Animated.timing(bar5, { toValue: 6, duration: 250, useNativeDriver: false }),
            ]).start();
            return;
        }

        const animateBar = (anim, min, max, duration) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: max,
                        duration,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: false,
                    }),
                    Animated.timing(anim, {
                        toValue: min,
                        duration,
                        easing: Easing.inOut(Easing.quad),
                        useNativeDriver: false,
                    }),
                ])
            );
        };

        const l1 = animateBar(bar1, 6, isListening ? 28 : 22, 280);
        const l2 = animateBar(bar2, 10, isListening ? 36 : 28, 340);
        const l3 = animateBar(bar3, 14, isListening ? 42 : 34, 260);
        const l4 = animateBar(bar4, 8, isListening ? 34 : 26, 380);
        const l5 = animateBar(bar5, 6, isListening ? 26 : 20, 310);

        l1.start();
        l2.start();
        l3.start();
        l4.start();
        l5.start();

        return () => {
            l1.stop();
            l2.stop();
            l3.stop();
            l4.stop();
            l5.stop();
        };
    }, [isOpen, isListening, isSpeaking, bar1, bar2, bar3, bar4, bar5]);

    // Clear silence detection timer
    const clearSilenceTimer = () => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    };

    // Send to Unified Endpoint: POST /api/v1/voice/process
    // Send to Unified Endpoint: POST /api/v1/voice/process
    const sendToVoiceEngine = useCallback(async (textToSend) => {
        if (!textToSend || !textToSend.trim() || isProcessingRef.current) return;

        clearSilenceTimer();
        accumulatedSpeechRef.current = '';
        const cleanText = textToSend.trim();

        // Check for explicit conversational exit intent
        const exitPhrases = ['cancel', 'band karo', 'band kardo', 'close', 'alvida', 'bye', 'stop', 'ruk jao', 'exit'];
        const lower = cleanText.toLowerCase();
        if (exitPhrases.includes(lower)) {
            setPromptMessage('Closing Voice Assistant...');
            setTimeout(() => {
                if (handleCloseRef.current) handleCloseRef.current();
            }, 600);
            return;
        }

        setIsProcessing(true);
        isProcessingRef.current = true;
        try {
            let token = userToken;
            if (!token) {
                token = await AsyncStorage.getItem('userToken');
            }

            const currentLang = selectedLangRef.current || selectedLang;
            const currentLangObj = ASSISTANT_LANGUAGES.find((l) => l.code === currentLang) || ASSISTANT_LANGUAGES[0];
            const langCode = currentLangObj?.ttsCode || currentLang.split('-')[0];
            const payload = {
                text: cleanText,
                query: cleanText,
                sessionId: sessionIdRef.current || null,
                language: currentLang,
                languageCode: langCode,
                ttsLanguage: langCode,
                userLanguage: currentLangObj?.langName || currentLang,
                lang: currentLangObj?.langName || currentLang,
            };

            const res = await processVoiceCommand(payload, token);
            const resData = res?.data || res;

            // 1. Sync draftData directly from Backend response
            if (resData?.draftData) {
                setDraftData(resData.draftData);
            }

            // 2. Step & Completion
            const step = resData?.step || null;
            const completed = Boolean(resData?.isCompleted || step === 'COMPLETED');
            setCurrentStep(step);
            setIsCompleted(completed);

            // 3. sessionId Lifecycle Management:
            if (completed || step === 'CANCELLED') {
                setSessionId(null);
                sessionIdRef.current = null;
            } else if (resData?.sessionId) {
                setSessionId(resData.sessionId);
                sessionIdRef.current = resData.sessionId;
            } else {
                setSessionId(null);
                sessionIdRef.current = null;
            }

            // 4. Missing Fields & Ambiguity Options
            if (Array.isArray(resData?.missingFields)) {
                setMissingFields(resData.missingFields);
            } else {
                setMissingFields([]);
            }

            if (Array.isArray(resData?.options)) {
                setOptions(resData.options);
            } else {
                setOptions([]);
            }

            // 5. Speak Backend promptMessage strictly via TTS using matching language
            const prompt = resData?.promptMessage || resData?.message || resData?.reply || resData?.response;
            const backendTtsLang = resData?.ttsLanguage || resData?.languageCode || null;
            if (backendTtsLang) {
                currentTtsLangRef.current = backendTtsLang;
            }
            if (prompt) {
                setPromptMessage(prompt);
            }

            const shouldListenNext = isOpenRef.current && !completed;

            if (autoSpeak && prompt) {
                const ttsLangToUse = backendTtsLang || currentTtsLangRef.current || langCode || currentLang;
                VoiceService.speak(prompt, {
                    ttsLanguage: ttsLangToUse,
                    language: ttsLangToUse,
                    onDone: () => {
                        // Auto-start mic when TTS finishes speaking backend promptMessage
                        setIsSpeaking(false);
                        isSpeakingRef.current = false;
                        if (shouldListenNext && isOpenRef.current && !isCompletedRef.current) {
                            setTimeout(() => {
                                if (isOpenRef.current && !isCompletedRef.current && !isListeningRef.current) {
                                    const activeL = selectedLangRef.current || selectedLang;
                                    if (startListeningSessionRef.current) {
                                        startListeningSessionRef.current(activeL);
                                    }
                                }
                            }, 350);
                        }
                    },
                });
            } else if (shouldListenNext && isOpenRef.current) {
                setTimeout(() => {
                    if (isOpenRef.current && !isCompletedRef.current && !isListeningRef.current) {
                        const activeL = selectedLangRef.current || selectedLang;
                        if (startListeningSessionRef.current) startListeningSessionRef.current(activeL);
                    }
                }, 300);
            }

            // If action navigation requested by intent
            if (resData?.navigateTo && onNavigate) {
                setTimeout(() => {
                    if (handleCloseRef.current) handleCloseRef.current();
                    onNavigate(resData.navigateTo, resData.routeData || {});
                }, 2500);
            }
        } catch (err) {
            console.warn('Voice process error:', err.message || err);
            const currentLang = selectedLangRef.current || selectedLang;
            const currentLangObj = ASSISTANT_LANGUAGES.find((l) => l.code === currentLang) || ASSISTANT_LANGUAGES[0];
            const errMsg = currentLang.startsWith('mr')
                ? 'कृपया पुन्हा बोला, मी ऐकत आहे.'
                : currentLang.startsWith('gu')
                    ? 'કૃપા કરીને ફરીથી બોલો, હું સાંભળી રહ્યો છું.'
                    : currentLang.startsWith('ta')
                        ? 'தயவுசெய்து மீண்டும் பேசுங்கள், நான் கேட்கிறேன்.'
                        : currentLang.startsWith('te')
                            ? 'దయచేసి మళ్లీ మాట్లాడండి, నేను వింటున్నాను.'
                            : currentLang.startsWith('bn')
                                ? 'অনুগ্রহ করে আবার বলুন, আমি শুনছি।'
                                : currentLang.startsWith('pa')
                                    ? 'ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਬੋਲੋ, ਮੈਂ ਸੁਣ ਰਿਹਾ ਹਾਂ।'
                                    : currentLang.startsWith('kn')
                                        ? 'ದಯವಿಟ್ಟು ಮತ್ತೆ ಮಾತನಾಡಿ, ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ.'
                                        : currentLang.startsWith('hi')
                                            ? 'कृपया दोबारा बोलिए, मैं सुन रहा हूँ।'
                                            : 'Please speak again, I am listening.';

            setPromptMessage(errMsg);
            if (autoSpeak) {
                const errLang = currentLangObj?.ttsCode || currentLang;
                VoiceService.speak(errMsg, {
                    ttsLanguage: errLang,
                    language: currentLang,
                    onDone: () => {
                        setIsSpeaking(false);
                        isSpeakingRef.current = false;
                        if (isOpenRef.current && !isCompletedRef.current) {
                            setTimeout(() => {
                                if (isOpenRef.current && !isCompletedRef.current && !isListeningRef.current) {
                                    const activeL = selectedLangRef.current || selectedLang;
                                    if (startListeningSessionRef.current) startListeningSessionRef.current(activeL);
                                }
                            }, 350);
                        }
                    },
                });
            } else {
                setTimeout(() => {
                    if (isOpenRef.current && !isCompletedRef.current && !isListeningRef.current) {
                        const activeL = selectedLangRef.current || selectedLang;
                        if (startListeningSessionRef.current) startListeningSessionRef.current(activeL);
                    }
                }, 300);
            }
        } finally {
            setIsProcessing(false);
            isProcessingRef.current = false;
        }
    }, [autoSpeak, onNavigate, selectedLang, userToken]);

    sendToVoiceEngineRef.current = sendToVoiceEngine;

    // Stop listening and immediately send
    const stopListeningAndSend = useCallback(async (textToSend) => {
        clearSilenceTimer();
        if (isProcessingRef.current) return;
        setIsListening(false);
        isListeningRef.current = false;
        await VoiceService.stopListening();
        const finalTxt = textToSend || spokenTextRef.current;
        if (finalTxt && finalTxt.trim().length > 0 && sendToVoiceEngineRef.current) {
            await sendToVoiceEngineRef.current(finalTxt.trim());
        }
    }, []);

    stopListeningAndSendRef.current = stopListeningAndSend;

    // Start Speech Recognition Session
    const startListeningSession = useCallback(async (overrideLang) => {
        if (!isOpenRef.current || isProcessingRef.current || isSpeakingRef.current) return;

        clearSilenceTimer();
        setIsListening(true);
        isListeningRef.current = true;

        const langToUse = overrideLang || selectedLangRef.current || selectedLang || 'mr-IN';

        try {
            await VoiceService.startListening(
                {
                    onStart: () => {
                        setIsListening(true);
                        isListeningRef.current = true;
                    },
                    onVolumeChanged: (vol) => {
                        if (!isOpenRef.current) return;
                        const v = Math.max(0, Number(vol) || 0);
                        const scale = Math.min(v / 8, 1);
                        Animated.parallel([
                            Animated.timing(bar1, { toValue: 6 + scale * 26, duration: 90, useNativeDriver: false }),
                            Animated.timing(bar2, { toValue: 10 + scale * 36, duration: 90, useNativeDriver: false }),
                            Animated.timing(bar3, { toValue: 14 + scale * 46, duration: 90, useNativeDriver: false }),
                            Animated.timing(bar4, { toValue: 8 + scale * 34, duration: 90, useNativeDriver: false }),
                            Animated.timing(bar5, { toValue: 6 + scale * 24, duration: 90, useNativeDriver: false }),
                        ]).start();
                    },
                    onPartialResults: (text) => {
                        if (text && text.trim().length > 0) {
                            const current = text.trim();
                            setSpokenText(current);
                            spokenTextRef.current = current;

                            // Fallback timer in case onResults does not fire
                            clearSilenceTimer();
                            silenceTimerRef.current = setTimeout(() => {
                                if (spokenTextRef.current && spokenTextRef.current.trim().length > 0) {
                                    if (stopListeningAndSendRef.current) {
                                        stopListeningAndSendRef.current(spokenTextRef.current.trim());
                                    }
                                }
                            }, 2000);
                        }
                    },
                    onResults: (finalText) => {
                        clearSilenceTimer();
                        const chunk = (finalText || spokenTextRef.current || '').trim();
                        if (!chunk) return;

                        setSpokenText(chunk);
                        spokenTextRef.current = chunk;

                        // Check if user is speaking a phone number with mid-sentence pauses
                        const digitsOnly = chunk.replace(/[^0-9]/g, '');
                        const isIncompletePhone = digitsOnly.length > 0 && digitsOnly.length < 10;

                        // Snappy 700ms response time for complete sentences (or 2500ms for phone numbers)
                        const delayMs = isIncompletePhone ? 2500 : 700;

                        silenceTimerRef.current = setTimeout(() => {
                            if (spokenTextRef.current && spokenTextRef.current.trim().length > 0) {
                                if (stopListeningAndSendRef.current) {
                                    stopListeningAndSendRef.current(spokenTextRef.current.trim());
                                }
                            }
                        }, delayMs);
                    },
                    onError: (err, isTimeout, codeStr) => {
                        clearSilenceTimer();

                        // If it's a silence timeout / natural pause, continue listening seamlessly
                        if (
                            isTimeout &&
                            isOpenRef.current &&
                            !isProcessingRef.current &&
                            !isSpeakingRef.current &&
                            !isCompletedRef.current
                        ) {
                            setTimeout(() => {
                                if (
                                    isOpenRef.current &&
                                    !isProcessingRef.current &&
                                    !isSpeakingRef.current &&
                                    !isCompletedRef.current &&
                                    !isListeningRef.current
                                ) {
                                    const activeL = selectedLangRef.current || selectedLang;
                                    if (startListeningSessionRef.current) {
                                        startListeningSessionRef.current(activeL);
                                    }
                                }
                            }, 350);
                            return;
                        }

                        setIsListening(false);
                        isListeningRef.current = false;
                        if (codeStr === '9' || String(err?.message || '').toLowerCase().includes('permission')) {
                            setPromptMessage('Microphone permission required. Please allow mic access.');
                        }
                    },
                },
                langToUse
            );
        } catch (e) {
            console.warn('startListeningSession error:', e);
            setIsListening(false);
            isListeningRef.current = false;
        }
    }, [bar1, bar2, bar3, bar4, bar5, selectedLang]);

    startListeningSessionRef.current = startListeningSession;

    // Intercept Hardware Back Press on Android to close modal instead of exiting the entire app
    useEffect(() => {
        if (!isOpen) return;
        const backAction = () => {
            if (handleCloseRef.current) {
                handleCloseRef.current();
            }
            return true; // Handled: Prevents root App from exiting
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [isOpen]);

    // Open Modal & immediately start listening
    const handleOpen = useCallback(() => {
        setIsOpen(true);
        isOpenRef.current = true;
        setSessionId(null);
        sessionIdRef.current = null;
        setSpokenText('');
        spokenTextRef.current = '';
        accumulatedSpeechRef.current = '';
        setPromptMessage('');
        setCurrentStep(null);
        setDraftData(null);
        setMissingFields([]);
        setOptions([]);
        setIsCompleted(false);

        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (startListeningSessionRef.current) startListeningSessionRef.current(selectedLang);
        });
    }, [fadeAnim, slideAnim, selectedLang]);

    handleOpenRef.current = handleOpen;

    // Close Modal
    const handleClose = useCallback(async () => {
        clearSilenceTimer();
        isOpenRef.current = false;
        await VoiceService.cancelListening();
        await VoiceService.stopSpeaking();
        setIsListening(false);
        setIsSpeaking(false);

        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 400,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsOpen(false);
            setSessionId(null);
            sessionIdRef.current = null;
        });
    }, [fadeAnim, slideAnim]);

    handleCloseRef.current = handleClose;

    // Global TTS & Event Listeners
    useEffect(() => {
        VoiceService.initTts();

        const unsubStart = VoiceService.on('tts-start', () => {
            setIsSpeaking(true);
            clearSilenceTimer();
        });

        const unsubFinish = VoiceService.on('tts-finish', () => {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
        });

        const unsubCancel = VoiceService.on('tts-cancel', () => {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
        });

        const unsubOpen = VoiceService.on('open-voice-modal', () => {
            if (handleOpenRef.current) handleOpenRef.current();
        });

        return () => {
            unsubStart();
            unsubFinish();
            unsubCancel();
            unsubOpen();
            clearSilenceTimer();
        };
    }, []);

    // Load saved assistant language preference
    useEffect(() => {
        const loadSavedLanguage = async () => {
            try {
                const saved = await AsyncStorage.getItem('pravisti_assistant_language');
                if (saved) {
                    setSelectedLang(saved);
                    const matched = ASSISTANT_LANGUAGES.find((l) => l.code === saved);
                    if (matched) {
                        currentTtsLangRef.current = matched.ttsCode;
                    }
                }
            } catch (e) {
                console.warn('Error loading assistant language:', e);
            }
        };
        loadSavedLanguage();
    }, []);

    // Switch Language and dynamically apply TTS & STT without speaking hardcoded greeting
    const handleSelectLanguage = async (langItem) => {
        setLangModalVisible(false);
        setSelectedLang(langItem.code);
        currentTtsLangRef.current = langItem.ttsCode;
        await AsyncStorage.setItem('pravisti_assistant_language', langItem.code);

        // Apply dynamic TTS language to VoiceService
        await VoiceService.applyDynamicTtsLanguage(langItem.code);

        setPromptMessage('');
        if (isOpenRef.current && !isCompletedRef.current) {
            if (startListeningSessionRef.current) {
                startListeningSessionRef.current(langItem.code);
            }
        }
    };

    // Reset Session to Start Fresh Query
    const handleResetSession = () => {
        clearSilenceTimer();
        setSessionId(null);
        sessionIdRef.current = null;
        setCurrentStep(null);
        setDraftData(null);
        setMissingFields([]);
        setOptions([]);
        setIsCompleted(false);
        setSpokenText('');
        spokenTextRef.current = '';
        accumulatedSpeechRef.current = '';
        setPromptMessage('');
        startListeningSession(selectedLang);
    };

    // Manual Confirmation trigger (Confirm / Yes)
    const handleConfirm = async () => {
        await sendToVoiceEngine('Haan confirm karo');
    };

    // Manual Cancellation trigger (Cancel / No)
    const handleCancel = async () => {
        await sendToVoiceEngine('Nahi cancel kar do');
    };

    // Option select trigger
    const handleSelectOption = async (option) => {
        const label = option.label || option.name || option.title || String(option);
        setSpokenText(label);
        await sendToVoiceEngine(label);
    };

    return (
        <>
            {/* ─── 1. SIRI-STYLE FLOATING GLOWING TRIGGER ─── */}
            {!isOpen && (
                <Animated.View
                    style={[
                        styles.floatingContainer,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    {/* Ambient Outer Halo */}
                    <View style={styles.floatingHalo} />

                    <TouchableOpacity
                        style={styles.floatingButton}
                        onPress={handleOpen}
                        activeOpacity={0.88}
                    >
                        <View style={styles.floatingInnerGlow} />
                        <View style={styles.floatingIconBox}>
                            <Mic size={26} color="#FFFFFF" />
                        </View>
                        <View style={styles.floatingBadge}>
                            <Sparkles size={11} color="#0B2265" />
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* ─── 2. SIRI INTELLIGENCE OVERLAY MODAL ─── */}
            <Modal
                visible={isOpen}
                transparent
                animationType="none"
                onRequestClose={handleClose}
            >
                <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]}>
                    <TouchableOpacity
                        style={styles.backdropTouch}
                        activeOpacity={1}
                        onPress={handleClose}
                    />

                    <Animated.View
                        style={[
                            styles.modalSheet,
                            { transform: [{ translateY: slideAnim }] },
                        ]}
                    >
                        {/* Top Indicator Drag Bar */}
                        <View style={styles.dragBarContainer}>
                            <View style={styles.dragBar} />
                        </View>

                        {/* Sheet Header */}
                        <View style={styles.sheetHeader}>
                            <View style={styles.headerLeft}>
                                <View style={styles.assistantAvatar}>
                                    <Hand size={18} color="#e2c627ff" />
                                </View>
                                <View>
                                    <Text style={styles.headerTitle}>Hii Pravisti</Text>
                                    <View style={styles.statusRow}>
                                        <View
                                            style={[
                                                styles.statusDot,
                                                isListening
                                                    ? styles.statusDotListening
                                                    : isProcessing
                                                        ? styles.statusDotProcessing
                                                        : isSpeaking
                                                            ? styles.statusDotSpeaking
                                                            : styles.statusDotIdle,
                                            ]}
                                        />
                                        <Text style={styles.headerSubtitle}>
                                            {isListening
                                                ? 'Listening...'
                                                : isProcessing
                                                    ? 'Thinking...'
                                                    : isSpeaking
                                                        ? 'Speaking...'
                                                        : 'Ready'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.headerActions}>
                                {/* Language Capsule Pill */}
                                <TouchableOpacity
                                    style={styles.langPill}
                                    onPress={() => setLangModalVisible(true)}
                                    activeOpacity={0.75}
                                >
                                    <Globe size={13} color="#0284C7" />
                                    <Text style={styles.langPillText}>
                                        {ASSISTANT_LANGUAGES.find((l) => l.code === (selectedLangRef.current || selectedLang))?.shortName || 'Hinglish'}
                                    </Text>
                                    <ChevronDown size={12} color="#64748B" />
                                </TouchableOpacity>

                                {/* Speaker Toggle */}
                                <TouchableOpacity
                                    style={styles.headerIconBtn}
                                    onPress={() => {
                                        if (isSpeaking) VoiceService.stopSpeaking();
                                        setAutoSpeak(!autoSpeak);
                                    }}
                                    activeOpacity={0.75}
                                >
                                    {autoSpeak ? (
                                        <Volume2 size={16} color="#0284C7" />
                                    ) : (
                                        <VolumeX size={16} color="#94A3B8" />
                                    )}
                                </TouchableOpacity>

                                {/* Restart Session */}
                                <TouchableOpacity
                                    style={styles.headerIconBtn}
                                    onPress={handleResetSession}
                                    activeOpacity={0.75}
                                >
                                    <RotateCcw size={15} color="#64748B" />
                                </TouchableOpacity>

                                {/* Preferences */}
                                {onOpenPreferences && (
                                    <TouchableOpacity
                                        style={styles.headerIconBtn}
                                        onPress={() => {
                                            handleClose();
                                            onOpenPreferences();
                                        }}
                                        activeOpacity={0.75}
                                    >
                                        <Sliders size={15} color="#64748B" />
                                    </TouchableOpacity>
                                )}

                                {/* Close */}
                                <TouchableOpacity
                                    style={styles.headerCloseBtn}
                                    onPress={handleClose}
                                    activeOpacity={0.75}
                                >
                                    <X size={17} color="#475569" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView
                            style={styles.sheetBody}
                            contentContainerStyle={styles.sheetBodyContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* ─── 3. GLOWING SIRI ORB & SOUND SPECTRUM VISUALIZER ─── */}
                            <View style={styles.siriOrbSection}>
                                <View style={styles.siriOrbContainer}>
                                    {/* Concentric Ambient Gradient Rings */}
                                    <Animated.View
                                        style={[
                                            styles.siriRing,
                                            styles.siriRing1,
                                            {
                                                transform: [
                                                    {
                                                        scale: siriRing1.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 2.3],
                                                        }),
                                                    },
                                                ],
                                                opacity: siriRing1.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [0.6, 0.3, 0],
                                                }),
                                            },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.siriRing,
                                            styles.siriRing2,
                                            {
                                                transform: [
                                                    {
                                                        scale: siriRing2.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 1.8],
                                                        }),
                                                    },
                                                ],
                                                opacity: siriRing2.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [0.5, 0.25, 0],
                                                }),
                                            },
                                        ]}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.siriRing,
                                            styles.siriRing3,
                                            {
                                                transform: [
                                                    {
                                                        scale: siriRing3.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [1, 1.4],
                                                        }),
                                                    },
                                                ],
                                                opacity: siriRing3.interpolate({
                                                    inputRange: [0, 0.5, 1],
                                                    outputRange: [0.4, 0.15, 0],
                                                }),
                                            },
                                        ]}
                                    />

                                    {/* Center Interactive Siri Orb Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.siriCoreOrb,
                                            isListening
                                                ? styles.siriCoreOrbListening
                                                : isSpeaking
                                                    ? styles.siriCoreOrbSpeaking
                                                    : isProcessing
                                                        ? styles.siriCoreOrbProcessing
                                                        : styles.siriCoreOrbIdle,
                                        ]}
                                        onPress={() => {
                                            if (isSpeaking) {
                                                VoiceService.stopSpeaking();
                                                startListeningSession();
                                            } else if (isListening) {
                                                stopListeningAndSend();
                                            } else {
                                                startListeningSession();
                                            }
                                        }}
                                        activeOpacity={0.88}
                                    >
                                        {/* Inner Fluid Specular Highlight */}
                                        <View style={styles.siriOrbInnerShimmer} />

                                        {isProcessing ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : isListening ? (
                                            <MicOff size={30} color="#FFFFFF" />
                                        ) : isSpeaking ? (
                                            <Volume2 size={30} color="#FFFFFF" />
                                        ) : (
                                            <Mic size={30} color="#FFFFFF" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Real-time Siri Sound Wave Equalizer */}
                                <View style={styles.siriSpectrumRow}>
                                    <Animated.View style={[styles.spectrumBar, styles.barCyan, { height: bar1 }]} />
                                    <Animated.View style={[styles.spectrumBar, styles.barViolet, { height: bar2 }]} />
                                    <Animated.View style={[styles.spectrumBar, styles.barPink, { height: bar3 }]} />
                                    <Animated.View style={[styles.spectrumBar, styles.barBlue, { height: bar4 }]} />
                                    <Animated.View style={[styles.spectrumBar, styles.barEmerald, { height: bar5 }]} />
                                </View>

                                <Text style={styles.siriStatusText}>
                                    {isListening
                                        ? 'Listening, please speak...'
                                        : isProcessing
                                            ? 'Processing with AI...'
                                            : isSpeaking
                                                ? 'Speaking...'
                                                : 'Tap orb to start speaking'}
                                </Text>
                            </View>

                            {/* ─── 4. LIVE STREAMING SPOKEN TEXT CARD ─── */}
                            {spokenText ? (
                                <View style={styles.spokenPreviewBox}>
                                    <View style={styles.spokenHeaderRow}>
                                        <View style={styles.spokenLiveBadge}>
                                            <View style={styles.spokenLiveDot} />
                                            <Text style={styles.spokenLiveText}>You</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.spokenPreviewText}>"{spokenText}"</Text>
                                </View>
                            ) : null}

                            {/* ─── 5. ASSISTANT PROMPT MESSAGE CARD ─── */}
                            {promptMessage ? (
                                <View
                                    style={[
                                        styles.promptCard,
                                        isCompleted ? styles.promptCardSuccess : null,
                                        currentStep === 'CANCELLED' ? styles.promptCardDanger : null,
                                    ]}
                                >
                                    <View style={styles.promptHeader}>
                                        <View style={styles.promptBadgeRow}>
                                            {isCompleted ? (
                                                <CheckCircle2 size={16} color="#059669" />
                                            ) : currentStep === 'CANCELLED' ? (
                                                <XCircle size={16} color="#DC2626" />
                                            ) : (
                                                <Sparkles size={15} color="#0284C7" />
                                            )}
                                            <Text style={styles.promptLabel}>
                                                {isCompleted
                                                    ? 'Sauda Confirmed'
                                                    : currentStep === 'CANCELLED'
                                                        ? 'Cancelled'
                                                        : 'Pravisti AI'}
                                            </Text>
                                        </View>

                                        {isSpeaking ? (
                                            <View style={styles.speakingBadge}>
                                                <ActivityIndicator size={10} color="#0284C7" />
                                                <Text style={styles.speakingBadgeText}>Speaking</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.replayPill}
                                                onPress={() => {
                                                    const activeLang = selectedLangRef.current || selectedLang;
                                                    const activeLangObj = ASSISTANT_LANGUAGES.find((l) => l.code === activeLang) || ASSISTANT_LANGUAGES[0];
                                                    const ttsLangToUse = currentTtsLangRef.current || activeLangObj?.ttsCode || activeLang;
                                                    VoiceService.speak(promptMessage, {
                                                        ttsLanguage: ttsLangToUse,
                                                        language: ttsLangToUse,
                                                    });
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Volume2 size={13} color="#0284C7" />
                                                <Text style={styles.replayPillText}>Listen</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.promptMessageText}>{promptMessage}</Text>
                                </View>
                            ) : null}

                            {/* ─── 6. LIVE DRAFT HUD CARD (STEP: COLLECTING_DETAILS) ─── */}
                            {draftData && (
                                <View style={styles.draftCard}>
                                    <View style={styles.draftHeader}>
                                        <View style={styles.draftHeaderLeft}>
                                            <View style={styles.draftLiveIndicator} />
                                            <Text style={styles.draftTitle}>Live Sauda Draft</Text>
                                        </View>
                                        {sessionId && (
                                            <View style={styles.sessionBadgeBox}>
                                                <Text style={styles.sessionBadge}>
                                                    {sessionId.slice(0, 10)}...
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.draftGrid}>
                                        {/* Company Name */}
                                        {draftData.targetCompanyName ? (
                                            <View style={styles.draftRow}>
                                                <View style={styles.draftIconCircle}>
                                                    <Building2 size={14} color="#0284C7" />
                                                </View>
                                                <Text style={styles.draftFieldLabel}>Company:</Text>
                                                <Text style={styles.draftFieldVal} numberOfLines={1}>
                                                    {draftData.targetCompanyName}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {/* Product / Commodity */}
                                        {draftData.productName || draftData.commodity || draftData.crop ? (
                                            <View style={styles.draftRow}>
                                                <View style={styles.draftIconCircle}>
                                                    <Package size={14} color="#0284C7" />
                                                </View>
                                                <Text style={styles.draftFieldLabel}>Product:</Text>
                                                <Text style={styles.draftFieldVal} numberOfLines={1}>
                                                    {draftData.productName || draftData.commodity || draftData.crop}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {/* Quantity */}
                                        {draftData.quantity ? (
                                            <View style={styles.draftRow}>
                                                <View style={styles.draftIconCircle}>
                                                    <Layers size={14} color="#0284C7" />
                                                </View>
                                                <Text style={styles.draftFieldLabel}>Quantity:</Text>
                                                <Text style={styles.draftFieldVal}>
                                                    {draftData.quantity} {draftData.unit || 'bag'}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {/* Rate / Price */}
                                        {draftData.price || draftData.rate ? (
                                            <View style={styles.draftRow}>
                                                <View style={styles.draftIconCircle}>
                                                    <IndianRupee size={14} color="#0284C7" />
                                                </View>
                                                <Text style={styles.draftFieldLabel}>Rate / Price:</Text>
                                                <Text style={styles.draftFieldVal}>
                                                    ₹{draftData.price || draftData.rate} {draftData.rateUnit ? `/${draftData.rateUnit}` : ''}
                                                </Text>
                                            </View>
                                        ) : null}

                                        {/* Total Amount */}
                                        {draftData.subtotal || draftData.totalAmount ? (
                                            <View style={[styles.draftRow, styles.totalRow]}>
                                                <View style={[styles.draftIconCircle, { backgroundColor: '#ECFDF5' }]}>
                                                    <IndianRupee size={15} color="#059669" />
                                                </View>
                                                <Text style={styles.totalLabel}>Total Amount:</Text>
                                                <Text style={styles.totalVal}>
                                                    ₹{Number(draftData.subtotal || draftData.totalAmount).toLocaleString('en-IN')}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>

                                    {/* Missing Fields Indicators */}
                                    {missingFields.length > 0 && (
                                        <View style={styles.missingBox}>
                                            <AlertCircle size={13} color="#D97706" />
                                            <Text style={styles.missingLabel}>Required:</Text>
                                            {missingFields.map((f, i) => (
                                                <View key={i} style={styles.missingTag}>
                                                    <Text style={styles.missingTagText}>{f}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* ─── 7. MULTI-OPTION AMBIGUITY SELECTOR ─── */}
                            {options.length > 0 && (
                                <View style={styles.optionsSection}>
                                    <Text style={styles.optionsTitle}>Select Company / Option</Text>
                                    <View style={styles.optionsList}>
                                        {options.map((opt, index) => (
                                            <TouchableOpacity
                                                key={opt.id || index}
                                                style={styles.optionPill}
                                                onPress={() => handleSelectOption(opt)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={styles.optionPillText}>
                                                    {opt.label || opt.name || opt.title}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* ─── 8. CONFIRMATION ACTIONS (STEP: REVIEW_PENDING) ─── */}
                            {currentStep === 'REVIEW_PENDING' && (
                                <View style={styles.reviewActionsBox}>
                                    <TouchableOpacity
                                        style={styles.confirmBtn}
                                        onPress={handleConfirm}
                                        activeOpacity={0.85}
                                    >
                                        <CheckCircle2 size={18} color="#FFFFFF" />
                                        <Text style={styles.confirmBtnText}>Confirm Deal</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={handleCancel}
                                        activeOpacity={0.85}
                                    >
                                        <XCircle size={18} color="#EF4444" />
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* ─── 9. COMPLETED SUCCESS BUTTON ─── */}
                            {isCompleted && (
                                <TouchableOpacity
                                    style={styles.doneBtn}
                                    onPress={handleClose}
                                    activeOpacity={0.85}
                                >
                                    <CheckCircle2 size={18} color="#FFFFFF" />
                                    <Text style={styles.doneBtnText}>Complete & Done</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </Animated.View>
                </Animated.View>
            </Modal>

            {/* ─── LANGUAGE SELECTION MODAL ─── */}
            <Modal
                visible={langModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setLangModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.langModalBackdrop}
                    activeOpacity={1}
                    onPress={() => setLangModalVisible(false)}
                >
                    <View style={styles.langModalContent} onStartShouldSetResponder={() => true}>
                        <View style={styles.langModalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Globe size={18} color="#0B2265" />
                                <Text style={styles.langModalTitle}>Select Voice Language</Text>
                            </View>
                            <TouchableOpacity onPress={() => setLangModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <X size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.langModalSubtitle}>
                            Voice Assistant will speak & listen in your chosen regional language.
                        </Text>

                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            {ASSISTANT_LANGUAGES.map((item) => {
                                const isSelected = selectedLang === item.code;
                                return (
                                    <TouchableOpacity
                                        key={item.code}
                                        style={[
                                            styles.langOptionItem,
                                            isSelected ? styles.langOptionItemSelected : null,
                                        ]}
                                        onPress={() => handleSelectLanguage(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.langFlagCircle}>
                                            <Text style={{ fontSize: 18 }}>{item.flag}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.langOptionLabel,
                                                    isSelected ? styles.langOptionLabelSelected : null,
                                                ]}
                                            >
                                                {item.label}
                                            </Text>
                                        </View>
                                        {isSelected && (
                                            <View style={styles.langSelectedCheck}>
                                                <Check size={13} color="#FFFFFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    // ─── 1. Floating Action Button ───
    floatingContainer: {
        position: 'absolute',
        bottom: 92,
        right: 18,
        zIndex: 99999,
        elevation: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingHalo: {
        position: 'absolute',
        width: 74,
        height: 74,
        borderRadius: 37,
        backgroundColor: 'rgba(2, 132, 199, 0.22)',
    },
    floatingButton: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#0B2265',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0B2265',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 12,
        borderWidth: 2.5,
        borderColor: '#38BDF8',
    },
    floatingInnerGlow: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(56, 189, 248, 0.25)',
    },
    floatingIconBox: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#F59E0B',
        borderRadius: 9,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },

    // ─── 2. Siri Theme Modal Backdrop & Sheet ───
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    backdropTouch: {
        flex: 1,
    },
    modalSheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 34,
        borderTopRightRadius: 34,
        maxHeight: '90%',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 24,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    dragBarContainer: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    dragBar: {
        width: 44,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#CBD5E1',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    assistantAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#0B2265',
        letterSpacing: 0.2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    statusDotListening: {
        backgroundColor: '#0284C7',
        shadowColor: '#0284C7',
        shadowRadius: 6,
        shadowOpacity: 0.8,
    },
    statusDotProcessing: {
        backgroundColor: '#D97706',
    },
    statusDotSpeaking: {
        backgroundColor: '#059669',
    },
    statusDotIdle: {
        backgroundColor: '#94A3B8',
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
    },
    langPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 4,
    },
    langPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0B2265',
    },
    headerIconBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    headerCloseBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ─── Company Context Bar ───
    companyContextBar: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 4,
    },
    companyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    companyPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0B2265',
        maxWidth: 220,
    },
    noCompanyWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    noCompanyWarningText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#92400E',
    },
    companyDropdown: {
        marginHorizontal: 20,
        marginBottom: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        gap: 6,
    },
    dropdownTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 7,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    dropdownItemActive: {
        backgroundColor: '#EFF6FF',
    },
    dropdownItemText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        flex: 1,
    },
    dropdownItemTextActive: {
        color: '#0B2265',
        fontWeight: '800',
    },

    sheetBody: {
        maxHeight: 560,
    },
    sheetBodyContent: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 24,
        gap: 12,
    },

    // ─── 3. Siri Glowing Orb Visualizer ───
    siriOrbSection: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
    },
    siriOrbContainer: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    siriRing: {
        position: 'absolute',
        width: 82,
        height: 82,
        borderRadius: 41,
    },
    siriRing1: {
        backgroundColor: 'rgba(2, 132, 199, 0.35)', // Sky Cyan Aura
    },
    siriRing2: {
        backgroundColor: 'rgba(124, 58, 237, 0.28)', // Indigo Aura
    },
    siriRing3: {
        backgroundColor: 'rgba(236, 72, 153, 0.22)', // Pink Aura
    },
    siriCoreOrb: {
        width: 78,
        height: 78,
        borderRadius: 39,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        elevation: 12,
    },
    siriCoreOrbListening: {
        backgroundColor: '#0284C7',
        shadowColor: '#0284C7',
        shadowRadius: 20,
        shadowOpacity: 0.65,
        borderWidth: 2.5,
        borderColor: '#38BDF8',
    },
    siriCoreOrbSpeaking: {
        backgroundColor: '#059669',
        shadowColor: '#059669',
        shadowRadius: 20,
        shadowOpacity: 0.65,
        borderWidth: 2.5,
        borderColor: '#34D399',
    },
    siriCoreOrbProcessing: {
        backgroundColor: '#D97706',
        shadowColor: '#D97706',
        shadowRadius: 20,
        shadowOpacity: 0.65,
        borderWidth: 2.5,
        borderColor: '#FCD34D',
    },
    siriCoreOrbIdle: {
        backgroundColor: '#0B2265',
        shadowColor: '#0B2265',
        shadowRadius: 14,
        shadowOpacity: 0.45,
        borderWidth: 2,
        borderColor: '#38BDF8',
    },
    siriOrbInnerShimmer: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
    },

    // ─── Sound Spectrum Waves ───
    siriSpectrumRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        marginTop: 6,
    },
    spectrumBar: {
        width: 5,
        borderRadius: 3,
    },
    barCyan: { backgroundColor: '#0284C7' },
    barViolet: { backgroundColor: '#7C3AED' },
    barPink: { backgroundColor: '#EC4899' },
    barBlue: { backgroundColor: '#2563EB' },
    barEmerald: { backgroundColor: '#059669' },

    siriStatusText: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
        textAlign: 'center',
    },

    // ─── 4. Live Streaming Spoken Text Card ───
    spokenPreviewBox: {
        backgroundColor: '#F0F9FF',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1.5,
        borderColor: '#BAE6FD',
        shadowColor: '#0284C7',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
        gap: 4,
    },
    spokenHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spokenLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    spokenLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0284C7',
    },
    spokenLiveText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#0284C7',
        textTransform: 'uppercase',
    },
    spokenPreviewText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0B2265',
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 0.2,
    },

    // ─── 5. Assistant Prompt Message Card ───
    promptCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        gap: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    promptCardSuccess: {
        backgroundColor: '#F0FDF4',
        borderColor: '#BBF7D0',
    },
    promptCardDanger: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    promptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    promptBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    promptLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0B2265',
    },
    speakingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    speakingBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#0284C7',
    },
    replayPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    replayPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#0284C7',
    },
    promptMessageText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
        lineHeight: 21,
    },

    // ─── 6. Live Sauda Draft HUD Card ───
    draftCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#0B2265',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        gap: 10,
    },
    draftHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 8,
    },
    draftHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    draftLiveIndicator: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#0284C7',
    },
    draftTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0B2265',
    },
    sessionBadgeBox: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    sessionBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748B',
    },
    draftGrid: {
        gap: 7,
    },
    draftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    draftIconCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    draftFieldLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        width: 80,
    },
    draftFieldVal: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    totalLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: '#059669',
        width: 90,
    },
    totalVal: {
        fontSize: 15,
        fontWeight: '900',
        color: '#059669',
        flex: 1,
    },
    missingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        backgroundColor: '#FEF3C7',
        padding: 8,
        borderRadius: 10,
        marginTop: 4,
    },
    missingLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#92400E',
    },
    missingTag: {
        backgroundColor: '#FDE68A',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    missingTagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#78350F',
    },

    // ─── 7. Options Selector ───
    optionsSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    optionsTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
    },
    optionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    optionPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0B2265',
    },

    // ─── 8. Review Actions ───
    reviewActionsBox: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 4,
    },
    confirmBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#059669',
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    cancelBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEF2F2',
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#FECACA',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#EF4444',
    },

    // ─── 9. Completed Done Button ───
    doneBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#059669',
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 4,
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    doneBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },

    // ─── 10. Language Selection Modal Styles ───
    langModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    langModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        width: '100%',
        maxWidth: 380,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 25,
    },
    langModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    langModalTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0B2265',
    },
    langModalSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 16,
        lineHeight: 16,
    },
    langOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: '#F8FAFC',
        marginBottom: 8,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    langOptionItemSelected: {
        backgroundColor: '#EFF6FF',
        borderColor: '#0284C7',
    },
    langFlagCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    langOptionLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    langOptionLabelSelected: {
        color: '#0284C7',
        fontWeight: '800',
    },
    langSelectedCheck: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#0284C7',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
