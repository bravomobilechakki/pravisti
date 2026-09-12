import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  ShoppingBag,
  Building2,
  CreditCard,
  ArrowUpRight,
} from 'lucide-react-native';
import { sendBotMessage, clearBotAction } from '../../services/api';

const THEME = '#2327D8';

const AIBotScreen = ({ onNavigate, routeData }) => {
  const activeCompany = routeData?.company || null;
  const companyId = routeData?.companyId || activeCompany?._id || activeCompany?.id || null;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState('en');

  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollViewRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 150);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      scrollToBottom();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const quickPrompts = [
    {
      id: 'create_company',
      title: 'Register a new company',
      text: 'Help me register and add a new company',
      icon: Building2,
      color: '#0284C7',
      bg: '#F0F9FF',
    },
    {
      id: 'create_deal',
      title: 'Create a new trade deal',
      text: 'I want to create a new deal',
      icon: FileText,
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      id: 'check_saudas',
      title: 'Check active saudas & orders',
      text: 'Show my active saudas and deals',
      icon: ShoppingBag,
      color: '#059669',
      bg: '#ECFDF5',
    },
    {
      id: 'record_payment',
      title: 'Record a deal payment in khata',
      text: 'Help me record a payment for a deal',
      icon: CreditCard,
      color: '#D97706',
      bg: '#FFFBEB',
    },
  ];

  const handleSend = useCallback(async (customMessage = null) => {
    const textToSend = (customMessage || inputText).trim();
    if (!textToSend || isLoading) return;

    setInputText('');
    const tempUserMsg = {
      _id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);
    scrollToBottom();

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await sendBotMessage(
        {
          message: textToSend,
          conversationId,
          companyId,
        },
        token
      );

      if (response && response.success && response.data) {
        const { conversation, botMessage } = response.data;
        if (conversation?.id) {
          setConversationId(conversation.id);
        }
        if (conversation?.activeAction) {
          setActiveAction(conversation.activeAction);
        }
        if (botMessage?.metadata?.detectedLanguage) {
          setDetectedLanguage(botMessage.metadata.detectedLanguage);
        }

        if (botMessage) {
          setMessages((prev) => [...prev, botMessage]);
        }
      } else {
        const errorMsg = response?.message || 'Could not process message. Please try again.';
        setMessages((prev) => [
          ...prev,
          {
            _id: `bot_err_${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ ${errorMsg}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Error in bot chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          _id: `bot_err_${Date.now()}`,
          sender: 'assistant',
          text: '⚠️ Network connection issue. Please check your internet and try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [inputText, isLoading, conversationId, companyId]);

  const handleClearAction = async () => {
    if (!conversationId) {
      setActiveAction(null);
      return;
    }
    try {
      await clearBotAction(conversationId);
      setActiveAction(null);
      setMessages((prev) => [
        ...prev,
        {
          _id: `bot_cancel_${Date.now()}`,
          sender: 'assistant',
          text: 'Action cancelled. How else can I assist you?',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setActiveAction(null);
    }
  };

  const handleResetChat = () => {
    Alert.alert(
      'New Conversation',
      'Start a fresh conversation with Pravisti AI?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Fresh',
          onPress: () => {
            setConversationId(null);
            setActiveAction(null);
            setMessages([]);
          },
        },
      ]
    );
  };

  // Helper to format bot message markdown lines
  const renderFormattedText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      // Heading or bold label
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('*') || line.trim().startsWith('-');
      const cleanLine = line.replace(/^[•\*\-]\s*/, '').replace(/\*\*/g, '');

      if (line.trim().startsWith('📋') || line.trim().startsWith('👉')) {
        return (
          <Text key={`line_${idx}`} style={styles.botHeadingText}>
            {line.replace(/\*\*/g, '')}
          </Text>
        );
      }

      if (isBullet) {
        return (
          <View key={`line_${idx}`} style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{cleanLine}</Text>
          </View>
        );
      }

      return (
        <Text key={`line_${idx}`} style={styles.botNormalText}>
          {line.replace(/\*\*/g, '')}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME} />

      {/* ─── 1. TOP HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.botAvatarBadge}>
          <Image
            source={require('../../images/bot_img.png')}
            style={styles.botHeaderImage}
            resizeMode="contain"
          />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.headerTitleCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.headerTitle}>Pravisti AI</Text>
            <View style={styles.aiTag}>
              <Sparkles size={10} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.aiTagText}>ASSISTANT</Text>
            </View>
          </View>
          <Text style={styles.headerSubTitle} numberOfLines={1}>
            {activeCompany?.name ? `Company: ${activeCompany.name}` : 'Smart B2B Trade Assistant'}
          </Text>
        </View>

        {/* New / Reset Conversation */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleResetChat}
          activeOpacity={0.75}
        >
          <RotateCcw size={17} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* ─── 2. ACTIVE ACTION DRAFT NOTIFICATION CARD ─── */}
      {activeAction && activeAction.requiresConfirmation && activeAction.draft && (
        <View style={styles.activeActionBanner}>
          <View style={styles.activeActionTopRow}>
            <View style={styles.activeActionTitleGroup}>
              <Sparkles size={14} color="#1541D8" />
              <Text style={styles.activeActionTitle}>Action Confirmation Ready</Text>
            </View>
            <TouchableOpacity onPress={handleClearAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <XCircle size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionDraftGrid}>
            {activeAction.draft.targetCompanyName && (
              <View style={styles.actionDraftItem}>
                <Text style={styles.actionDraftLabel}>Counterparty</Text>
                <Text style={styles.actionDraftValue}>{activeAction.draft.targetCompanyName}</Text>
              </View>
            )}
            {activeAction.draft.productName && (
              <View style={styles.actionDraftItem}>
                <Text style={styles.actionDraftLabel}>Product</Text>
                <Text style={styles.actionDraftValue}>{activeAction.draft.productName}</Text>
              </View>
            )}
            {Boolean(activeAction.draft.quantity) && (
              <View style={styles.actionDraftItem}>
                <Text style={styles.actionDraftLabel}>Quantity</Text>
                <Text style={styles.actionDraftValue}>{activeAction.draft.quantity} {activeAction.draft.unit || 'units'}</Text>
              </View>
            )}
            {Boolean(activeAction.draft.price) && (
              <View style={styles.actionDraftItem}>
                <Text style={styles.actionDraftLabel}>Rate</Text>
                <Text style={styles.actionDraftValue}>₹{Number(activeAction.draft.price).toLocaleString('en-IN')}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              style={styles.actionConfirmBtn}
              onPress={() => handleSend('Yes, confirm and create now')}
              activeOpacity={0.8}
            >
              <CheckCircle2 size={15} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.actionConfirmBtnText}>Confirm & Proceed</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCancelBtn}
              onPress={handleClearAction}
              activeOpacity={0.8}
            >
              <Text style={styles.actionCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── 3. MESSAGES CHAT AREA ─── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.chatScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Screen when chat is empty */}
          {messages.length === 0 && (
            <View style={styles.cleanWelcomeBox}>
              <View style={styles.cleanBotAvatar}>
                <Image
                  source={require('../../images/bot_img.png')}
                  style={{ width: 34, height: 34 }}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.cleanGreetingTitle}>Namaste! How can I help?</Text>
              <Text style={styles.cleanGreetingSub}>Choose a quick action or type below:</Text>

              <View style={styles.cleanPromptsList}>
                {quickPrompts.map((qp, idx) => {
                  const IconComp = qp.icon;
                  return (
                    <TouchableOpacity
                      key={`qp_${idx}`}
                      style={styles.cleanPromptItem}
                      onPress={() => handleSend(qp.text)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.cleanIconDot, { backgroundColor: qp.bg }]}>
                        <IconComp size={15} color={qp.color} strokeWidth={2.2} />
                      </View>
                      <Text style={styles.cleanPromptText}>{qp.title}</Text>
                      <ArrowUpRight size={15} color="#94A3B8" strokeWidth={2} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Render message bubbles */}
          {messages.map((msg, index) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg._id || `msg_${index}`}
                style={[
                  styles.messageBubbleWrapper,
                  isUser ? styles.userBubbleWrapper : styles.botBubbleWrapper,
                ]}
              >
                {!isUser && (
                  <View style={styles.botBubbleAvatar}>
                    <Image
                      source={require('../../images/bot_img.png')}
                      style={{ width: 22, height: 22 }}
                      resizeMode="contain"
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  {isUser ? (
                    <Text style={styles.userBubbleText}>{msg.text}</Text>
                  ) : (
                    renderFormattedText(msg.text)
                  )}
                </View>
              </View>
            );
          })}

          {/* Typing / Loading indicator */}
          {isLoading && (
            <View style={styles.loadingBubbleWrapper}>
              <View style={styles.botBubbleAvatar}>
                <Image
                  source={require('../../images/bot_img.png')}
                  style={{ width: 22, height: 22 }}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={THEME} />
                <Text style={styles.loadingBubbleText}>Thinking & searching platform...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ─── 4. INPUT BAR ─── */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                color: '#0F172A',
                backgroundColor: '#F8FAFC',
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type in English, Hindi, or Hinglish..."
            placeholderTextColor="#94A3B8"
            cursorColor={THEME}
            selectionColor="rgba(35, 39, 216, 0.25)"
            multiline
            textAlignVertical="center"
            returnKeyType="send"
            blurOnSubmit={false}
            maxLength={1000}
            onSubmitEditing={() => handleSend()}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AIBotScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  botAvatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 10,
  },
  botHeaderImage: {
    width: 28,
    height: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  aiTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubTitle: {
    fontSize: 11.5,
    color: '#E0E7FF',
    marginTop: 1,
    fontWeight: '500',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Action Draft Banner */
  activeActionBanner: {
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7D2FE',
    padding: 12,
  },
  activeActionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeActionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeActionTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  actionDraftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  actionDraftItem: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  actionDraftLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  actionDraftValue: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 1,
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  actionConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },

  /* Chat Scroll */
  chatScrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  /* Clean Minimal Welcome */
  cleanWelcomeBox: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  cleanBotAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  cleanGreetingTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cleanGreetingSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 22,
  },
  cleanPromptsList: {
    width: '100%',
    gap: 9,
  },
  cleanPromptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 11,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cleanIconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cleanPromptText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },

  /* Messages */
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginVertical: 6,
    maxWidth: '85%',
  },
  userBubbleWrapper: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botBubbleWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    gap: 8,
  },
  botBubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: THEME,
    borderBottomRightRadius: 4,
  },
  userBubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    flexShrink: 1,
  },
  botHeadingText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 4,
  },
  botNormalText: {
    fontSize: 13.5,
    color: '#1E293B',
    lineHeight: 20,
    fontWeight: '400',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 2,
  },
  bulletDot: {
    fontSize: 14,
    color: THEME,
    fontWeight: '800',
  },
  bulletText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
    flex: 1,
  },

  /* Loading */
  loadingBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
    alignSelf: 'flex-start',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  loadingBubbleText: {
    fontSize: 12.5,
    color: '#64748B',
    fontStyle: 'italic',
  },

  /* Input */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    textAlignVertical: 'center',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
});
