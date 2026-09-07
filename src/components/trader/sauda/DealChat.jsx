import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Image,
  StatusBar,
  Linking,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import {
  getUserProfile,
  getDealDetails,
  getConversations,
  getConversationMessages,
  markConversationAsRead,
  createConversation,
  recordPayment,
  getPaymentDashboard,
  getPayments,
  updatePaymentStatus,
  createDelivery,
  getDeliveries,
  updateDeliveryStatus,
  uploadImage,
  resolveImageUrl,
} from '../../../services/api';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  ChevronLeft,
  ArrowLeft,
  X,
  Send,
  Plus,
  FileText,
  Clock,
  Check,
  Lock,
  CreditCard,
  CheckCircle,
  Truck,
  Download,
  Info,
  Handshake,
  Phone,
  MoreVertical,
  Camera,
  Copy,
  Calendar,
  ChevronRight,
  Share2,
  Package,
  Paperclip,
  ExternalLink,
  ImageOff,
} from 'lucide-react-native';
import SummaryApi from '../../../common';
import { SvgXml } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Payment method assets from src/images/payments
const CARD_IMG = require('../../../images/payments/icons8-credit-card-50.png');
const BANKING_IMG = require('../../../images/payments/icons8-banking-48.png');

const GOOGLE_PAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px" baseProfile="basic"><path fill="#e64a19" d="M42.858,11.975c-4.546-2.624-10.359-1.065-12.985,3.481L23.25,26.927 c-1.916,3.312,0.551,4.47,3.301,6.119l6.372,3.678c2.158,1.245,4.914,0.506,6.158-1.649l6.807-11.789 C48.176,19.325,46.819,14.262,42.858,11.975z"/><path fill="#fbc02d" d="M35.365,16.723l-6.372-3.678c-3.517-1.953-5.509-2.082-6.954,0.214l-9.398,16.275 c-2.624,4.543-1.062,10.353,3.481,12.971c3.961,2.287,9.024,0.93,11.311-3.031l9.578-16.59 C38.261,20.727,37.523,17.968,35.365,16.723z"/><path fill="#43a047" d="M36.591,8.356l-4.476-2.585c-4.95-2.857-11.28-1.163-14.137,3.787L9.457,24.317 c-1.259,2.177-0.511,4.964,1.666,6.22l5.012,2.894c2.475,1.43,5.639,0.582,7.069-1.894l9.735-16.86 c2.017-3.492,6.481-4.689,9.974-2.672L36.591,8.356z"/><path fill="#1e88e5" d="M19.189,13.781l-4.838-2.787c-2.158-1.242-4.914-0.506-6.158,1.646l-5.804,10.03 c-2.857,4.936-1.163,11.252,3.787,14.101l3.683,2.121l4.467,2.573l1.939,1.115c-3.442-2.304-4.535-6.92-2.43-10.555l1.503-2.596 l5.504-9.51C22.083,17.774,21.344,15.023,19.189,13.781z"/></svg>`;

const PHONE_PE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#4527a0" d="M42,37c0,2.762-2.238,5-5,5H11c-2.761,0-5-2.238-5-5V11c0-2.762,2.239-5,5-5h26c2.762,0,5,2.238,5,5 V37z"/><path fill="#fff" d="M32.267,20.171c0-0.681-0.584-1.264-1.264-1.264h-2.334l-5.35-6.25 c-0.486-0.584-1.264-0.778-2.043-0.584l-1.848,0.584c-0.292,0.097-0.389,0.486-0.195,0.681l5.836,5.666h-8.851 c-0.292,0-0.486,0.195-0.486,0.486v0.973c0,0.681,0.584,1.506,1.264,1.506h1.972v4.305c0,3.502,1.611,5.544,4.723,5.544 c0.973,0,1.378-0.097,2.35-0.486v3.112c0,0.875,0.681,1.556,1.556,1.556h0.786c0.292,0,0.584-0.292,0.584-0.584V21.969h2.812 c0.292,0,0.486-0.195,0.486-0.486V20.171z M26.043,28.413c-0.584,0.292-1.362,0.389-1.945,0.389c-1.556,0-2.097-0.778-2.097-2.529 v-4.305h4.043V28.413z"/></svg>`;

const PAYTM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#0d47a1" d="M5.446 18.01H.548c-.277 0-.502.167-.503.502L0 30.519c-.001.3.196.45.465.45.735 0 1.335 0 2.07 0C2.79 30.969 3 30.844 3 30.594 3 29.483 3 28.111 3 27l2.126.009c1.399-.092 2.335-.742 2.725-2.052.117-.393.14-.733.14-1.137l.11-2.862C7.999 18.946 6.949 18.181 5.446 18.01zM4.995 23.465C4.995 23.759 4.754 24 4.461 24H3v-3h1.461c.293 0 .534.24.534.535V23.465zM13.938 18h-3.423c-.26 0-.483.08-.483.351 0 .706 0 1.495 0 2.201C10.06 20.846 10.263 21 10.552 21h2.855c.594 0 .532.972 0 1H11.84C10.101 22 9 23.562 9 25.137c0 .42.005 1.406 0 1.863-.008.651-.014 1.311.112 1.899C9.336 29.939 10.235 31 11.597 31h4.228c.541 0 1.173-.474 1.173-1.101v-8.274C17.026 19.443 15.942 18.117 13.938 18zM14 27.55c0 .248-.202.45-.448.45h-1.105C12.201 28 12 27.798 12 27.55v-2.101C12 25.202 12.201 25 12.447 25h1.105C13.798 25 14 25.202 14 25.449V27.55zM18 18.594v5.608c.124 1.6 1.608 2.798 3.171 2.798h1.414c.597 0 .561.969 0 .969H19.49c-.339 0-.462.177-.462.476v2.152c0 .226.183.396.422.396h2.959c2.416 0 3.592-1.159 3.591-3.757v-8.84c0-.276-.175-.383-.342-.383h-2.302c-.224 0-.355.243-.355.422v5.218c0 .199-.111.316-.29.316H21.41c-.264 0-.409-.143-.409-.396v-5.058C21 18.218 20.88 18 20.552 18c-.778 0-1.442 0-2.22 0C18.067 18 18 18.263 18 18.594L18 18.594z"/><path fill="#00adee" d="M27.038 20.569v-2.138c0-.237.194-.431.43-.431H28c1.368-.285 1.851-.62 2.688-1.522.514-.557.966-.704 1.298-.113L32 18h1.569C33.807 18 34 18.194 34 18.431v2.138C34 20.805 33.806 21 33.569 21H32v9.569C32 30.807 31.806 31 31.57 31h-2.14C29.193 31 29 30.807 29 30.569V21h-1.531C27.234 21 27.038 20.806 27.038 20.569L27.038 20.569zM42.991 30.465c0 .294-.244.535-.539.535h-1.91c-.297 0-.54-.241-.54-.535v-6.623-1.871c0-1.284-2.002-1.284-2.002 0v8.494C38 30.759 37.758 31 37.461 31H35.54C35.243 31 35 30.759 35 30.465V18.537C35 18.241 35.243 18 35.54 18h1.976c.297 0 .539.241.539.537v.292c1.32-1.266 3.302-.973 4.416.228 2.097-2.405 5.69-.262 5.523 2.375 0 2.916-.026 6.093-.026 9.033 0 .294-.244.535-.538.535h-1.891C45.242 31 45 30.759 45 30.465c0-2.786 0-5.701 0-8.44 0-1.307-2-1.37-2 0v8.44H42.991z"/></svg>`;

const UPI_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#EA580C" d="M14.2 4L7 13.5h4.2L15.7 7.5z"/><path fill="#16A34A" d="M9.8 20L17 10.5h-4.2L8.3 16.5z"/></svg>`;

const sanitizeSystemMessage = (text) => {
  return text.replace(/^[💸✅❌]\s*/, '');
};

const parsePaymentMessage = (text) => {
  const cleanText = sanitizeSystemMessage(text || '').trim();
  const lower = cleanText.toLowerCase();

  // Must have payment context keywords to be parsed as a payment message
  const hasPaymentContext =
    lower.includes('payment') ||
    lower.includes('paid') ||
    lower.includes('advance') ||
    lower.includes('₹') ||
    lower.includes('inr') ||
    lower.includes('rs.') ||
    lower.includes('rs ');

  if (!hasPaymentContext) {
    return { amount: '', method: '', notes: '' };
  }

  const amountMatch =
    cleanText.match(/(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i) ||
    cleanText.match(/(?:amount|amt|paid|pay|payment|received)\s*[:\-]?\s*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const amount = amountMatch ? amountMatch[1] : '';

  const methodMatch = cleanText.match(/(?:via|method|mode)\s*[:\-]?\s*([A-Za-z0-9\s\-]+?)(?:\.|$|Notes:)/i);
  const method = methodMatch ? methodMatch[1].trim() : 'UPI';

  const notesMatch = cleanText.match(/Notes:\s*(.*)$/i) || cleanText.match(/Remarks?:\s*(.*)$/i);
  const notes = notesMatch ? notesMatch[1].trim() : '';

  return { amount, method, notes };
};

const findMatchingPayment = (msgText, msgTime, payments) => {
  if (!payments || payments.length === 0 || !msgText) return null;

  const clean = (msgText || '').toLowerCase().trim();
  const hasPaymentContext =
    clean.includes('payment') ||
    clean.includes('💸') ||
    (clean.includes('paid') && (clean.includes('₹') || clean.includes('rs') || clean.includes('inr')));

  // If message does not talk about payment, NEVER match it to any payment!
  if (!hasPaymentContext) {
    return null;
  }

  const parsed = parsePaymentMessage(msgText);
  if (parsed && parsed.amount) {
    const amt = parseFloat(parsed.amount.replace(/,/g, ''));
    if (!isNaN(amt)) {
      const candidates = payments.filter(p => Math.abs(Number(p.amount) - amt) < 0.01);
      if (candidates.length === 1) {
        return candidates[0];
      }

      if (candidates.length > 1) {
        const msgDate = new Date(msgTime).getTime();
        let bestMatch = candidates[0];
        let minDiff = Math.abs(new Date(bestMatch.createdAt || bestMatch.date || 0).getTime() - msgDate);

        for (let i = 1; i < candidates.length; i++) {
          const diff = Math.abs(new Date(candidates[i].createdAt || candidates[i].date || 0).getTime() - msgDate);
          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = candidates[i];
          }
        }
        return bestMatch;
      }
    }
  }

  // Fallback ONLY for system payment notifications (e.g. mentions 'entry of', 'payment recorded', 'pending seller approval')
  if (
    clean.includes('entry of') ||
    clean.includes('payment recorded') ||
    clean.includes('payment received') ||
    clean.includes('pending seller approval') ||
    clean.includes('pending buyer approval')
  ) {
    const msgDate = new Date(msgTime).getTime();
    if (!isNaN(msgDate)) {
      const sorted = [...payments].sort((a, b) => {
        const diffA = Math.abs(new Date(a.createdAt || a.date || 0).getTime() - msgDate);
        const diffB = Math.abs(new Date(b.createdAt || b.date || 0).getTime() - msgDate);
        return diffA - diffB;
      });
      if (sorted.length > 0) {
        const closest = sorted[0];
        const timeDiff = Math.abs(new Date(closest.createdAt || closest.date || 0).getTime() - msgDate);
        if (timeDiff < 3600000 * 2) {
          return closest;
        }
      }
    }
    const pendingPayment = payments.find(p => p.status === 'pending');
    if (pendingPayment) return pendingPayment;
  }

  return null;
};

const parseDeliveryMessage = (text) => {
  const isApproved = text.toLowerCase().includes('approved') || text.startsWith('✅');
  const isRejected = text.toLowerCase().includes('rejected') || text.startsWith('❌');
  const qtyMatch = text.match(/(?:quantity|qty|delivered)\s*[:\-]?\s*([0-9,]+)/i) ||
    text.match(/([0-9,]+)\s*(?:Units|packet|kg|Bales|tons|pcs|packet|pg|Bags)/i) ||
    text.match(/([0-9,]+)/);
  const quantity = qtyMatch ? qtyMatch[1].replace(/,/g, '') : '';
  return { isApproved, isRejected, quantity };
};

const findMatchingDelivery = (msgText, msgTime, deliveries) => {
  const parsed = parseDeliveryMessage(msgText);
  if (!parsed || !parsed.quantity) return null;

  const qty = parseInt(parsed.quantity, 10);
  const candidates = (deliveries || []).filter(d => d.quantity === qty);
  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length > 1) {
    const msgDate = new Date(msgTime).getTime();
    let bestMatch = candidates[0];
    let minDiff = Math.abs(new Date(bestMatch.createdAt).getTime() - msgDate);

    for (let i = 1; i < candidates.length; i++) {
      const diff = Math.abs(new Date(candidates[i].createdAt).getTime() - msgDate);
      if (diff < minDiff) {
        minDiff = diff;
        bestMatch = candidates[i];
      }
    }
    return bestMatch;
  }

  return null;
};

// Helper function to decode base64 without external dependencies
const base64Decode = (str) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let buffer = '';
  const cleanStr = str.replace(/=+$/, '');
  for (let i = 0, bc = 0, bs = 0; i < cleanStr.length; i++) {
    const char = cleanStr.charAt(i);
    const idx = chars.indexOf(char);
    if (idx === -1) continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      buffer += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return buffer;
};

const getUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = base64Decode(base64);
    const parsed = JSON.parse(payload);
    return parsed.userId || parsed.id;
  } catch (e) {
    console.warn('Failed to decode token:', e);
    return null;
  }
};

const checkIsMe = (msg, myUserId) => {
  if (!myUserId) return false;

  let senderId = null;
  if (msg) {
    if (msg.sender) {
      if (typeof msg.sender === 'string') {
        senderId = msg.sender;
      } else if (typeof msg.sender === 'object') {
        const userIdObj = msg.sender.userId;
        if (userIdObj) {
          if (typeof userIdObj === 'string') {
            senderId = userIdObj;
          } else if (typeof userIdObj === 'object') {
            senderId = userIdObj._id || userIdObj.id;
          }
        }
        if (!senderId) {
          senderId = msg.sender._id || msg.sender.id;
        }
      }
    }

    if (!senderId) {
      senderId = msg.senderId || msg.userId || msg.createdBy;
    }
  }

  if (!senderId) return false;
  return String(senderId).trim().toLowerCase() === String(myUserId).trim().toLowerCase();
};

/**
 * Robust helper to extract image/media URL from any message payload format
 * Handles:
 * - { media: { url: "https://..." } }
 * - { media: "https://..." }
 * - { mediaUrl: "https://..." }
 * - { imageUrl: "https://..." }
 * - content that is a direct image URL
 */
const extractMediaUrl = (msg) => {
  if (!msg) return '';
  if (typeof msg.media === 'string') return msg.media;
  if (msg.media && typeof msg.media === 'object') {
    if (msg.media.url) return msg.media.url;
    if (msg.media.uri) return msg.media.uri;
    if (msg.media.path) return msg.media.path;
  }
  if (Array.isArray(msg.media) && msg.media[0]) {
    const first = msg.media[0];
    return typeof first === 'string' ? first : (first?.url || first?.uri || '');
  }
  if (Array.isArray(msg.attachments) && msg.attachments[0]) {
    const first = msg.attachments[0];
    return typeof first === 'string' ? first : (first?.url || first?.uri || '');
  }
  if (msg.mediaUrl) return msg.mediaUrl;
  if (msg.fileUrl) return msg.fileUrl;
  if (msg.imageUrl) return msg.imageUrl;
  if (msg.image) return msg.image;

  // Fallback: check if content itself is an image URL
  const content = String(msg.content || msg.message || msg.text || '').trim();
  if (
    (content.startsWith('http://') || content.startsWith('https://') || content.startsWith('file://')) &&
    /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(content)
  ) {
    return content;
  }

  return '';
};

const extractTextContent = (msg, extractedMedia) => {
  const content = String(msg.content || msg.message || msg.text || '').trim();
  if (extractedMedia && content === extractedMedia) {
    return '';
  }
  return content;
};

const ChatMessageImage = ({ mediaUrl, onImagePress }) => {
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  const resolved = useMemo(() => {
    try {
      return resolveImageUrl(mediaUrl);
    } catch {
      return mediaUrl;
    }
  }, [mediaUrl]);

  if (!resolved) return null;

  if (hasError) {
    return (
      <View style={[styles.chatImageWrap, styles.chatImageErrorWrap]}>
        <ImageOff size={22} color="#94A3B8" />
        <Text style={styles.chatImageErrorText}>Photo unavailable</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onImagePress && onImagePress(resolved)}
      style={styles.chatImageWrap}
    >
      <Image
        source={{ uri: resolved }}
        style={styles.chatImage}
        resizeMode="cover"
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setHasError(true);
        }}
      />
      {loading && (
        <View style={styles.chatImageLoadingOverlay}>
          <ActivityIndicator size="small" color="#1541D8" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const DealChat = ({ onNavigate, routeData }) => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [deal, setDeal] = useState(routeData?.deal || null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserLogo, setCurrentUserLogo] = useState(null);
  const [conversationId, setConversationId] = useState(routeData?.conversationId || null);
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState('online');
  const [isCounterpartyTyping, setIsCounterpartyTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Active top tab state
  const [activeTab, setActiveTab] = useState('chat');

  // --- Payment State Variables (No hardcoded values) ---
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('sent');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [dealPayments, setDealPayments] = useState([]);

  // --- Delivery State Variables (No hardcoded values) ---
  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);
  const [deliveryProductId, setDeliveryProductId] = useState('');
  const [deliveryQuantity, setDeliveryQuantity] = useState('');
  const [deliveryVehicleNumber, setDeliveryVehicleNumber] = useState('');
  const [deliveryDispatchDate, setDeliveryDispatchDate] = useState('');
  const [deliveryExpectedDate, setDeliveryExpectedDate] = useState('');
  const [deliveryType, setDeliveryType] = useState('sent');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryAttachmentUrl, setDeliveryAttachmentUrl] = useState('');
  const [isLoggingDelivery, setIsLoggingDelivery] = useState(false);
  const [dealDeliveries, setDealDeliveries] = useState([]);

  // --- Deal Details Modal State ---
  const [isDealDetailsModalVisible, setIsDealDetailsModalVisible] = useState(false);

  // --- Success Toast State (Auto closes after 2s) ---
  const [successToast, setSuccessToast] = useState(null);
  const [headerProductImgError, setHeaderProductImgError] = useState(false);
  const [isUploadingChatImage, setIsUploadingChatImage] = useState(false);
  const [fullPreviewImage, setFullPreviewImage] = useState(null);

  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const flatListRef = useRef();
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fetchPaymentDashboardDataRef = useRef();
  const refreshDealDetailsRef = useRef();
  const fetchDealPaymentsRef = useRef();
  const fetchDealDeliveriesRef = useRef();
  const currentUserIdRef = useRef(null);
  const conversationIdRef = useRef(routeData?.conversationId || null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  const dealId = routeData?.dealId || deal?._id;

  const onReceiveMessage = useCallback((msg, myUserId) => {
    const activeUserId = myUserId || currentUserIdRef.current;
    const isMe = checkIsMe(msg, activeUserId);
    const senderName = msg.sender?.name || msg.sender?.userId?.name || msg.senderName || (isMe ? 'You' : 'Party');

    let status = msg.status || 'sent';
    if (msg.readBy && msg.readBy.length > 0) {
      status = 'read';
    }

    const media = extractMediaUrl(msg);
    const contentText = extractTextContent(msg, media);

    const mapped = {
      id: msg._id || msg.id || Date.now().toString(),
      sender: isMe ? 'You' : senderName,
      text: contentText,
      mediaUrl: media,
      time: msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      dateRaw: msg.createdAt || new Date(),
      type: isMe ? 'me' : 'other',
      status: status,
    };

    setChatMessages(prev => {
      if (prev.some(m => m.id === mapped.id)) return prev;

      let updated = [];
      if (isMe) {
        const hasTemp = prev.some(
          m =>
            m.type === 'me' &&
            ((m.text && m.text === mapped.text) || (m.mediaUrl && mapped.mediaUrl)) &&
            !isNaN(Number(m.id))
        );
        if (hasTemp) {
          updated = prev.map(m =>
            m.type === 'me' &&
            ((m.text && m.text === mapped.text) || (m.mediaUrl && mapped.mediaUrl)) &&
            !isNaN(Number(m.id))
              ? mapped
              : m
          );
        } else {
          updated = [...prev, mapped];
        }
      } else {
        updated = [...prev, mapped];
      }

      const convId = conversationIdRef.current || conversationId;
      if (convId) {
        AsyncStorage.setItem(`cached_messages_${convId}`, JSON.stringify(updated)).catch(() => { });
      }

      return updated;
    });
  }, [conversationId]);

  const refreshDealDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token || !dealId) return;
      const dealRes = await getDealDetails(dealId, token);
      if (dealRes && dealRes.success && dealRes.data) {
        setDeal(dealRes.data);
      }
    } catch (err) {
      console.warn('Failed to refresh deal details:', err);
    }
  }, [dealId]);

  const fetchPaymentDashboardData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token || !dealId) return;

      const normalizeId = (val) => String(val?._id || val?.id || val || '');
      const sellerCid = normalizeId(deal?.sellerCompanyId);
      const buyerCid = normalizeId(deal?.buyerCompanyId);
      const brokerCid = normalizeId(deal?.brokerCompanyId);

      const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
      const currentUserRole = deal?.currentUserRole || viewerRole;

      const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
      const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());
      const isBroker = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brokerCid && currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()));

      const myCompanyId = isSeller ? sellerCid : isBuyer ? buyerCid : isBroker ? brokerCid : (currentUserCompanyIds[0] || '');

      const dashRes = await getPaymentDashboard(myCompanyId, dealId, token);
      if (dashRes && dashRes.success) {
        setPaymentSummary(dashRes.data);
      }
    } catch (err) {
      console.warn('Failed to load payment dashboard in chat:', err);
    }
  }, [dealId, deal, currentUserCompanyIds]);

  const fetchDealPayments = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token || !dealId) return;
      const res = await getPayments({ dealId: dealId }, token);
      if (res && res.success) {
        setDealPayments(res.data?.data || res.data?.payments || []);
      }
    } catch (e) {
      console.warn('Failed to fetch deal payments:', e);
    }
  }, [dealId]);

  const fetchDealDeliveries = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token || !dealId) return;
      const res = await getDeliveries({ dealId: dealId }, token);
      if (res && res.success) {
        setDealDeliveries(res.data?.data || res.data?.deliveries || []);
      }
    } catch (e) {
      console.warn('Failed to fetch deal deliveries:', e);
    }
  }, [dealId]);

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await updatePaymentStatus(paymentId, status, token);
      if (res && res.success) {
        fetchPaymentDashboardData();
        refreshDealDetails();
        fetchDealPayments();
        setSuccessToast({
          title: 'Status Updated',
          message: `Payment status marked as ${status}`,
        });
      }
    } catch (err) {
      Alert.alert('Status Update Failed', err.message || 'Failed to update payment status');
    }
  };

  const handleUpdateDeliveryStatus = async (deliveryId, status) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const res = await updateDeliveryStatus(deliveryId, status, token);
      if (res && res.success) {
        fetchPaymentDashboardData();
        refreshDealDetails();
        fetchDealPayments();
        fetchDealDeliveries();
        setSuccessToast({
          title: 'Status Updated',
          message: `Delivery status marked as ${status}`,
        });
      }
    } catch (err) {
      Alert.alert('Status Update Failed', err.message || 'Failed to update delivery status');
    }
  };

  useEffect(() => {
    fetchPaymentDashboardDataRef.current = fetchPaymentDashboardData;
    refreshDealDetailsRef.current = refreshDealDetails;
    fetchDealPaymentsRef.current = fetchDealPayments;
    fetchDealDeliveriesRef.current = fetchDealDeliveries;
  });

  useEffect(() => {
    if (dealId) {
      fetchDealPayments();
      fetchDealDeliveries();
    }
  }, [dealId, fetchDealPayments, fetchDealDeliveries]);

  const playPaymentSound = () => {
    console.log('🔔 [PAYMENT SOUND] Payment notification alert.');
  };

  const handleSelectPaymentAction = (type) => {
    setPaymentType(type);
    setShowAttachMenu(false);
    setIsPaymentModalVisible(true);
  };

  const handleSelectDeliveryAction = (type) => {
    setDeliveryType(type);
    if (deal?.products && deal.products.length > 0) {
      const firstProd = deal.products[0];
      setDeliveryProductId(firstProd.productId?._id || firstProd.productId || firstProd._id || firstProd.id || '');
    }
    setShowAttachMenu(false);
    setIsDeliveryModalVisible(true);
  };

  const handleLogPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than 0.');
      return;
    }

    setIsLoggingPayment(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal?._id || dealId,
        amount: amt,
        paymentType,
        paymentMethod,
        notes: paymentNotes || undefined,
      };

      const res = await recordPayment(payload, token);
      if (res && res.success) {
        setIsPaymentModalVisible(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchPaymentDashboardData();
        refreshDealDetails();
        fetchDealPayments();
        setSuccessToast({
          title: 'Payment Logged Successfully!',
          message: `₹${amt.toLocaleString('en-IN')} (${paymentType === 'sent' ? 'Sent' : 'Received'}) via ${paymentMethod}`,
        });
      }
    } catch (err) {
      Alert.alert('Logging Failed', err.message || 'Failed to record payment');
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const handleLogDelivery = async () => {
    const qty = Number(deliveryQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Delivery quantity must be greater than 0.');
      return;
    }

    let prodId = deliveryProductId;
    if (!prodId && deal?.products && deal.products.length > 0) {
      const first = deal.products[0];
      prodId = first.productId?._id || first.productId || first._id || first.id || '';
    }

    setIsLoggingDelivery(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal?._id || dealId,
        productId: prodId,
        quantity: qty,
        deliveryType,
        vehicleNumber: deliveryVehicleNumber || undefined,
        dispatchDate: deliveryDispatchDate || undefined,
        expectedDeliveryDate: deliveryExpectedDate || undefined,
        notes: deliveryNotes || undefined,
        attachmentUrl: deliveryAttachmentUrl || undefined,
      };

      const res = await createDelivery(payload, token);
      if (res && res.success) {
        setIsDeliveryModalVisible(false);
        setDeliveryQuantity('');
        setDeliveryVehicleNumber('');
        setDeliveryNotes('');
        fetchDealDeliveries();
        refreshDealDetails();
        setSuccessToast({
          title: 'Delivery Logged Successfully!',
          message: `${qty} units logged successfully`,
        });
      }
    } catch (err) {
      Alert.alert('Logging Failed', err.message || 'Failed to record delivery');
    } finally {
      setIsLoggingDelivery(false);
    }
  };

  useEffect(() => {
    if (deal && currentUserCompanyIds.length > 0) {
      fetchPaymentDashboardData();
    }
  }, [deal, currentUserCompanyIds, fetchPaymentDashboardData]);

  useEffect(() => {
    let socket;

    const initChat = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const idFromToken = getUserIdFromToken(token);
        let myUserId = idFromToken || '';
        if (idFromToken) {
          setCurrentUserId(idFromToken);
          currentUserIdRef.current = idFromToken;
        }

        // 1. Get user profile
        try {
          const userRes = await getUserProfile(token);
          if (userRes && userRes.success && userRes.data) {
            const user = userRes.data;
            myUserId = user._id || user.id || idFromToken;
            setCurrentUserId(myUserId);
            setCurrentUserName(user.name || user.companyName || '');
            setCurrentUserLogo(user.logo || user.company?.logo || user.avatar || user.profilePicture || null);
            currentUserIdRef.current = myUserId;
            setCurrentUserCompanyIds((user.companies || []).map(c => String(c._id || c.id || c)));
          }
        } catch (profileErr) {
          console.warn('Profile fetch notice:', profileErr);
        }

        // 2. Load deal details
        const id = routeData?.dealId || routeData?.deal?._id || routeData?.deal?.id;
        let activeDeal = routeData?.deal || null;
        const isDealIncomplete =
          !activeDeal ||
          (!activeDeal.sellerCompanyId && !activeDeal.buyerCompanyId) ||
          (!activeDeal.products && !activeDeal.product);

        if (id && isDealIncomplete) {
          try {
            const dealRes = await getDealDetails(id, token);
            if (dealRes && (dealRes.success || dealRes.data) && dealRes.data) {
              activeDeal = dealRes.data;
              setDeal(activeDeal);
            }
          } catch (e) {
            console.warn('Failed to load complete deal details:', e);
          }
        }

        const dealStatus = String(activeDeal?.status || '').toLowerCase();
        const isDealApproved = dealStatus === 'approved' || dealStatus === 'active' || dealStatus === 'in_progress';

        // 3. Load conversation thread
        let activeConversationId = conversationIdRef.current || conversationId;
        if (!activeConversationId) {
          const convsRes = await getConversations(token, 1, 50);
          const convList = Array.isArray(convsRes?.data?.data)
            ? convsRes.data.data
            : Array.isArray(convsRes?.data)
              ? convsRes.data
              : Array.isArray(convsRes)
                ? convsRes
                : [];
          if (convList.length > 0) {
            const matchedConv = convList.find(c => {
              const cDealId = c.dealId?._id || c.dealId?.id || c.dealId;
              const targetId = id?._id || id?.id || id;
              if (!cDealId || !targetId) return false;
              return String(cDealId).toLowerCase().trim() === String(targetId).toLowerCase().trim();
            });
            if (matchedConv) {
              activeConversationId = matchedConv._id || matchedConv.id;
              setConversationId(activeConversationId);
              conversationIdRef.current = activeConversationId;
            }
          }
        }

        // 3b. Create conversation if missing
        if (!activeConversationId && isDealApproved && id) {
          try {
            const participantIds = new Set();
            const addUid = (val) => {
              if (!val) return;
              const idStr = String(typeof val === 'object' ? (val._id || val.id || val.userId || '') : val).trim();
              if (/^[0-9a-fA-F]{24}$/.test(idStr)) {
                participantIds.add(idStr);
              }
            };

            if (activeDeal) {
              addUid(activeDeal.sellerCompany?.owner);
              addUid(activeDeal.sellerCompanyId?.owner);
              addUid(activeDeal.buyerCompany?.owner);
              addUid(activeDeal.buyerCompanyId?.owner);
              addUid(activeDeal.brokerCompany?.owner);
              addUid(activeDeal.brokerCompanyId?.owner);
              addUid(activeDeal.party1?.userId);
              addUid(activeDeal.party2?.userId);
              addUid(activeDeal.createdBy);
            }
            addUid(myUserId);

            const pArray = Array.from(participantIds);
            const createRes = await createConversation(
              {
                dealId: id,
                dealNumber: activeDeal?.dealNumber || `DEAL-${String(id).slice(-4)}`,
                type: 'group',
                participants: pArray,
              },
              token
            );
            if (createRes && (createRes.success || createRes.data) && createRes.data) {
              activeConversationId = createRes.data._id || createRes.data.id;
              setConversationId(activeConversationId);
              conversationIdRef.current = activeConversationId;
            }
          } catch (convErr) {
            console.warn('Create conversation notice:', convErr);
          }
        }

        if (activeConversationId) {
          try {
            const cachedMsgs = await AsyncStorage.getItem(`cached_messages_${activeConversationId}`);
            if (cachedMsgs) {
              const parsed = JSON.parse(cachedMsgs);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setChatMessages(parsed);
                setIsLoading(false);
              }
            }
          } catch (cacheErr) {
            console.warn('Cache error:', cacheErr);
          }

          const msgsRes = await getConversationMessages(activeConversationId, token, 1, 50).catch(e => {
            console.warn('Error fetching messages:', e);
            return null;
          });

          let rawList = [];
          if (Array.isArray(msgsRes?.data?.data)) {
            rawList = msgsRes.data.data;
          } else if (Array.isArray(msgsRes?.data)) {
            rawList = msgsRes.data;
          } else if (Array.isArray(msgsRes?.messages)) {
            rawList = msgsRes.messages;
          } else if (Array.isArray(msgsRes)) {
            rawList = msgsRes;
          }

          if (rawList.length > 0 || (msgsRes && (msgsRes.success || msgsRes.statusCode === 200))) {
            const historyMessages = rawList.map(msg => {
              const isMe = checkIsMe(msg, myUserId);
              let status = msg.status || 'sent';
              if (msg.readBy && msg.readBy.length > 0) {
                status = 'read';
              }
              const media = extractMediaUrl(msg);
              const textContent = extractTextContent(msg, media);
              return {
                id: msg._id || msg.id,
                sender: isMe ? 'You' : (msg.sender?.name || msg.sender?.userId?.name || 'Party'),
                text: textContent,
                mediaUrl: media,
                time: msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                dateRaw: msg.createdAt || new Date(),
                type: isMe ? 'me' : 'other',
                status: status,
              };
            });
            setChatMessages(historyMessages);
            await AsyncStorage.setItem(`cached_messages_${activeConversationId}`, JSON.stringify(historyMessages)).catch(() => {});
          }

          if (isDealApproved) {
            await markConversationAsRead(activeConversationId, token);
          }
        }

        // 5. Establish Socket
        const sendOtpUrl = SummaryApi.sendOTP?.url || '';
        let socketServerUrl = sendOtpUrl ? sendOtpUrl.split('/api/')[0] : 'https://pravisti-backend-538238931844.asia-southeast1.run.app';

        if (socketServerUrl.includes('localhost') || socketServerUrl.includes('127.0.0.1')) {
          if (Platform.OS === 'android') {
            socketServerUrl = socketServerUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
          }
        }

        socket = io(socketServerUrl, {
          auth: { token },
          extraHeaders: { Authorization: `Bearer ${token}` },
          transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          setIsConnected(true);
          if (id) {
            socket.emit('join_room', { dealId: id });
          }
          if (activeConversationId) {
            socket.emit('read_messages', { conversationId: activeConversationId });
          }
        });

        socket.on('connect_error', () => {
          setIsConnected(false);
        });

        socket.on('receive_message', (msg) => {
          onReceiveMessage(msg, myUserId);
          const content = msg.content || msg.message || msg.text || '';
          if (content.toLowerCase().includes('payment')) {
            playPaymentSound();
            fetchPaymentDashboardDataRef.current?.();
            refreshDealDetailsRef.current?.();
            fetchDealPaymentsRef.current?.();
          }
          if (content.toLowerCase().includes('delivery') || content.includes('🚚')) {
            fetchPaymentDashboardDataRef.current?.();
            refreshDealDetailsRef.current?.();
            fetchDealDeliveriesRef.current?.();
          }
        });

        socket.on('user_online_status', (data) => {
          const activeUserId = myUserId || currentUserIdRef.current;
          if (data && data.userId !== activeUserId) {
            setOnlineStatus(data.status);
          }
        });

        socket.on('user_typing', (data) => {
          const activeUserId = myUserId || currentUserIdRef.current;
          if (data && data.dealId === id && data.userId !== activeUserId) {
            setIsCounterpartyTyping(true);
          }
        });

        socket.on('user_stop_typing', (data) => {
          const activeUserId = myUserId || currentUserIdRef.current;
          if (data && data.dealId === id && data.userId !== activeUserId) {
            setIsCounterpartyTyping(false);
          }
        });

        socket.on('read_receipt', (data) => {
          const activeUserId = myUserId || currentUserIdRef.current;
          if (data && data.conversationId === activeConversationId && data.userId !== activeUserId) {
            setChatMessages(prev =>
              prev.map(msg => (msg.type === 'me' && msg.status !== 'read') ? { ...msg, status: 'read' } : msg)
            );
          }
        });

        socket.on('disconnect', () => {
          setIsConnected(false);
          setIsCounterpartyTyping(false);
        });

      } catch (err) {
        console.error('Failed to init socket chat:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    return () => {
      if (socket) {
        const id = routeData?.dealId || routeData?.deal?._id;
        if (id) {
          socket.emit('leave_room', { dealId: id });
        }
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeData, onReceiveMessage]);

  const handleInputChange = (text) => {
    setMessage(text);
    if (!socketRef.current || !dealId) return;

    socketRef.current.emit('typing_start', { dealId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && dealId) {
        socketRef.current.emit('typing_stop', { dealId });
      }
    }, 1500);
  };

  const handleSelectImageSource = () => {
    Alert.alert('Upload Image', 'Choose how you would like to send an image:', [
      {
        text: 'Take Photo (Camera)',
        onPress: () => launchChatImagePicker('camera'),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => launchChatImagePicker('gallery'),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const launchChatImagePicker = (sourceType) => {
    const options = {
      mediaType: 'photo',
      quality: 0.85,
    };

    const callback = async (response) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to select image');
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        await sendChatImage(asset);
      }
    };

    if (sourceType === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const sendChatImage = async (asset) => {
    if (!asset || !asset.uri) return;
    const tempId = Date.now();
    const captionText = message.trim();

    const localImgMsg = {
      id: tempId,
      sender: 'You',
      text: captionText,
      mediaUrl: asset.uri,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      dateRaw: new Date(),
      type: 'me',
      status: 'sending',
    };

    setChatMessages(prev => [...prev, localImgMsg]);
    setMessage('');

    try {
      setIsUploadingChatImage(true);
      const uploadedUrl = await uploadImage(asset);
      const remoteImgUrl = resolveImageUrl(uploadedUrl);

      const id = routeData?.dealId || deal?._id;
      const activeConvId = conversationIdRef.current;
      const payload = {
        dealId: id,
        content: captionText,
        type: 'image',
        media: {
          url: remoteImgUrl,
          type: 'image',
        },
        mediaUrl: remoteImgUrl,
        imageUrl: remoteImgUrl,
      };
      if (activeConvId) {
        payload.conversationId = activeConvId;
      }

      if (socketRef.current) {
        socketRef.current.emit('send_message', payload, (response) => {
          if (response && (response.success || response.statusCode === 200 || response.data)) {
            const msgObj = response.data || response.message;
            if (msgObj && typeof msgObj === 'object') {
              onReceiveMessage(msgObj, currentUserId);
            }
          }
        });
      }

      setChatMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, mediaUrl: remoteImgUrl, status: 'sent' } : m))
      );
    } catch (err) {
      console.error('Failed to upload/send chat image:', err);
      Alert.alert('Upload Failed', err.message || 'Could not upload image. Please try again.');
      setChatMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setIsUploadingChatImage(false);
    }
  };

  const handleSend = () => {
    if (!message.trim() || !socketRef.current) return;

    const id = routeData?.dealId || deal?._id;
    if (!id) return;

    const messageText = message.trim();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socketRef.current.emit('typing_stop', { dealId: id });

    const activeConvId = conversationIdRef.current;
    const payload = { dealId: id, content: messageText, type: 'text' };
    if (activeConvId) {
      payload.conversationId = activeConvId;
    }

    socketRef.current.emit('send_message', payload, (response) => {
      if (response && response.success) {
        const msgObj = response.data || response.message;
        if (msgObj && typeof msgObj === 'object') {
          onReceiveMessage(msgObj, currentUserId);
          const returnedConvId = msgObj.conversationId || response.conversationId;
          if (returnedConvId && !conversationIdRef.current) {
            conversationIdRef.current = returnedConvId;
            setConversationId(returnedConvId);
          }
        }
      }
    });

    const localMsg = {
      id: Date.now(),
      sender: 'You',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      dateRaw: new Date(),
      type: 'me',
      status: 'sending',
    };

    setChatMessages(prev => [...prev, localMsg]);
    setMessage('');
  };

  // --- Dynamic Counterparty and Role Resolution (No Hardcoded Names) ---
  const getCounterpartyInfo = () => {
    const rawBuyer = deal?.buyerCompany || deal?.buyerCompanyId || (typeof deal?.buyer === 'object' ? deal?.buyer : {}) || {};
    const rawSeller = deal?.sellerCompany || deal?.sellerCompanyId || (typeof deal?.seller === 'object' ? deal?.seller : {}) || {};

    const buyer = typeof rawBuyer === 'object' && rawBuyer !== null ? rawBuyer : {};
    const seller = typeof rawSeller === 'object' && rawSeller !== null ? rawSeller : {};

    const buyerName =
      buyer?.companyName ||
      buyer?.name ||
      buyer?.businessName ||
      deal?.buyerName ||
      deal?.buyerCompanyName ||
      deal?.buyer?.name ||
      'Buyer';

    const sellerName =
      seller?.companyName ||
      seller?.name ||
      seller?.businessName ||
      deal?.sellerName ||
      deal?.sellerCompanyName ||
      deal?.seller?.name ||
      'Seller';

    const buyerLogo =
      buyer?.logo ||
      buyer?.logoUrl ||
      buyer?.image ||
      buyer?.companyLogo ||
      buyer?.avatar ||
      deal?.buyerLogo ||
      deal?.buyerCompanyLogo ||
      null;

    const sellerLogo =
      seller?.logo ||
      seller?.logoUrl ||
      seller?.image ||
      seller?.companyLogo ||
      seller?.avatar ||
      deal?.sellerLogo ||
      deal?.sellerCompanyLogo ||
      null;

    const normalizeId = (val) => String(val?._id || val?.id || val || '');
    const sellerCid = normalizeId(deal?.sellerCompanyId);
    const buyerCid = normalizeId(deal?.buyerCompanyId);
    const brokerCid = normalizeId(deal?.brokerCompanyId);

    const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
    const currentUserRole = deal?.currentUserRole || viewerRole;

    const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
    const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());
    const isBroker = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brokerCid && currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()));

    if (isSeller) {
      return {
        partyName: buyerName,
        roleLabel: 'Buyer',
        myRole: 'Seller',
        myName: sellerName,
        counterpartyLogo: buyerLogo,
        myLogo: sellerLogo || currentUserLogo,
        buyerLogo,
        sellerLogo,
      };
    } else if (isBuyer) {
      return {
        partyName: sellerName,
        roleLabel: 'Seller',
        myRole: 'Buyer',
        myName: buyerName,
        counterpartyLogo: sellerLogo,
        myLogo: buyerLogo || currentUserLogo,
        buyerLogo,
        sellerLogo,
      };
    } else if (isBroker) {
      return {
        partyName: `${sellerName} ↔ ${buyerName}`,
        roleLabel: 'Counterparty',
        myRole: 'Broker',
        myName: 'Broker',
        counterpartyLogo: sellerLogo || buyerLogo,
        myLogo: currentUserLogo,
        buyerLogo,
        sellerLogo,
      };
    }

    return {
      partyName: buyerName,
      roleLabel: 'Counterparty',
      myRole: 'Trader',
      myName: currentUserName || sellerName,
      counterpartyLogo: buyerLogo,
      myLogo: sellerLogo || currentUserLogo,
      buyerLogo,
      sellerLogo,
    };
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getMessageDateString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const { partyName, roleLabel, myRole, myName, counterpartyLogo, myLogo, buyerLogo, sellerLogo } = getCounterpartyInfo();

  // --- Dynamic Deal Details (All Derived from Backend Object) ---
  const dealNo =
    deal?.dealNumber ||
    deal?.saudaNumber ||
    deal?.dealNo ||
    (deal?._id ? `DL-${String(deal._id).slice(-6).toUpperCase()}` : (routeData?.dealId ? `DL-${String(routeData.dealId).slice(-6).toUpperCase()}` : ''));

  const dealProducts = Array.isArray(deal?.products) && deal.products.length > 0
    ? deal.products
    : (deal?.product ? [deal.product] : (routeData?.deal?.products || []));
  const firstProd = dealProducts[0] || deal?.product || {};
  const productName =
    firstProd.productId?.name ||
    firstProd.name ||
    (typeof firstProd === 'string' ? firstProd : null) ||
    deal?.title ||
    deal?.dealName ||
    deal?.productName ||
    routeData?.deal?.title ||
    '';

  const productQuantity = Number(firstProd.quantity || deal?.quantity || deal?.qty || 0);
  const productUnit = firstProd.unit || firstProd.unitId?.name || firstProd.unitId?.shortName || deal?.unit || '';
  const dealRate = Number(firstProd.price || deal?.price || deal?.rate || (productQuantity && deal?.totalAmount ? deal.totalAmount / productQuantity : 0));
  const dealTotal = Number(deal?.totalAmount || deal?.grandTotal || (productQuantity && dealRate ? productQuantity * dealRate : 0) || 0);
  const formattedDealTotal = dealTotal > 0 ? `₹${dealTotal.toLocaleString('en-IN')}` : '';

  const rawStatus = String(deal?.status || routeData?.deal?.status || 'Active');
  const dealStatusDisplay = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).replace(/_/g, ' ');

  const counterpartyDetails = myRole === 'Seller'
    ? (deal?.buyerCompany || deal?.buyerCompanyId || {})
    : (deal?.sellerCompany || deal?.sellerCompanyId || {});

  const counterpartyPhone =
    counterpartyDetails?.phone ||
    counterpartyDetails?.mobileNumber ||
    counterpartyDetails?.mobile ||
    counterpartyDetails?.ownerPhone ||
    deal?.buyerPhone ||
    deal?.sellerPhone ||
    '';

  const counterpartyGstin =
    counterpartyDetails?.registrationNumber ||
    counterpartyDetails?.gstin ||
    counterpartyDetails?.gstNumber ||
    '—';

  const counterpartyAddress =
    counterpartyDetails?.address ||
    (counterpartyDetails?.city ? `${counterpartyDetails.city}${counterpartyDetails.state ? ', ' + counterpartyDetails.state : ''}` : '') ||
    '—';

  const deliveryAddress =
    deal?.deliveryLocation ||
    deal?.deliveryAddress ||
    deal?.location ||
    deal?.placeOfDelivery ||
    '—';

  const deliveryTypeStr = deal?.deliveryTerms || deal?.deliveryType || 'Standard Delivery';
  const expectedDeliveryStr = deal?.deliveryDate
    ? new Date(deal.deliveryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const productQualityStr =
    deal?.quality ||
    deal?.variety ||
    firstProd?.grade ||
    firstProd?.variety ||
    '—';

  const paidAmount = Number(deal?.paidAmount || paymentSummary?.totalPaid || paymentSummary?.paidAmount || 0);
  const remainingAmount = Math.max(0, dealTotal - paidAmount);

  const dealCreatedDate = deal?.createdAt ? new Date(deal.createdAt) : null;
  const createdDateStr = dealCreatedDate && !isNaN(dealCreatedDate.getTime())
    ? `${dealCreatedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${dealCreatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : '—';

  const dealUpdatedDate = deal?.updatedAt ? new Date(deal.updatedAt) : null;
  const updatedDateStr = dealUpdatedDate && !isNaN(dealUpdatedDate.getTime())
    ? `${dealUpdatedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${dealUpdatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : '—';

  const dealRemarksStr = deal?.remarks || deal?.notes || deal?.description || '—';

  // Dynamic payment preset amounts based on actual deal amount
  const targetPayable = remainingAmount > 0 ? remainingAmount : dealTotal;
  const paymentPresets = targetPayable > 0 ? [
    Math.round(targetPayable * 0.25),
    Math.round(targetPayable * 0.5),
    Math.round(targetPayable),
  ].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : [];

  // Extract product image (if multiple products in deal, pick the first one with an available image)
  const getProductImageUri = useCallback((d) => {
    if (!d) return null;
    const prods = Array.isArray(d.products) && d.products.length > 0
      ? d.products
      : (d.product ? [d.product] : []);

    for (const p of prods) {
      if (!p) continue;
      const pObj = p.productId && typeof p.productId === 'object' ? p.productId : null;
      const candidate =
        p.image ||
        p.imageUrl ||
        p.productImage ||
        (Array.isArray(p.images) && p.images[0]) ||
        pObj?.image ||
        pObj?.imageUrl ||
        pObj?.productImage ||
        (Array.isArray(pObj?.images) && pObj.images[0]);

      if (candidate) {
        return resolveImageUrl(candidate);
      }
    }

    const directCandidate =
      d.productImage ||
      d.image ||
      (Array.isArray(d.images) && d.images[0]) ||
      d.product?.image ||
      d.product?.imageUrl;

    return directCandidate ? resolveImageUrl(directCandidate) : null;
  }, []);

  const productImgUrl = useMemo(() => {
    return getProductImageUri(deal) || getProductImageUri(routeData?.deal) || null;
  }, [deal, routeData?.deal, getProductImageUri]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1541D8" />
        <Text style={styles.loadingText}>Opening secure chat...</Text>
      </SafeAreaView>
    );
  }

  const renderMessageItem = ({ item, index }) => {
    const prevMsg = index > 0 ? chatMessages[index - 1] : null;
    const showDateSeparator = !prevMsg || getMessageDateString(item.dateRaw) !== getMessageDateString(prevMsg.dateRaw);
    const isMe = item.type === 'me';

    const cleanTxt = sanitizeSystemMessage(item.text || '').toLowerCase();
    const isSystemPaymentMsg =
      item.type === 'payment' ||
      item.text.startsWith('💸') ||
      (cleanTxt.includes('payment') &&
        (cleanTxt.includes('entry of') ||
         cleanTxt.includes('payment recorded') ||
         cleanTxt.includes('payment received') ||
         cleanTxt.includes('payment approved') ||
         cleanTxt.includes('pending seller approval') ||
         cleanTxt.includes('pending buyer approval') ||
         cleanTxt.includes('verification') ||
         cleanTxt.includes('initiated') ||
         cleanTxt.includes('payment given') ||
         cleanTxt.includes('payment rejected')));

    const matchedPayment = isSystemPaymentMsg
      ? findMatchingPayment(item.text, item.dateRaw, dealPayments)
      : null;
    const { amount, method, notes } = isSystemPaymentMsg
      ? parsePaymentMessage(item.text)
      : { amount: '', method: '', notes: '' };

    const isPaymentAlert = isSystemPaymentMsg && !cleanTxt.includes('proforma invoice');

    // 1. Payment Card Bubble (Dynamic Data)
    if (isPaymentAlert) {
      const isApproved = cleanTxt.includes('approved') || cleanTxt.includes('received') || (matchedPayment && matchedPayment.status === 'approved');
      const isPending = !isApproved && (!matchedPayment || matchedPayment.status === 'pending');
      const rawAmt = amount || (matchedPayment?.amount ? String(matchedPayment.amount) : '');
      const amtDisplay = rawAmt
        ? `₹ ${parseFloat(String(rawAmt).replace(/,/g, '')).toLocaleString('en-IN')}`
        : (matchedPayment?.amount ? `₹ ${parseFloat(matchedPayment.amount).toLocaleString('en-IN')}` : (formattedDealTotal || ''));
      const txnDisplay = matchedPayment?.transactionId || matchedPayment?.referenceNumber || (matchedPayment?._id ? `TXN${String(matchedPayment._id).slice(-8).toUpperCase()}` : (item.id && isNaN(Number(item.id)) ? `TXN${item.id.slice(-8).toUpperCase()}` : 'TXN' + String(Date.now()).slice(-8)));
      const remarksDisplay = notes || matchedPayment?.notes || (!isSystemPaymentMsg && item.text && !cleanTxt.startsWith('payment recorded') ? item.text : '');
      const paymentMethodDisplay = method || matchedPayment?.paymentMethod || 'UPI';
      const showApproveReject = isPending && ((myRole === 'Seller' && !isMe) || (myRole === 'Buyer' && isMe === false));

      const senderDisplay = isMe ? myName : partyName;
      const roleDisplay = isMe ? myRole : roleLabel;

      return (
        <View style={styles.msgWrapper}>
          {showDateSeparator && getMessageDateString(item.dateRaw) !== '' && (
            <View style={styles.dateSeparatorRow}>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{getMessageDateString(item.dateRaw)}</Text>
              </View>
            </View>
          )}

          <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
            {!isMe && (
              <View style={[styles.avatarCircle, styles.avatarCircleCounterparty]}>
                {counterpartyLogo ? (
                  <Image
                    source={{ uri: resolveImageUrl(counterpartyLogo) }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarCircleText}>{getInitials(partyName)}</Text>
                )}
              </View>
            )}

            <View style={[styles.cardBubbleContainer, isMe ? styles.cardBubbleMe : styles.cardBubbleOther]}>
              <View style={styles.bubbleSenderRow}>
                <Text style={styles.bubbleSenderName}>{senderDisplay}</Text>
                <View style={[styles.rolePill, roleDisplay === 'Buyer' ? styles.rolePillBuyer : styles.rolePillSeller]}>
                  <Text style={[styles.rolePillText, roleDisplay === 'Buyer' ? styles.rolePillTextBuyer : styles.rolePillTextSeller]}>
                    {roleDisplay}
                  </Text>
                </View>
              </View>

              <View style={[styles.paymentInnerCard, isApproved && styles.paymentInnerCardApproved]}>
                <View style={styles.paymentCardHeader}>
                  <View style={styles.paymentCardHeaderLeft}>
                    <View style={[styles.rupeeCircle, isApproved ? styles.rupeeCircleGreen : styles.rupeeCircleOrange]}>
                      {isApproved ? (
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      ) : (
                        <Text style={styles.rupeeCircleText}>₹</Text>
                      )}
                    </View>
                    <Text style={styles.paymentCardTitle} numberOfLines={1}>
                      {isApproved ? 'Payment Received' : 'Payment Recorded'}
                    </Text>
                  </View>

                  <View style={[styles.statusTag, isApproved ? styles.statusTagApproved : styles.statusTagPending]}>
                    {isApproved ? (
                      <Check size={11} color="#15803D" strokeWidth={2.8} style={{ marginRight: 4 }} />
                    ) : (
                      <Clock size={11} color="#D97706" strokeWidth={2.5} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.statusTagText, isApproved ? styles.statusTagTextApproved : styles.statusTagTextPending]}>
                      {isApproved ? 'Approved' : 'Pending Verification'}
                    </Text>
                  </View>
                </View>

                {amtDisplay !== '' && (
                  <View style={styles.paymentAmountRow}>
                    <Text style={styles.paymentAmountBig}>{amtDisplay}</Text>
                    {paymentMethodDisplay ? (
                      <View style={styles.paymentMethodPill}>
                        <Text style={styles.paymentMethodPillText}>{paymentMethodDisplay}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View style={styles.paymentDetailsTable}>
                  {txnDisplay !== '' && (
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.paymentDetailKey}>Txn ID</Text>
                      <TouchableOpacity
                        style={styles.paymentCopyRow}
                        onPress={() => Alert.alert('Copied', `Transaction ID ${txnDisplay} copied!`)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={styles.paymentDetailVal}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {txnDisplay}
                        </Text>
                        <Copy size={13} color="#2563EB" style={{ marginLeft: 5, flexShrink: 0 }} />
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.paymentDetailRow}>
                    <Text style={styles.paymentDetailKey}>Date</Text>
                    <Text style={styles.paymentDetailVal} numberOfLines={1} ellipsizeMode="tail">
                      {item.dateRaw ? new Date(item.dateRaw).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}, {item.time}
                    </Text>
                  </View>

                  {remarksDisplay !== '' && (
                    <View style={styles.paymentDetailRow}>
                      <Text style={styles.paymentDetailKey}>Remark</Text>
                      <Text style={styles.paymentDetailVal} numberOfLines={2}>{remarksDisplay}</Text>
                    </View>
                  )}
                </View>

                {/* Proof attachment if exists on payment record */}
                {(matchedPayment?.attachmentUrl || matchedPayment?.receiptUrl) && (
                  <View style={styles.docAttachmentBox}>
                    <View style={styles.docAttachmentLeft}>
                      <View style={styles.pdfIconBadge}>
                        <Text style={styles.pdfIconText}>DOC</Text>
                      </View>
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.docFileName} numberOfLines={1}>Payment_Receipt</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.docDownloadBtn}
                      onPress={() => Linking.openURL(matchedPayment.attachmentUrl || matchedPayment.receiptUrl).catch(() => Alert.alert('Receipt', 'Unable to open document'))}
                      activeOpacity={0.7}
                    >
                      <Download size={16} color="#1541D8" />
                    </TouchableOpacity>
                  </View>
                )}

                {showApproveReject && matchedPayment && (
                  <View style={styles.paymentApprovalButtons}>
                    <TouchableOpacity
                      style={[styles.approvalBtn, styles.approveBtn]}
                      onPress={() => handleUpdatePaymentStatus(matchedPayment._id, 'approved')}
                      activeOpacity={0.8}
                    >
                      <Check size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.approveBtnText}>Approve Payment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approvalBtn, styles.rejectBtn]}
                      onPress={() => handleUpdatePaymentStatus(matchedPayment._id, 'rejected')}
                      activeOpacity={0.8}
                    >
                      <X size={15} color="#DC2626" style={{ marginRight: 6 }} />
                      <Text style={styles.rejectBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.bubbleFooter}>
                <Text style={styles.bubbleTime}>{item.time}</Text>
                {isMe && (
                  <View style={styles.checkDoubleRow}>
                    <Text style={[styles.checkDoubleText, item.status === 'read' ? styles.checkBlue : styles.checkGrey]}>
                      ✓✓
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {isMe && (
              <View style={[styles.avatarCircle, styles.avatarCircleMe]}>
                {myLogo ? (
                  <Image
                    source={{ uri: resolveImageUrl(myLogo) }}
                    style={styles.avatarImg}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.avatarCircleTextMe}>{getInitials(myName)}</Text>
                )}
              </View>
            )}
          </View>
        </View>
      );
    }

    // 2. Regular Message Bubble
    const senderDisplay = isMe ? myName : partyName;
    const roleDisplay = isMe ? myRole : roleLabel;

    return (
      <View style={styles.msgWrapper}>
        {showDateSeparator && getMessageDateString(item.dateRaw) !== '' && (
          <View style={styles.dateSeparatorRow}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{getMessageDateString(item.dateRaw)}</Text>
            </View>
          </View>
        )}

        <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
          {!isMe && (
            <View style={[styles.avatarCircle, styles.avatarCircleCounterparty]}>
              {counterpartyLogo ? (
                <Image
                  source={{ uri: resolveImageUrl(counterpartyLogo) }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarCircleText}>{getInitials(partyName)}</Text>
              )}
            </View>
          )}

          <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
            <View style={styles.bubbleSenderRow}>
              <Text
                style={[
                  styles.bubbleSenderName,
                  isMe ? styles.bubbleSenderNameMe : styles.bubbleSenderNameOther,
                ]}
                numberOfLines={1}
              >
                {senderDisplay}
              </Text>
              <View style={[styles.rolePill, roleDisplay === 'Buyer' ? styles.rolePillBuyer : styles.rolePillSeller]}>
                <Text style={[styles.rolePillText, roleDisplay === 'Buyer' ? styles.rolePillTextBuyer : styles.rolePillTextSeller]}>
                  {roleDisplay}
                </Text>
              </View>
            </View>

            {Boolean(item.mediaUrl) && (
              <ChatMessageImage
                mediaUrl={item.mediaUrl}
                onImagePress={(uri) => setFullPreviewImage(uri)}
              />
            )}

            {item.text ? (
              <Text
                style={[
                  styles.chatMessageText,
                  isMe ? styles.chatMessageTextMe : styles.chatMessageTextOther,
                ]}
              >
                {item.text}
              </Text>
            ) : null}

            <View style={styles.bubbleFooter}>
              <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                {item.time}
              </Text>
              {isMe && (
                <View style={styles.checkDoubleRow}>
                  <Text style={[styles.checkDoubleText, item.status === 'read' ? styles.checkBlue : styles.checkGrey]}>
                    ✓✓
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isMe && (
            <View style={[styles.avatarCircle, styles.avatarCircleMe]}>
              {myLogo ? (
                <Image
                  source={{ uri: resolveImageUrl(myLogo) }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarCircleTextMe}>{getInitials(myName)}</Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ─── 0. SUCCESS POPUP TOAST (Auto-closes in 2s) ─── */}
      {successToast && (
        <TouchableOpacity
          style={styles.successToastContainer}
          activeOpacity={0.9}
          onPress={() => setSuccessToast(null)}
        >
          <View style={styles.successToastCard}>
            <View style={styles.successToastIconWrap}>
              <CheckCircle size={22} color="#10B981" strokeWidth={2.5} />
            </View>
            <View style={styles.successToastTextCol}>
              <Text style={styles.successToastTitle}>{successToast.title}</Text>
              {successToast.message ? (
                <Text style={styles.successToastSubtitle} numberOfLines={1}>
                  {successToast.message}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setSuccessToast(null)}
              style={styles.successToastCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={16} color="#059669" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* ─── 1. TOP HEADER ─── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#1E293B" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Product / Counterparty Avatar */}
        <View style={styles.headerAvatarWrap}>
          {counterpartyLogo ? (
            <Image
              source={{ uri: resolveImageUrl(counterpartyLogo) }}
              style={styles.headerAvatarImage}
              resizeMode="cover"
            />
          ) : productImgUrl ? (
            <Image
              source={{ uri: productImgUrl }}
              style={styles.headerAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarFallbackText}>{getInitials(partyName)}</Text>
            </View>
          )}
        </View>

        <View style={styles.headerDetailsCol}>
          <View style={styles.headerRow1}>
            {dealNo !== '' && (
              <Text style={styles.headerDealNo} numberOfLines={1}>
                {dealNo.startsWith('#') ? dealNo : `#${dealNo}`}
              </Text>
            )}
            {productImgUrl && !headerProductImgError ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsDealDetailsModalVisible(true)}
                style={styles.headerProductThumbWrap}
              >
                <Image
                  source={{ uri: productImgUrl }}
                  style={styles.headerProductThumb}
                  resizeMode="cover"
                  onError={() => setHeaderProductImgError(true)}
                />
              </TouchableOpacity>
            ) : null}
            <View style={styles.headerStatusBadge}>
              <Text style={styles.headerStatusBadgeText}>{dealStatusDisplay}</Text>
            </View>
          </View>

          <View style={styles.headerRow2}>
            {productName !== '' && (
              <Text style={styles.headerSubInfo} numberOfLines={1}>
                {productName}
              </Text>
            )}
            <View style={styles.onlineIndicatorRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>{onlineStatus === 'online' ? 'Online' : 'Active'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRightButtons}>
          <TouchableOpacity
            style={styles.headerSquareBtn}
            onPress={() => {
              if (counterpartyPhone) {
                Linking.openURL(`tel:${counterpartyPhone.replace(/[^0-9+]/g, '')}`).catch(() => {
                  Alert.alert('Contact', `Phone: ${counterpartyPhone}`);
                });
              } else {
                Alert.alert('Contact', `No phone number registered for ${partyName}`);
              }
            }}
            activeOpacity={0.7}
          >
            <Phone size={18} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerSquareBtn}
            onPress={() => setIsDealDetailsModalVisible(true)}
            activeOpacity={0.7}
          >
            <MoreVertical size={19} color="#1E293B" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── 2. SUBHEADER 4 QUICK TABS BAR ─── */}
      <View style={styles.quickTabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickTabsScrollContent}
        >
          <TouchableOpacity
            style={[styles.quickTabPill, activeTab === 'chat' && styles.quickTabPillChatActive]}
            onPress={() => setActiveTab('chat')}
            activeOpacity={0.8}
          >
            <FileText size={14} color="#1541D8" style={{ marginRight: 5 }} />
            <Text style={styles.quickTabPillTextChatActive}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickTabPill, styles.quickTabPillPayment]}
            onPress={() => {
              setPaymentType(myRole === 'Buyer' ? 'sent' : 'received');
              setIsPaymentModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.rupeeGreenSymbol}>₹</Text>
            <Text style={styles.quickTabPillTextPayment}>+ Add Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickTabPill, styles.quickTabPillDelivery]}
            onPress={() => {
              setDeliveryType(myRole === 'Seller' ? 'sent' : 'received');
              setIsDeliveryModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Truck size={14} color="#F97316" style={{ marginRight: 5 }} />
            <Text style={styles.quickTabPillTextDelivery}>+ Add Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickTabPill, styles.quickTabPillDetails]}
            onPress={() => setIsDealDetailsModalVisible(true)}
            activeOpacity={0.8}
          >
            <FileText size={14} color="#334155" style={{ marginRight: 5 }} />
            <Text style={styles.quickTabPillTextDetails}>Deal Details</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ─── 3. CHAT MESSAGES STREAM ─── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatArea}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {chatMessages.length === 0 ? (
          <ScrollView contentContainerStyle={styles.emptyContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Handshake size={36} color="#1541D8" />
              </View>
              <Text style={styles.emptyTitle}>Trade Channel Ready</Text>
              <Text style={styles.emptySubtitle}>
                Negotiate terms, confirm dispatches, and log verified payments directly inside this deal chat.
              </Text>
              <View style={styles.quickChipsRow}>
                {['Confirm delivery schedule', 'Share specifications', 'Discuss advance payment'].map((chip, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => setMessage(chip)}
                  >
                    <Text style={styles.suggestionChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : (
          <FlatList
            ref={flatListRef}
            data={chatMessages}
            renderItem={renderMessageItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {isCounterpartyTyping && (
          <View style={styles.typingIndicatorRow}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDot}>•</Text>
              <Text style={styles.typingDot}>•</Text>
              <Text style={styles.typingDot}>•</Text>
              <Text style={styles.typingText}>{partyName} is typing...</Text>
            </View>
          </View>
        )}

        {/* ─── 4. BOTTOM INPUT BAR ─── */}
        <View style={styles.bottomBarContainer}>
          {showAttachMenu && (
            <View style={styles.attachMenuPopup}>
              <TouchableOpacity
                style={styles.attachMenuItem}
                onPress={() => handleSelectPaymentAction('sent')}
                activeOpacity={0.7}
              >
                <CreditCard size={16} color="#10B981" style={{ marginRight: 10 }} />
                <Text style={styles.attachMenuItemText}>Send Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachMenuItem}
                onPress={() => handleSelectPaymentAction('received')}
                activeOpacity={0.7}
              >
                <CheckCircle size={16} color="#10B981" style={{ marginRight: 10 }} />
                <Text style={styles.attachMenuItemText}>Receive Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachMenuItem}
                onPress={() => handleSelectDeliveryAction('sent')}
                activeOpacity={0.7}
              >
                <Truck size={16} color="#3B82F6" style={{ marginRight: 10 }} />
                <Text style={styles.attachMenuItemText}>Record Dispatch</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachMenuItem}
                onPress={() => handleSelectDeliveryAction('received')}
                activeOpacity={0.7}
              >
                <Download size={16} color="#3B82F6" style={{ marginRight: 10 }} />
                <Text style={styles.attachMenuItemText}>Confirm Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.attachMenuItem}
                onPress={() => {
                  setShowAttachMenu(false);
                  handleSelectImageSource();
                }}
                activeOpacity={0.7}
              >
                <Camera size={16} color="#6366F1" style={{ marginRight: 10 }} />
                <Text style={styles.attachMenuItemText}>Upload / Send Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputControlsRow}>
            <TouchableOpacity
              style={styles.plusCircleBtn}
              onPress={() => setShowAttachMenu(prev => !prev)}
              activeOpacity={0.7}
            >
              <Plus size={20} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.inputCapsule}>
              <TextInput
                style={styles.mainTextInput}
                placeholder="Type a message..."
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={handleInputChange}
                multiline
              />
              <TouchableOpacity
                style={styles.iconInsideInput}
                onPress={handleSelectImageSource}
                activeOpacity={0.7}
              >
                {isUploadingChatImage ? (
                  <ActivityIndicator size="small" color="#1541D8" />
                ) : (
                  <Camera size={20} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.micCircleBtn,
                !message.trim() && { backgroundColor: '#93C5FD' },
              ]}
              onPress={() => {
                if (message.trim()) {
                  handleSend();
                }
              }}
              disabled={!message.trim()}
              activeOpacity={0.85}
            >
              <Send size={18} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ─── 5. MAKE PAYMENT MODAL ─── */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHandleBar} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Make Payment</Text>
                {dealNo !== '' && <Text style={styles.sheetSubtitle}>Deal #{dealNo}</Text>}
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsPaymentModalVisible(false)}
              >
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Amount</Text>
              <View style={styles.largeAmountBox}>
                <Text style={styles.largeRupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.largeAmountInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              {paymentPresets.length > 0 && (
                <View style={styles.amountPresetsRow}>
                  {paymentPresets.map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.presetChip,
                        paymentAmount === String(val) && styles.presetChipActive
                      ]}
                      onPress={() => setPaymentAmount(String(val))}
                    >
                      <Text style={[
                        styles.presetChipText,
                        paymentAmount === String(val) && styles.presetChipTextActive
                      ]}>
                        ₹ {Number(val).toLocaleString('en-IN')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.presetChip, !paymentPresets.map(String).includes(paymentAmount) && styles.presetChipActive]}
                    onPress={() => setPaymentAmount('')}
                  >
                    <Text style={[
                      styles.presetChipText,
                      !paymentPresets.map(String).includes(paymentAmount) && styles.presetChipTextActive
                    ]}>
                      Custom
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Payment Method</Text>
              <View style={styles.paymentMethodsGroup}>
                <TouchableOpacity
                  style={[styles.methodRadioItem, paymentMethod === 'UPI' && styles.methodRadioItemActive]}
                  onPress={() => setPaymentMethod('UPI')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, paymentMethod === 'UPI' && styles.radioCircleActive]}>
                    {paymentMethod === 'UPI' && <View style={styles.radioInnerDot} />}
                  </View>
                  <View style={styles.paymentMethodIconWrap}>
                    <SvgXml xml={UPI_ICON_SVG} width={20} height={20} />
                  </View>
                  <Text style={styles.methodRadioTitle}>UPI (Google Pay, PhonePe, Paytm, etc.)</Text>
                  <View style={styles.upiBadgesRow}>
                    <SvgXml xml={GOOGLE_PAY_SVG} width={20} height={20} />
                    <SvgXml xml={PHONE_PE_SVG} width={20} height={20} />
                    <SvgXml xml={PAYTM_SVG} width={28} height={16} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodRadioItem, paymentMethod === 'Card' && styles.methodRadioItemActive]}
                  onPress={() => setPaymentMethod('Card')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, paymentMethod === 'Card' && styles.radioCircleActive]}>
                    {paymentMethod === 'Card' && <View style={styles.radioInnerDot} />}
                  </View>
                  <View style={styles.paymentMethodIconWrap}>
                    <Image
                      source={CARD_IMG}
                      style={styles.paymentMethodIconImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.methodRadioTitle}>Credit / Debit Card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodRadioItem, paymentMethod === 'Net Banking' && styles.methodRadioItemActive]}
                  onPress={() => setPaymentMethod('Net Banking')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radioCircle, paymentMethod === 'Net Banking' && styles.radioCircleActive]}>
                    {paymentMethod === 'Net Banking' && <View style={styles.radioInnerDot} />}
                  </View>
                  <View style={styles.paymentMethodIconWrap}>
                    <Image
                      source={BANKING_IMG}
                      style={styles.paymentMethodIconImg}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.methodRadioTitle}>Net Banking</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Remarks (Optional)</Text>
              <View style={styles.remarksContainer}>
                <TextInput
                  style={styles.remarksInput}
                  placeholder="Enter remarks..."
                  placeholderTextColor="#94A3B8"
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                  maxLength={100}
                />
                <Text style={styles.remarksCountText}>{paymentNotes.length}/100</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={handleLogPayment}
                disabled={isLoggingPayment}
                activeOpacity={0.85}
              >
                {isLoggingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Lock size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryModalBtnText}>
                      Pay ₹ {paymentAmount ? Number(paymentAmount).toLocaleString('en-IN') : '0'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── 6. ADD DELIVERY MODAL ─── */}
      <Modal
        visible={isDeliveryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDeliveryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.bottomSheetCard}>
            <View style={styles.sheetHandleBar} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.truckIconCircle}>
                  <Truck size={20} color="#EA580C" />
                </View>
                <View style={styles.sheetHeaderTitlesCol}>
                  <Text style={styles.sheetTitle}>Add Delivery</Text>
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>
                    {[dealNo ? `Deal #${dealNo}` : null, partyName].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsDeliveryModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Items to Deliver</Text>
              <View style={styles.itemsDeliverBox}>
                {productImgUrl ? (
                  <Image
                    source={{ uri: productImgUrl }}
                    style={styles.itemThumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemThumbImage, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Package size={20} color="#1541D8" />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemDeliverTitle}>{productName || 'Deal Item'}</Text>
                  <Text style={styles.itemDeliverSub}>{productQuantity > 0 ? `${productQuantity} ${productUnit}`.trim() : 'Units'}</Text>
                </View>
                <ChevronRight size={20} color="#94A3B8" />
              </View>

              <View style={styles.formGridRow}>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>Quantity to Deliver *</Text>
                  <View style={styles.inputWithUnitBox}>
                    <TextInput
                      style={styles.inputInBox}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={deliveryQuantity}
                      onChangeText={setDeliveryQuantity}
                    />
                    <Text style={styles.unitSuffixText}>{productUnit || 'Units'}</Text>
                  </View>
                </View>

                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>Vehicle Number (Optional)</Text>
                  <TextInput
                    style={styles.regularInputBox}
                    placeholder="e.g. DL01AB1234"
                    placeholderTextColor="#94A3B8"
                    value={deliveryVehicleNumber}
                    onChangeText={setDeliveryVehicleNumber}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              <View style={styles.formGridRow}>
                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>Dispatch Date *</Text>
                  <TextInput
                    style={styles.regularInputBox}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={deliveryDispatchDate}
                    onChangeText={setDeliveryDispatchDate}
                  />
                </View>

                <View style={styles.formGridCol}>
                  <Text style={styles.fieldLabel}>Expected Delivery Date</Text>
                  <TextInput
                    style={styles.regularInputBox}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94A3B8"
                    value={deliveryExpectedDate}
                    onChangeText={setDeliveryExpectedDate}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Attach Documents (Optional)</Text>
              <TouchableOpacity
                style={styles.attachDocsCard}
                onPress={() => Alert.alert('Upload Document', 'Select delivery challan or LR receipt (Max 5MB)')}
                activeOpacity={0.7}
              >
                <Paperclip size={18} color="#1541D8" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachDocsTitle}>Upload LR / Delivery Challan</Text>
                  <Text style={styles.attachDocsSub}>PDF, JPG, PNG (Max 5 MB)</Text>
                </View>
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Remarks (Optional)</Text>
              <View style={styles.remarksContainer}>
                <TextInput
                  style={styles.remarksInput}
                  placeholder="Enter remarks..."
                  placeholderTextColor="#94A3B8"
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                  maxLength={200}
                />
                <Text style={styles.remarksCountText}>{deliveryNotes.length}/200</Text>
              </View>

              <TouchableOpacity
                style={styles.primaryModalBtn}
                onPress={handleLogDelivery}
                disabled={isLoggingDelivery}
                activeOpacity={0.85}
              >
                {isLoggingDelivery ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Truck size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryModalBtnText}>Add Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── 7. DEAL DETAILS MODAL ─── */}
      <Modal
        visible={isDealDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDealDetailsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.bottomSheetCard, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandleBar} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.docIconCircle}>
                  <FileText size={20} color="#1541D8" />
                </View>
                <View style={styles.sheetHeaderTitlesCol}>
                  <Text style={styles.sheetTitle}>Deal Details</Text>
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>
                    {[dealNo ? `#${dealNo}` : null, createdDateStr !== '—' ? `Created on ${createdDateStr}` : null].filter(Boolean).join(' • ')}
                  </Text>
                </View>
              </View>

              <View style={styles.sheetHeaderRight}>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setIsDealDetailsModalVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color="#1E293B" />
                </TouchableOpacity>
                <View style={styles.approvedPillGreen}>
                  <Check size={11} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 4 }} />
                  <Text style={styles.approvedPillGreenText}>{dealStatusDisplay}</Text>
                </View>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sheetSectionCard}>
                <View style={styles.sheetSectionHeader}>
                  <Text style={styles.sheetSectionTitle}>{roleLabel} Details</Text>
                </View>
                <View style={styles.partyProfileRow}>
                  <View style={styles.partyAvatarRound}>
                    {counterpartyLogo ? (
                      <Image
                        source={{ uri: resolveImageUrl(counterpartyLogo) }}
                        style={styles.partyAvatarImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.partyAvatarText}>{getInitials(partyName)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.partyNameBold}>{partyName}</Text>
                    {counterpartyGstin !== '—' && <Text style={styles.partyGstinText}>GSTIN: {counterpartyGstin}</Text>}
                    {counterpartyAddress !== '—' && <Text style={styles.partyLocationText}>{counterpartyAddress}</Text>}
                    {counterpartyPhone !== '' && <Text style={styles.partyPhoneText}>📞 {counterpartyPhone}</Text>}
                  </View>
                  <TouchableOpacity
                    style={styles.viewProfileBtn}
                    onPress={() => {
                      setIsDealDetailsModalVisible(false);
                      onNavigate('DealDetails', { dealId: deal?._id || dealId, deal });
                    }}
                  >
                    <Text style={styles.viewProfileBtnText}>View Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.sheetSectionCard}>
                <View style={styles.sheetSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Package size={16} color="#1541D8" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSectionTitle}>
                      {dealProducts.length > 1 ? `Products (${dealProducts.length})` : 'Product Details'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsDealDetailsModalVisible(false);
                      onNavigate('DealDetails', { dealId: deal?._id || dealId, deal });
                    }}
                  >
                    <Text style={styles.editLinkText}>✎ Edit</Text>
                  </TouchableOpacity>
                </View>

                {dealProducts.length > 1 ? (
                  <View style={styles.multiProductListContainer}>
                    {dealProducts.map((p, pIdx) => {
                      const pObj = p?.productId && typeof p?.productId === 'object' ? p.productId : {};
                      const pName = pObj?.name || p?.name || p?.productName || `Product #${pIdx + 1}`;
                      const pImgCandidate =
                        p?.image ||
                        p?.imageUrl ||
                        p?.productImage ||
                        (Array.isArray(p?.images) && p.images[0]) ||
                        pObj?.image ||
                        pObj?.imageUrl ||
                        pObj?.productImage ||
                        (Array.isArray(pObj?.images) && pObj.images[0]);
                      const pImg = pImgCandidate ? resolveImageUrl(pImgCandidate) : null;
                      const pQty = Number(p?.quantity || p?.qty || 0);
                      const pUnit = p?.unit || p?.unitName || p?.unitId?.name || p?.unitId?.shortName || pObj?.unit || productUnit || '';
                      const pRate = Number(p?.price || p?.rate || pObj?.price || 0);
                      const pTotal = Number(p?.totalAmount || (pQty && pRate ? pQty * pRate : 0));
                      const pGrade = p?.grade || p?.variety || pObj?.grade || pObj?.variety || '';

                      return (
                        <View key={p?._id || p?.id || `mp_${pIdx}`} style={[styles.multiProdItemCard, pIdx > 0 && styles.multiProdItemBorder]}>
                          <View style={styles.productRow}>
                            {pImg ? (
                              <Image source={{ uri: pImg }} style={styles.productThumb} resizeMode="cover" />
                            ) : (
                              <View style={[styles.productThumb, { alignItems: 'center', justifyContent: 'center' }]}>
                                <Package size={20} color="#1541D8" />
                              </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.prodNameMain}>{pName}</Text>
                              {pGrade !== '' && <Text style={styles.prodQuality}>{pGrade}</Text>}
                            </View>
                          </View>

                          <View style={styles.prodStatsGrid}>
                            <View style={styles.prodStatCol}>
                              <Text style={styles.statKey}>Quantity</Text>
                              <Text style={styles.statVal}>{pQty > 0 ? `${pQty} ${pUnit}`.trim() : '—'}</Text>
                            </View>
                            <View style={styles.prodStatCol}>
                              <Text style={styles.statKey}>Unit</Text>
                              <Text style={styles.statVal}>{pUnit || '—'}</Text>
                            </View>
                            <View style={styles.prodStatCol}>
                              <Text style={styles.statKey}>Rate</Text>
                              <Text style={styles.statVal}>{pRate > 0 ? `₹${pRate.toLocaleString('en-IN')}` : '—'}</Text>
                            </View>
                            <View style={styles.prodStatCol}>
                              <Text style={styles.statKey}>Total</Text>
                              <Text style={[styles.statVal, { color: '#0F172A', fontWeight: '800' }]}>
                                {pTotal > 0 ? `₹${pTotal.toLocaleString('en-IN')}` : '—'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <>
                    <View style={styles.productRow}>
                      {productImgUrl ? (
                        <Image
                          source={{ uri: productImgUrl }}
                          style={styles.productThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.productThumb, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Package size={20} color="#1541D8" />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.prodNameMain}>{productName || 'Deal Item'}</Text>
                        {productQualityStr !== '—' && <Text style={styles.prodQuality}>{productQualityStr}</Text>}
                      </View>
                    </View>

                    <View style={styles.prodStatsGrid}>
                      <View style={styles.prodStatCol}>
                        <Text style={styles.statKey}>Quantity</Text>
                        <Text style={styles.statVal}>{productQuantity > 0 ? `${productQuantity} ${productUnit}`.trim() : '—'}</Text>
                      </View>
                      <View style={styles.prodStatCol}>
                        <Text style={styles.statKey}>Unit</Text>
                        <Text style={styles.statVal}>{productUnit || '—'}</Text>
                      </View>
                      <View style={styles.prodStatCol}>
                        <Text style={styles.statKey}>Rate</Text>
                        <Text style={styles.statVal}>{dealRate > 0 ? `₹${dealRate.toLocaleString('en-IN')}` : '—'}</Text>
                      </View>
                      <View style={styles.prodStatCol}>
                        <Text style={styles.statKey}>Total</Text>
                        <Text style={[styles.statVal, { color: '#0F172A', fontWeight: '800' }]}>{formattedDealTotal || '—'}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.sheetSectionCard}>
                <View style={styles.sheetSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Truck size={16} color="#1541D8" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSectionTitle}>Delivery Details</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsDealDetailsModalVisible(false);
                      onNavigate('DealDetails', { dealId: deal?._id || dealId, deal });
                    }}
                  >
                    <Text style={styles.editLinkText}>✎ Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.deliveryStatsRow}>
                  <View style={styles.deliveryCol}>
                    <Text style={styles.statKey}>Delivery Type</Text>
                    <Text style={styles.statVal}>{deliveryTypeStr}</Text>
                  </View>
                  <View style={styles.deliveryCol}>
                    <Text style={styles.statKey}>Expected Date</Text>
                    <Text style={styles.statVal}>{expectedDeliveryStr}</Text>
                  </View>
                  <View style={styles.deliveryCol}>
                    <Text style={styles.statKey}>Delivery Address</Text>
                    <Text style={styles.statVal}>{deliveryAddress}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sheetSectionCard}>
                <View style={styles.sheetSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <CreditCard size={16} color="#1541D8" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSectionTitle}>Payment Details</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewPaymentsLinkBtn}
                    onPress={() => {
                      setIsDealDetailsModalVisible(false);
                      onNavigate('TransactionHistory', { dealId: deal?._id || dealId });
                    }}
                  >
                    <Text style={styles.viewPaymentsLinkText}>View Ledger</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.paymentStatsGrid}>
                  <View style={styles.paymentStatCol}>
                    <Text style={styles.statKey}>Total</Text>
                    <Text style={[styles.statVal, { color: '#0F172A', fontWeight: '800' }]}>{formattedDealTotal || '₹0'}</Text>
                  </View>
                  <View style={styles.paymentStatCol}>
                    <Text style={styles.statKey}>Paid</Text>
                    <Text style={[styles.statVal, { color: '#16A34A', fontWeight: '800' }]}>₹{paidAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.paymentStatCol}>
                    <Text style={styles.statKey}>Remaining</Text>
                    <Text style={[styles.statVal, { color: '#EA580C', fontWeight: '800' }]}>₹{remainingAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sheetSectionCard}>
                <View style={styles.sheetSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Info size={16} color="#1541D8" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSectionTitle}>Additional Information</Text>
                  </View>
                </View>

                <View style={styles.additionalGrid}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statKey}>Created</Text>
                    <Text style={styles.statVal}>{createdDateStr}</Text>
                    <Text style={[styles.statKey, { marginTop: 8 }]}>Updated</Text>
                    <Text style={styles.statVal}>{updatedDateStr}</Text>
                    <Text style={[styles.statKey, { marginTop: 8 }]}>Status</Text>
                    <View style={[styles.headerStatusBadge, { alignSelf: 'flex-start', marginTop: 3 }]}>
                      <Text style={styles.headerStatusBadgeText}>{dealStatusDisplay}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={styles.statKey}>Remarks</Text>
                    <Text style={styles.statVal}>{dealRemarksStr}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.dealSummaryButtonsRow}>
                <TouchableOpacity
                  style={styles.downloadSummaryOutlineBtn}
                  onPress={() => Alert.alert('Deal Summary', `Agreement summary for #${dealNo}`)}
                  activeOpacity={0.8}
                >
                  <Download size={16} color="#1541D8" style={{ marginRight: 6 }} />
                  <Text style={styles.downloadSummaryOutlineText}>Download Summary</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.shareDealSolidBtn}
                  onPress={() => Alert.alert('Share Deal', `Sharing agreement #${dealNo}`)}
                  activeOpacity={0.8}
                >
                  <Share2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.shareDealSolidText}>Share Deal</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── FULL-SCREEN IMAGE PREVIEW MODAL ─── */}
      <Modal
        visible={Boolean(fullPreviewImage)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullPreviewImage(null)}
      >
        <SafeAreaView style={styles.imageViewerOverlay}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => setFullPreviewImage(null)}
              activeOpacity={0.7}
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.imageViewerCloseBtn}
              onPress={() => {
                if (fullPreviewImage) Linking.openURL(fullPreviewImage).catch(() => {});
              }}
              activeOpacity={0.7}
            >
              <ExternalLink size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.imageViewerContent}>
            {fullPreviewImage && (
              <Image
                source={{ uri: fullPreviewImage }}
                style={styles.imageViewerImg}
                resizeMode="contain"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },

  // 1. Top Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  headerAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarFallbackText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1541D8',
  },
  headerDetailsCol: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  headerRow1: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDealNo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  headerProductThumbWrap: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginLeft: 6,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProductThumb: {
    width: '100%',
    height: '100%',
  },
  headerStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
    alignSelf: 'center',
    flexShrink: 0,
  },
  headerStatusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  headerRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 1,
  },
  headerPartyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
  },
  onlineIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    flexShrink: 0,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  headerSubInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    gap: 6,
    flexShrink: 0,
  },
  headerSquareBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Subheader 4 Quick Tabs Bar
  quickTabsBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  quickTabsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  quickTabPill: {
    height: 34,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
  },
  quickTabPillChatActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1541D8',
  },
  quickTabPillTextChatActive: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1541D8',
  },
  quickTabPillPayment: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  rupeeGreenSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    marginRight: 4,
  },
  quickTabPillTextPayment: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  quickTabPillDelivery: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  quickTabPillTextDelivery: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  quickTabPillDetails: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  quickTabPillTextDetails: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },

  // 3. Chat Messages Stream
  chatArea: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  messageListContent: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  msgWrapper: {
    marginBottom: 12,
  },
  dateSeparatorRow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  datePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  datePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarCircleCounterparty: {
    backgroundColor: '#DBEAFE',
    marginRight: 8,
  },
  avatarCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  avatarCircleMe: {
    backgroundColor: '#DCFCE7',
    marginLeft: 8,
  },
  avatarCircleTextMe: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  chatBubble: {
    maxWidth: SCREEN_WIDTH > 400 ? '78%' : '84%',
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingTop: 8,
    paddingBottom: 7,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderTopLeftRadius: 3,
    shadowColor: '#0F172A',
  },
  chatBubbleMe: {
    backgroundColor: '#DCF8C6',
    borderColor: '#BBEBA6',
    borderTopRightRadius: 3,
    shadowColor: '#16A34A',
  },
  bubbleSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bubbleSenderName: {
    fontSize: 12.5,
    fontWeight: '800',
    marginRight: 6,
    flexShrink: 1,
  },
  bubbleSenderNameOther: {
    color: '#1D4ED8',
  },
  bubbleSenderNameMe: {
    color: '#15803D',
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  rolePillBuyer: {
    backgroundColor: '#DBEAFE',
  },
  rolePillSeller: {
    backgroundColor: '#DCFCE7',
  },
  rolePillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  rolePillTextBuyer: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  rolePillTextSeller: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#15803D',
  },
  chatMessageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
  },
  chatMessageTextOther: {
    color: '#0F172A',
  },
  chatMessageTextMe: {
    color: '#0F172A',
  },
  chatImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#F1F5F9',
    width: 220,
    height: 160,
  },
  chatImage: {
    width: '100%',
    height: '100%',
  },
  chatImageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatImageErrorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatImageErrorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  imageViewerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  imageViewerImg: {
    width: '100%',
    height: '100%',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '500',
  },
  bubbleTimeOther: {
    color: '#94A3B8',
  },
  bubbleTimeMe: {
    color: '#16A34A',
  },
  checkDoubleRow: {
    marginLeft: 4,
  },
  checkDoubleText: {
    fontSize: 11,
    fontWeight: '900',
  },
  checkBlue: {
    color: '#2563EB',
  },
  checkGrey: {
    color: '#65A30D',
  },

  docAttachmentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    marginTop: 6,
  },
  docAttachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pdfIconBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 5,
  },
  pdfIconText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  docFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  docDownloadBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  cardBubbleContainer: {
    width: Math.min(SCREEN_WIDTH * 0.82, 320),
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardBubbleMe: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  cardBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  paymentInnerCard: {
    backgroundColor: '#FFFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    padding: 10,
    marginTop: 2,
  },
  paymentInnerCardApproved: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4,
  },
  paymentCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 6,
  },
  rupeeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    flexShrink: 0,
  },
  rupeeCircleOrange: {
    backgroundColor: '#F59E0B',
  },
  rupeeCircleGreen: {
    backgroundColor: '#10B981',
  },
  rupeeCircleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  paymentCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#78350F',
    flexShrink: 1,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusTagPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTagTextPending: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  statusTagApproved: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusTagTextApproved: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    minWidth: 0,
  },
  paymentAmountBig: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginRight: 6,
  },
  paymentMethodPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    flexShrink: 0,
  },
  paymentMethodPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  paymentDetailsTable: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 1.5,
    minWidth: 0,
  },
  paymentDetailKey: {
    fontSize: 10.5,
    color: '#64748B',
    width: 48,
    flexShrink: 0,
  },
  paymentDetailVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  paymentCopyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
    marginLeft: 6,
  },
  paymentApprovalButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  approvalBtn: {
    flex: 1,
    height: 30,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  approveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },

  successToastContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 12 : 48,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
    alignItems: 'center',
  },
  successToastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    width: '100%',
    maxWidth: 420,
  },
  successToastIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  successToastTextCol: {
    flex: 1,
    minWidth: 0,
  },
  successToastTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  successToastSubtitle: {
    fontSize: 11.5,
    color: '#047857',
    fontWeight: '600',
    marginTop: 1,
  },
  successToastCloseBtn: {
    padding: 4,
    marginLeft: 8,
    flexShrink: 0,
  },

  typingIndicatorRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typingDot: {
    fontSize: 14,
    color: '#1541D8',
    marginRight: 2,
  },
  typingText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 6,
    fontStyle: 'italic',
  },

  // 4. Bottom Input Bar
  bottomBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
  },
  attachMenuPopup: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 66 : 56,
    left: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 100,
    minWidth: 180,
  },
  attachMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  attachMenuItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  inputControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plusCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  inputCapsule: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  mainTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 2,
  },
  iconInsideInput: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1541D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    flexShrink: 0,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },

  // 5 & 6. Bottom Sheet Common Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    maxHeight: '88%',
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  sheetHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    minWidth: 0,
  },
  sheetHeaderTitlesCol: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
    minWidth: 0,
  },
  sheetHeaderRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 2,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },

  largeAmountBox: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  largeRupeeSymbol: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 8,
  },
  largeAmountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  amountPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  presetChip: {
    flex: 1,
    minWidth: 68,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipActive: {
    backgroundColor: '#1541D8',
    borderColor: '#1541D8',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  paymentMethodsGroup: {
    gap: 8,
  },
  methodRadioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  methodRadioItemActive: {
    borderColor: '#1541D8',
    backgroundColor: '#F8FAFC',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioCircleActive: {
    borderColor: '#1541D8',
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1541D8',
  },
  methodRadioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  paymentMethodIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  paymentMethodIconImg: {
    width: 22,
    height: 22,
  },
  upiBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
    flexShrink: 0,
  },
  remarksContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  remarksInput: {
    fontSize: 13.5,
    color: '#0F172A',
  },
  remarksCountText: {
    alignSelf: 'flex-end',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  primaryModalBtn: {
    height: 48,
    backgroundColor: '#1541D8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#1541D8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  truckIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsDeliverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  itemThumbImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
  },
  itemDeliverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemDeliverSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  formGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formGridCol: {
    flex: 1,
    minWidth: 0,
  },
  inputWithUnitBox: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputInBox: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  unitSuffixText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  regularInputBox: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  attachDocsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  attachDocsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  attachDocsSub: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },

  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 14,
    flexShrink: 0,
  },
  approvedPillGreenText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sheetSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  sheetSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  partyProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyAvatarRound: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  partyAvatarImg: {
    width: '100%',
    height: '100%',
  },
  partyAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  partyNameBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  partyGstinText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  partyLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  partyPhoneText: {
    fontSize: 11,
    color: '#1541D8',
    marginTop: 1,
    fontWeight: '600',
  },
  viewProfileBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  viewProfileBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1541D8',
  },
  editLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  prodNameMain: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  prodQuality: {
    fontSize: 11,
    color: '#64748B',
  },
  prodStatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  prodStatCol: {
    flex: 1,
    minWidth: 0,
  },
  statKey: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  multiProductListContainer: {
    marginTop: 2,
  },
  multiProdItemCard: {
    paddingVertical: 4,
  },
  multiProdItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 8,
  },
  deliveryStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  deliveryCol: {
    flex: 1,
    minWidth: 0,
  },
  viewPaymentsLinkBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewPaymentsLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1541D8',
  },
  paymentStatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  paymentStatCol: {
    flex: 1,
    minWidth: 0,
  },
  additionalGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  dealSummaryButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  downloadSummaryOutlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1541D8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadSummaryOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1541D8',
  },
  shareDealSolidBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1541D8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareDealSolidText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginVertical: 8,
    lineHeight: 18,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  suggestionChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1541D8',
  },
});

export default DealChat;