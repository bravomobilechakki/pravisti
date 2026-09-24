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
  History,
  Clock,
  Trash2,
  Plus,
  MessageSquare,
  Search,
  ChevronRight,
} from 'lucide-react-native';
import {
  sendBotMessage,
  clearBotAction,
  getBotConversations,
  getBotConversation,
  deleteBotConversation,
} from '../../services/api';

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
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history'
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [androidKeyboardHeight, setAndroidKeyboardHeight] = useState(0);
  const containerHeightRef = useRef(0);
  const initialContainerHeightRef = useRef(0);

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

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      if (Platform.OS === 'android') {
        const kHeight = e?.endCoordinates?.height || 0;
        const didWindowResize =
          initialContainerHeightRef.current > 0 &&
          containerHeightRef.current > 0 &&
          containerHeightRef.current < initialContainerHeightRef.current - 100;

        if (!didWindowResize) {
          setAndroidKeyboardHeight(kHeight);
        } else {
          setAndroidKeyboardHeight(0);
        }
      }
      scrollToBottom();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      if (Platform.OS === 'android') {
        setAndroidKeyboardHeight(0);
      }
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
            setInputText('');
          },
        },
      ]
    );
  };

  // Save active conversation to local storage
  const saveCurrentSessionToHistory = useCallback(async (convId, currentMessages) => {
    if (!currentMessages || currentMessages.length === 0) return;
    try {
      const stored = await AsyncStorage.getItem('pravisti_ai_chat_history');
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const firstUserMsg = currentMessages.find((m) => m.sender === 'user' || m.role === 'user');
      const userText =
        firstUserMsg?.text ||
        firstUserMsg?.content ||
        firstUserMsg?.message ||
        'Trade Assistant Chat';




      // Find last assistant message or last message for snippet
      const lastBotMsg = [...currentMessages].reverse().find((m) => m.sender !== 'user' && m.role !== 'user');
      const lastMsg = lastBotMsg || currentMessages[currentMessages.length - 1];
      const lastText = lastMsg?.text || lastMsg?.content || lastMsg?.message || '';

      const id =
        convId ||
        (currentMessages[0]?._id ? `local_${currentMessages[0]._id}` : `local_${Date.now()}`);

      const sessionObj = {
        _id: id,
        id: id,
        title: userText.length > 55 ? `${userText.substring(0, 55)}...` : userText,
        snippet: lastText.length > 110 ? `${lastText.substring(0, 110)}...` : lastText,
        messages: currentMessages,
        messageCount: currentMessages.length,
        updatedAt: new Date().toISOString(),
        companyName: activeCompany?.name || null,
      };

      // Check if this conversation already exists by ID or by matching first message
      const existingIndex = list.findIndex(
        (item) =>
          (item.id && (item.id === id || item._id === id)) ||
          (currentMessages[0]?._id && item.id === `local_${currentMessages[0]._id}`)
      );
      if (existingIndex >= 0) {
        list[existingIndex] = sessionObj;
      } else {
        list.unshift(sessionObj);
      }

      list = list.slice(0, 50);
      await AsyncStorage.setItem('pravisti_ai_chat_history', JSON.stringify(list));
      setHistoryList(list);
    } catch (e) {
      console.warn('Error saving local chat history:', e);
    }
  }, [activeCompany?.name]);

  // Sync messages to history
  useEffect(() => {
    if (messages && messages.length > 0) {
      saveCurrentSessionToHistory(conversationId, messages);
    }
  }, [messages, conversationId, saveCurrentSessionToHistory]);

  // Load chat history from server & local cache
  const loadChatHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    let localList = [];
    try {
      const stored = await AsyncStorage.getItem('pravisti_ai_chat_history');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localList = parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local history:', e);
    }

    try {
      const res = await getBotConversations(30, 1);
      const serverConvs =
        res?.data?.conversations ||
        res?.data?.data ||
        (Array.isArray(res?.data) ? res.data : []);

      if (Array.isArray(serverConvs) && serverConvs.length > 0) {
        const mergedMap = new Map();

        // Put server conversations into map
        serverConvs.forEach((sc) => {
          const id = sc._id || sc.id;
          if (!id) return;
          const matchingLocal = localList.find((l) => (l.id || l._id) === id);

          mergedMap.set(id, {
            _id: id,
            id: id,
            title: sc.title || matchingLocal?.title || 'Trade Chat',
            snippet:
              sc.lastMessageSnippet ||
              sc.lastMessage?.text ||
              matchingLocal?.snippet ||
              '',
            messages:
              Array.isArray(sc.messages) && sc.messages.length > 0
                ? sc.messages
                : matchingLocal?.messages || [],
            messageCount:
              sc.messageCount ||
              matchingLocal?.messages?.length ||
              1,
            updatedAt:
              sc.updatedAt ||
              sc.lastInteractionAt ||
              sc.createdAt ||
              matchingLocal?.updatedAt ||
              new Date().toISOString(),
          });
        });

        // Add local conversations that are not in server list
        localList.forEach((lc) => {
          const id = lc._id || lc.id;
          if (id && !mergedMap.has(id)) {
            mergedMap.set(id, lc);
          }
        });

        const combined = Array.from(mergedMap.values()).sort(
          (a, b) =>
            new Date(b.updatedAt || b.lastInteractionAt || 0) -
            new Date(a.updatedAt || a.lastInteractionAt || 0)
        );
        setHistoryList(combined);
        await AsyncStorage.setItem('pravisti_ai_chat_history', JSON.stringify(combined));
      } else {
        setHistoryList(localList);
      }
    } catch (err) {
      console.warn('Backend conversations load error, using local:', err);
      setHistoryList(localList);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // Auto-restore previous chat session on initial mount
  useEffect(() => {
    const initRecentChat = async () => {
      try {
        const stored = await AsyncStorage.getItem('pravisti_ai_chat_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistoryList(parsed);
            const latest = parsed[0];
            if (Array.isArray(latest.messages) && latest.messages.length > 0) {
              setMessages(latest.messages);
              setConversationId(latest.id || latest._id);
              scrollToBottom();
            }
          }
        }
      } catch (e) {
        console.warn('Error restoring recent chat:', e);
      }
    };
    initRecentChat();
    loadChatHistory();
  }, [loadChatHistory]);

  const handleSelectHistoryConversation = async (item) => {
    const id = item.id || item._id;
    // If messages already present locally, restore immediately
    if (Array.isArray(item.messages) && item.messages.length > 0) {
      setMessages(item.messages);
      setConversationId(id);
      setActiveTab('chat');
      scrollToBottom();
      return;
    }

    try {
      setIsLoading(true);
      setActiveTab('chat');
      const res = await getBotConversation(id);
      const msgs =
        res?.data?.messages ||
        res?.data?.conversation?.messages ||
        (Array.isArray(res?.data) ? res.data : []) ||
        [];
      const convId =
        res?.data?.conversation?.id ||
        res?.data?.conversation?._id ||
        res?.data?.id ||
        res?.data?._id ||
        id;

      if (Array.isArray(msgs) && msgs.length > 0) {
        setMessages(msgs);
        setConversationId(convId);
        saveCurrentSessionToHistory(convId, msgs);
      } else {
        const fallback = [];
        if (item.title && item.title !== 'Trade Chat' && item.title !== 'New Conversation') {
          fallback.push({
            _id: `restored_u_${Date.now()}`,
            sender: 'user',
            text: item.title,
            createdAt: item.updatedAt || item.lastInteractionAt || new Date().toISOString(),
          });
        }
        if (item.snippet) {
          fallback.push({
            _id: `restored_b_${Date.now()}`,
            sender: 'assistant',
            text: item.snippet,
            createdAt: item.updatedAt || item.lastInteractionAt || new Date().toISOString(),
          });
        }
        if (fallback.length > 0) {
          setMessages(fallback);
          setConversationId(convId);
        }
      }
      scrollToBottom();
    } catch (err) {
      console.warn('Error fetching conversation details:', err);
      if (item.snippet) {
        setMessages([
          {
            _id: `restored_u_${Date.now()}`,
            sender: 'user',
            text: item.title || 'Trade Query',
            createdAt: item.updatedAt || item.lastInteractionAt || new Date().toISOString(),
          },
          {
            _id: `restored_b_${Date.now()}`,
            sender: 'assistant',
            text: item.snippet,
            createdAt: item.updatedAt || item.lastInteractionAt || new Date().toISOString(),
          },
        ]);
      }
      setActiveTab('chat');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleDeleteHistoryItem = (item) => {
    const id = item.id || item._id;
    Alert.alert(
      'Delete Conversation',
      'Delete this conversation from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = historyList.filter((c) => (c.id || c._id) !== id);
            setHistoryList(updated);
            await AsyncStorage.setItem('pravisti_ai_chat_history', JSON.stringify(updated));

            if (conversationId === id) {
              setMessages([]);
              setConversationId(null);
            }
            if (id && !String(id).startsWith('local_')) {
              try {
                await deleteBotConversation(id);
              } catch (e) {
                console.warn('Failed to delete on server:', e);
              }
            }
          },
        },
      ]
    );
  };

  const handleStartNewChat = () => {
    setConversationId(null);
    setActiveAction(null);
    setMessages([]);
    setInputText('');
    setActiveTab('chat');
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
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
    <View
      style={styles.container}
      onLayout={(e) => {
        const { height } = e.nativeEvent.layout;
        containerHeightRef.current = height;
        if (!initialContainerHeightRef.current || (!isKeyboardVisible && height > initialContainerHeightRef.current)) {
          initialContainerHeightRef.current = height;
        } else if (Platform.OS === 'android' && isKeyboardVisible) {
          if (initialContainerHeightRef.current > 0 && height < initialContainerHeightRef.current - 100) {
            setAndroidKeyboardHeight(0);
          }
        }
      }}
    >
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

      {/* ─── 2. TAB SWITCHER (ACTIVE CHAT VS HISTORY) ─── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'chat' && styles.tabBtnActive]}
          onPress={() => setActiveTab('chat')}
          activeOpacity={0.8}
        >
          <Bot size={16} color={activeTab === 'chat' ? THEME : '#64748B'} strokeWidth={2.2} />
          <Text style={[styles.tabBtnText, activeTab === 'chat' && styles.tabBtnTextActive]}>
            Active Chat
          </Text>
          {messages.length > 0 && activeTab === 'chat' && (
            <View style={styles.activeDot} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => {
            setActiveTab('history');
            loadChatHistory();
          }}
          activeOpacity={0.8}
        >
          <History size={16} color={activeTab === 'history' ? THEME : '#64748B'} strokeWidth={2.2} />
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            Chat History
          </Text>
          {historyList.length > 0 && (
            <View style={styles.historyBadge}>
              <Text style={styles.historyBadgeText}>{historyList.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── 3. CONTENT AREA (HISTORY TAB OR ACTIVE CHAT) ─── */}
      {activeTab === 'history' ? (
        <View style={styles.historyContainer}>
          {/* History Toolbar */}
          <View style={styles.historyToolbar}>
            <View style={styles.historySearchBox}>
              <Search size={15} color="#94A3B8" />
              <TextInput
                style={styles.historySearchInput}
                placeholder="Search past conversations..."
                placeholderTextColor="#94A3B8"
                value={historySearchQuery}
                onChangeText={setHistorySearchQuery}
              />
              {historySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setHistorySearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <XCircle size={15} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.newChatHeaderBtn}
              onPress={handleStartNewChat}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.newChatHeaderBtnText}>New Chat</Text>
            </TouchableOpacity>
          </View>

          {isHistoryLoading ? (
            <View style={styles.historyLoadingContainer}>
              <ActivityIndicator size="small" color={THEME} />
              <Text style={styles.historyLoadingText}>Loading past chats...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.historyListContent}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const filtered = historyList.filter((item) => {
                  if (!historySearchQuery.trim()) return true;
                  const q = historySearchQuery.toLowerCase();
                  return (
                    (item.title && item.title.toLowerCase().includes(q)) ||
                    (item.snippet && item.snippet.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <View style={styles.emptyHistoryBox}>
                      <View style={styles.emptyHistoryIconDisk}>
                        <Clock size={30} color="#94A3B8" strokeWidth={1.8} />
                      </View>
                      <Text style={styles.emptyHistoryTitle}>
                        {historySearchQuery ? 'No matching chats found' : 'No Chat History Yet'}
                      </Text>
                      <Text style={styles.emptyHistorySub}>
                        {historySearchQuery
                          ? 'Try searching with different keywords'
                          : 'Your past conversations with Pravisti AI will be saved here for easy reference.'}
                      </Text>
                      <TouchableOpacity
                        style={styles.emptyHistoryStartBtn}
                        onPress={handleStartNewChat}
                        activeOpacity={0.85}
                      >
                        <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
                        <Text style={styles.emptyHistoryStartBtnText}>Start New Chat</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return filtered.map((item, idx) => {
                  const isActive = (item.id || item._id) === conversationId;
                  return (
                    <TouchableOpacity
                      key={item.id || item._id || `hist_${idx}`}
                      style={[styles.historyCard, isActive && styles.historyCardActive]}
                      onPress={() => handleSelectHistoryConversation(item)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.historyCardIconDisk}>
                        <MessageSquare size={17} color={THEME} strokeWidth={2.2} />
                      </View>

                      <View style={styles.historyCardBody}>
                        <View style={styles.historyCardTitleRow}>
                          <Text style={styles.historyCardTitle} numberOfLines={1}>
                            {item.title && item.title !== 'New Conversation'
                              ? item.title
                              : (item.messages && (item.messages[0]?.text || item.messages[0]?.content)) || 'Trade Chat'}
                          </Text>
                          <Text style={styles.historyCardTime}>
                            {formatRelativeTime(item.updatedAt || item.lastInteractionAt || item.createdAt) || 'Recently'}
                          </Text>
                        </View>

                        <Text style={styles.historyCardSnippet} numberOfLines={2}>
                          {item.snippet ||
                            (item.messages &&
                              (item.messages[item.messages.length - 1]?.text ||
                                item.messages[item.messages.length - 1]?.content)) ||
                            'Conversation session'}
                        </Text>

                        <View style={styles.historyCardMetaRow}>
                          <View style={styles.historyMetaChip}>
                            <Text style={styles.historyMetaChipText}>
                              {item.messageCount || item.messages?.length || 1} msgs
                            </Text>
                          </View>
                          {Boolean(item.companyName) && (
                            <View style={[styles.historyMetaChip, { backgroundColor: '#F0FDF4' }]}>
                              <Text style={[styles.historyMetaChipText, { color: '#16A34A' }]}>
                                {item.companyName}
                              </Text>
                            </View>
                          )}
                          {isActive && (
                            <View style={[styles.historyMetaChip, { backgroundColor: '#EEF2FF' }]}>
                              <Text style={[styles.historyMetaChipText, { color: THEME, fontWeight: '700' }]}>
                                Active
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <TouchableOpacity
                          style={styles.historyDeleteBtn}
                          onPress={() => handleDeleteHistoryItem(item)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
                        </TouchableOpacity>
                        <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          )}
        </View>
      ) : (
        <>
          {/* Active Action draft notification card */}
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

          {/* Messages Chat Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
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
                const isUser = msg.sender === 'user' || msg.role === 'user';
                const messageText = msg.text || msg.content || msg.message || '';
                const timeString = (msg.createdAt || msg.updatedAt)
                  ? new Date(msg.createdAt || msg.updatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : '';

                return (
                  <View
                    key={msg._id || msg.id || `msg_${index}`}
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
                        <Text style={styles.userBubbleText}>{messageText}</Text>
                      ) : (
                        <View>{renderFormattedText(messageText)}</View>
                      )}

                      {!messageText && (
                        <Text
                          style={[
                            styles.userBubbleText,
                            !isUser && { color: '#64748B', fontStyle: 'italic', fontSize: 13 },
                          ]}
                        >
                          {msg.action?.summaryText || '...'}
                        </Text>
                      )}

                      {/* Action Details if attached */}
                      {msg.action && (
                        <View style={styles.messageActionCard}>
                          <View style={styles.messageActionHeader}>
                            <FileText size={13} color="#1541D8" />
                            <Text style={styles.messageActionHeaderText}>
                              {msg.action.type ? msg.action.type.replace(/_/g, ' ') : 'Sauda Action'}
                            </Text>
                          </View>
                          {msg.action.targetId && (
                            <Text style={styles.messageActionMeta}>Ref: #{msg.action.targetId}</Text>
                          )}
                        </View>
                      )}

                      {Boolean(timeString) && (
                        <Text
                          style={[
                            styles.messageTime,
                            isUser ? styles.userTime : styles.botTime,
                          ]}
                        >
                          {timeString}
                        </Text>
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

            {/* Input Bar */}
            <View
              style={[
                styles.inputContainer,
                {
                  paddingBottom: isKeyboardVisible ? 10 : Math.max(insets.bottom, 10),
                  marginBottom:
                    Platform.OS === 'android' && androidKeyboardHeight > 0
                      ? androidKeyboardHeight + 28
                      : 0,
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
        </>
      )}
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

  /* Tab Bar */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: THEME,
  },
  tabBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: THEME,
    fontWeight: '700',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  historyBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  historyBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME,
  },

  /* History View */
  historyContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  historyToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historySearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    gap: 6,
  },
  historySearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  newChatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  newChatHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  historyLoadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  historyListContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  historyCardActive: {
    borderColor: '#818CF8',
    backgroundColor: '#F8FAFC',
  },
  historyCardIconDisk: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyCardBody: {
    flex: 1,
  },
  historyCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  historyCardTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  historyCardSnippet: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 6,
  },
  historyCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyMetaChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  historyMetaChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  historyDeleteBtn: {
    padding: 8,
    marginLeft: 6,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyHistoryIconDisk: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyHistorySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyHistoryStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    gap: 6,
  },
  emptyHistoryStartBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
