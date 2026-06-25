import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from '../../services/api';
import {
  X,
  Send,
  Plus,
  FileText,
  Clock,
  Check,
  ShieldCheck,
  Lock,
  Lightbulb,
  CreditCard,
  CheckCircle,
  Truck,
  Download,
  Info,
  Handshake,
} from 'lucide-react-native';
import SummaryApi from '../../common';

const sanitizeSystemMessage = (text) => {
  return text.replace(/^[💸✅❌]\s*/, '');
};

const parsePaymentMessage = (text) => {
  // Clean emoji and trim text
  const cleanText = sanitizeSystemMessage(text).trim();

  // Extract amount: e.g. ₹50,000 or Rs. 50,000 or 50000
  const amountMatch = cleanText.match(/(?:₹|Rs\.?)\s*([0-9,]+)/i) || cleanText.match(/([0-9,]+)/);
  const amount = amountMatch ? amountMatch[1] : '';

  // Extract method: e.g. "via UPI" or "via Bank Transfer"
  const methodMatch = cleanText.match(/via\s+([A-Za-z0-9\s\-]+?)(?:\.|$|Notes:)/i);
  const method = methodMatch ? methodMatch[1].trim() : 'UPI';

  // Extract notes: e.g. "Notes: Advance payment"
  const notesMatch = cleanText.match(/Notes:\s*(.*)$/i);
  const notes = notesMatch ? notesMatch[1].trim() : '';

  return { amount, method, notes };
};

const findMatchingPayment = (msgText, msgTime, payments) => {
  const parsed = parsePaymentMessage(msgText);
  if (!parsed || !parsed.amount) return null;

  const amt = parseFloat(parsed.amount.replace(/,/g, ''));
  const candidates = payments.filter(p => Math.abs(p.amount - amt) < 0.01);
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

const parseDeliveryMessage = (text) => {
  const isApproved = text.toLowerCase().includes('approved') || text.startsWith('✅');
  const isRejected = text.toLowerCase().includes('rejected') || text.startsWith('❌');
  const qtyMatch = text.match(/(?:quantity|qty|delivered)\s*[:\-]?\s*([0-9,]+)/i) ||
    text.match(/([0-9,]+)\s*(?:Units|packet|kg|Bales|tons|pcs|packet|pg)/i) ||
    text.match(/([0-9,]+)/);
  const quantity = qtyMatch ? qtyMatch[1].replace(/,/g, '') : '';
  return { isApproved, isRejected, quantity };
};

const findMatchingDelivery = (msgText, msgTime, deliveries) => {
  const parsed = parseDeliveryMessage(msgText);
  if (!parsed || !parsed.quantity) return null;

  const qty = parseInt(parsed.quantity, 10);
  const candidates = deliveries.filter(d => d.quantity === qty);
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
  if (!myUserId) {
    console.log('[checkIsMe] No myUserId provided, returning false');
    return false;
  }

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

  if (!senderId) {
    console.log('[checkIsMe] Could not resolve senderId from msg:', JSON.stringify(msg));
    return false;
  }

  const matches = String(senderId).trim().toLowerCase() === String(myUserId).trim().toLowerCase();
  console.log(`[checkIsMe] Comparing senderId: ${senderId} with myUserId: ${myUserId}. matches = ${matches}`);
  return matches;
};

const DealChat = ({ onNavigate, routeData }) => {
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [deal, setDeal] = useState(routeData?.deal || null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [conversationId, setConversationId] = useState(routeData?.conversationId || null);
  const [currentUserCompanyIds, setCurrentUserCompanyIds] = useState([]);
  const [onlineStatus, setOnlineStatus] = useState('offline');
  const [isCounterpartyTyping, setIsCounterpartyTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- Payment State Variables ---
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('sent');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [dealPayments, setDealPayments] = useState([]);

  // --- Delivery State Variables ---
  const [isDeliveryModalVisible, setIsDeliveryModalVisible] = useState(false);
  const [deliveryProductId, setDeliveryProductId] = useState('');
  const [deliveryQuantity, setDeliveryQuantity] = useState('');
  const [deliveryType, setDeliveryType] = useState('sent');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryAttachmentUrl, setDeliveryAttachmentUrl] = useState('');
  const [isLoggingDelivery, setIsLoggingDelivery] = useState(false);
  const [dealDeliveries, setDealDeliveries] = useState([]);

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

  const suggestionChips = [
    "Confirm delivery schedule",
    "Share quality report / specs",
    "Finalize packaging standards",
    "Discuss advance payment terms"
  ];

  const onReceiveMessage = React.useCallback((msg, myUserId) => {
    const activeUserId = myUserId || currentUserIdRef.current;
    const isMe = checkIsMe(msg, activeUserId);
    const senderName = msg.sender?.name || msg.sender?.userId?.name || msg.senderName || (isMe ? 'You' : 'Party');

    let status = msg.status || 'sent';
    if (msg.readBy && msg.readBy.length > 0) {
      status = 'read';
    }

    const mapped = {
      id: msg._id || msg.id || Date.now().toString(),
      sender: isMe ? 'You' : senderName,
      text: msg.content || msg.message || msg.text || '',
      time: msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateRaw: msg.createdAt || new Date(),
      type: isMe ? 'me' : 'other',
      status: status,
    };

    setChatMessages(prev => {
      if (prev.some(m => m.id === mapped.id)) return prev;

      if (isMe) {
        const hasTemp = prev.some(m => m.type === 'me' && m.text === mapped.text && !isNaN(Number(m.id)));
        if (hasTemp) {
          return prev.map(m => (m.type === 'me' && m.text === mapped.text && !isNaN(Number(m.id))) ? mapped : m);
        }
      }
      return [...prev, mapped];
    });
  }, []);

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
        Alert.alert('Success', `Payment entry status updated to ${status} successfully!`);
        fetchPaymentDashboardData();
        refreshDealDetails();
        fetchDealPayments();

        // Reload conversation messages to display updated counterparts/status in chat log
        let activeConversationId = conversationId;
        if (!activeConversationId) {
          const id = routeData?.dealId || deal?._id;
          const convsRes = await getConversations(token, 1, 50);
          if (convsRes && convsRes.success && convsRes.data?.data) {
            const matchedConv = convsRes.data.data.find(c => {
              const cDealId = c.dealId?._id || c.dealId?.id || c.dealId;
              const targetId = id?._id || id?.id || id;
              if (!cDealId || !targetId) return false;
              return String(cDealId).toLowerCase().trim() === String(targetId).toLowerCase().trim();
            });
            if (matchedConv) {
              activeConversationId = matchedConv._id || matchedConv.id;
              setConversationId(activeConversationId);
            }
          }
        }
        if (activeConversationId) {
          const msgsRes = await getConversationMessages(activeConversationId, token, 1, 50);
          if (msgsRes && msgsRes.success && msgsRes.data?.data) {
            const historyMessages = msgsRes.data.data.map(msg => {
              const isMe = checkIsMe(msg, currentUserId);
              const senderName = msg.sender?.name || (isMe ? 'You' : 'Party');
              let msgStatus = msg.status || 'sent';
              if (msg.readBy && msg.readBy.length > 0) {
                msgStatus = 'read';
              }
              return {
                id: msg._id || msg.id || Date.now().toString(),
                sender: isMe ? 'You' : senderName,
                text: msg.content || msg.message || msg.text || '',
                time: msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateRaw: msg.createdAt || new Date(),
                type: isMe ? 'me' : 'other',
                status: msgStatus,
              };
            });
            setChatMessages(historyMessages);
          }
        }
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
        Alert.alert('Success', `Delivery status updated to ${status} successfully!`);
        fetchPaymentDashboardData();
        refreshDealDetails();
        fetchDealPayments();
        fetchDealDeliveries();

        // Reload conversation messages to display updated counterparts/status in chat log
        let activeConversationId = conversationId;
        if (!activeConversationId) {
          const id = routeData?.dealId || deal?._id;
          const convsRes = await getConversations(token, 1, 50);
          if (convsRes && convsRes.success && convsRes.data?.data) {
            const matchedConv = convsRes.data.data.find(c => {
              const cDealId = c.dealId?._id || c.dealId?.id || c.dealId;
              const targetId = id?._id || id?.id || id;
              if (!cDealId || !targetId) return false;
              return String(cDealId).toLowerCase().trim() === String(targetId).toLowerCase().trim();
            });
            if (matchedConv) {
              activeConversationId = matchedConv._id || matchedConv.id;
              setConversationId(activeConversationId);
            }
          }
        }
        if (activeConversationId) {
          const msgsRes = await getConversationMessages(activeConversationId, token, 1, 50);
          if (msgsRes && msgsRes.success && msgsRes.data?.data) {
            const historyMessages = msgsRes.data.data.map(msg => {
              const isMe = checkIsMe(msg, currentUserId);
              const senderName = msg.sender?.name || (isMe ? 'You' : 'Party');
              let msgStatus = msg.status || 'sent';
              if (msg.readBy && msg.readBy.length > 0) {
                msgStatus = 'read';
              }
              return {
                id: msg._id || msg.id || Date.now().toString(),
                sender: isMe ? 'You' : senderName,
                text: msg.content || msg.message || msg.text || '',
                time: msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateRaw: msg.createdAt || new Date(),
                type: isMe ? 'me' : 'other',
                status: msgStatus,
              };
            });
            setChatMessages(historyMessages);
          }
        }
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
    console.log('🔔 [PAYMENT SOUND] Ding! Cash register/success audio notification played.');
  };

  const handleSelectPaymentAction = (type) => {
    const normalizeId = (val) => String(val?._id || val?.id || val || '');
    const sellerCid = normalizeId(deal?.sellerCompanyId);
    const buyerCid = normalizeId(deal?.buyerCompanyId);
    const brokerCid = normalizeId(deal?.brokerCompanyId);

    const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
    const currentUserRole = deal?.currentUserRole || viewerRole;

    const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
    const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());
    const isBroker = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brokerCid && currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()));

    if (type === 'sent' && !isBuyer && !isBroker) {
      Alert.alert('Access Denied', 'Only the Buyer or Broker can record a sent payment.');
      return;
    }
    if (type === 'received' && !isSeller && !isBroker) {
      Alert.alert('Access Denied', 'Only the Seller or Broker can record a received payment.');
      return;
    }

    setPaymentType(type);
    setPaymentAmount('');
    setPaymentMethod('UPI');
    setPaymentNotes('');
    setShowAttachMenu(false);
    setIsPaymentModalVisible(true);
  };

  const handleSelectDeliveryAction = (type) => {
    const normalizeId = (val) => String(val?._id || val?.id || val || '');
    const sellerCid = normalizeId(deal?.sellerCompanyId);
    const buyerCid = normalizeId(deal?.buyerCompanyId);
    const brokerCid = normalizeId(deal?.brokerCompanyId);

    const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
    const currentUserRole = deal?.currentUserRole || viewerRole;

    const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
    const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());
    const isBroker = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brokerCid && currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()));

    if (type === 'sent' && !isSeller && !isBroker) {
      Alert.alert('Access Denied', 'Only the Seller or Broker can record a dispatched entry.');
      return;
    }
    if (type === 'received' && !isBuyer && !isBroker) {
      Alert.alert('Access Denied', 'Only the Buyer or Broker can record a received entry.');
      return;
    }

    setDeliveryType(type);
    if (deal?.products && deal.products.length > 0) {
      const firstProd = deal.products[0];
      setDeliveryProductId(firstProd.productId?._id || firstProd.productId || firstProd._id || firstProd.id || '');
    } else {
      setDeliveryProductId('');
    }
    setDeliveryQuantity('');
    setDeliveryNotes('');
    setDeliveryAttachmentUrl('');
    setShowAttachMenu(false);
    setIsDeliveryModalVisible(true);
  };

  const handleLogPayment = async () => {
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Payment amount must be greater than 0.');
      return;
    }

    const statusLower = String(deal?.status || '').toLowerCase();
    if (statusLower !== 'approved' && statusLower !== 'active' && statusLower !== 'in_progress') {
      Alert.alert('Validation Error', 'Payments can only be added to active or approved deals.');
      return;
    }

    const normalizeId = (val) => String(val?._id || val?.id || val || '');
    const sellerCid = normalizeId(deal?.sellerCompanyId);

    const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
    const currentUserRole = deal?.currentUserRole || viewerRole;

    const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());

    const remainingPayable = paymentSummary ? (isSeller ? paymentSummary.totalPendingToReceive : paymentSummary.totalPendingToPay) : (deal.totalAmount || 0);
    if (amt > remainingPayable) {
      Alert.alert('Validation Error', `Amount cannot exceed the remaining balance of ₹${remainingPayable.toLocaleString('en-IN')}`);
      return;
    }

    setIsLoggingPayment(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal._id,
        amount: amt,
        paymentType,
        paymentMethod,
        notes: paymentNotes || undefined,
      };

      const res = await recordPayment(payload, token);
      if (res && res.success) {
        Alert.alert('Success', 'Payment entry logged successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setIsPaymentModalVisible(false);
              fetchPaymentDashboardData();
              refreshDealDetails();
            }
          }
        ]);
      }
    } catch (err) {
      Alert.alert('Logging Failed', err.message || 'Failed to record payment');
    } finally {
      setIsLoggingPayment(false);
    }
  };

  const handleLogDelivery = async () => {
    if (!deliveryProductId) {
      Alert.alert('Validation Error', 'Please select a product.');
      return;
    }

    const qty = Number(deliveryQuantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation Error', 'Delivery quantity must be greater than 0.');
      return;
    }

    const statusLower = String(deal?.status || '').toLowerCase();
    if (statusLower !== 'approved' && statusLower !== 'active' && statusLower !== 'in_progress' && statusLower !== 'completed') {
      Alert.alert('Validation Error', 'Deliveries can only be added to active, approved or completed deals.');
      return;
    }

    const prod = deal?.products?.find(p => {
      const pId = p.productId?._id || p.productId || p._id || p.id;
      return String(pId) === String(deliveryProductId);
    });

    if (prod) {
      const deliveredQty = Number(prod.deliveredQuantity || 0);
      const totalQty = Number(prod.quantity || 0);
      const remainingBalance = totalQty - deliveredQty;
      if (qty > remainingBalance) {
        Alert.alert(
          'Quantity Exceeded',
          `Delivery quantity (${qty}) exceeds the remaining balance of ${remainingBalance} for this product.`
        );
        return;
      }
    }








    setIsLoggingDelivery(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        dealId: deal._id,
        productId: deliveryProductId,
        quantity: qty,
        deliveryType,
        notes: deliveryNotes || undefined,
        attachmentUrl: deliveryAttachmentUrl || undefined,
      };

      const res = await createDelivery(payload, token);
      if (res && res.success) {
        Alert.alert('Success', 'Delivery entry logged successfully!', [
          {
            text: 'OK',
            onPress: () => {
              setIsDeliveryModalVisible(false);
              fetchDealDeliveries();
              refreshDealDetails();
            }
          }
        ]);
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

        // Decode token synchronously to populate ID immediately as fallback
        const idFromToken = getUserIdFromToken(token);
        let myUserId = idFromToken || '';
        if (idFromToken) {
          setCurrentUserId(idFromToken);
          currentUserIdRef.current = idFromToken;
        }

        // 1. Get current user profile
        try {
          const userRes = await getUserProfile(token);
          if (userRes && userRes.success && userRes.data) {
            const user = userRes.data;
            myUserId = user._id || user.id || idFromToken;
            setCurrentUserId(myUserId);
            currentUserIdRef.current = myUserId;
            setCurrentUserCompanyIds((user.companies || []).map(c => String(c._id || c.id || c)));
          }
        } catch (profileErr) {
          console.warn('Profile fetch failed, using fallback from token:', profileErr);
        }

        // 2. Load deal details if not pre-populated
        const id = routeData?.dealId || routeData?.deal?._id;
        let activeDeal = routeData?.deal || null;
        if (id && !activeDeal) {
          const dealRes = await getDealDetails(id, token);
          if (dealRes && dealRes.success && dealRes.data) {
            activeDeal = dealRes.data;
            setDeal(activeDeal);
          }
        }

        // Check deal approval status
        const dealStatus = String(activeDeal?.status || '').toLowerCase();
        const isDealApproved = dealStatus === 'approved' || dealStatus === 'active' || dealStatus === 'in_progress';

        // 3. Load conversation thread and message history via REST API
        let activeConversationId = conversationIdRef.current || conversationId;

        if (!activeConversationId) {
          console.log('Loading active conversations to find match...');
          const convsRes = await getConversations(token, 1, 50);
          if (convsRes && convsRes.success && convsRes.data?.data) {
            const conversations = convsRes.data.data;
            const matchedConv = conversations.find(c => {
              const cDealId = c.dealId?._id || c.dealId?.id || c.dealId;
              const targetId = id?._id || id?.id || id;
              if (!cDealId || !targetId) return false;
              return String(cDealId).toLowerCase().trim() === String(targetId).toLowerCase().trim();
            });
            if (matchedConv) {
              activeConversationId = matchedConv._id || matchedConv.id;
              setConversationId(activeConversationId);
              conversationIdRef.current = activeConversationId;
              console.log('Found matching conversation ID from list:', activeConversationId);
            }
          }
        }

        // 3b. If still no conversation and deal is approved, create one
        if (!activeConversationId && isDealApproved && id) {
          try {
            console.log('No conversation found — creating one for deal:', id);
            const createRes = await createConversation({ dealId: id, participants: [] }, token);
            if (createRes && createRes.success && createRes.data) {
              activeConversationId = createRes.data._id || createRes.data.id;
              setConversationId(activeConversationId);
              conversationIdRef.current = activeConversationId;
              console.log('Conversation created successfully:', activeConversationId);
            }
          } catch (convErr) {
            console.warn('Failed to create conversation:', convErr);
          }
        }

        if (activeConversationId) {
          console.log('Loading conversation message history...');
          const msgsRes = await getConversationMessages(activeConversationId, token, 1, 50);
          if (msgsRes && msgsRes.success && msgsRes.data?.data) {
            const historyMessages = msgsRes.data.data.map(msg => {
              const isMe = checkIsMe(msg, myUserId);
              const senderName = msg.sender?.name || (isMe ? 'You' : 'Party');

              let status = msg.status || 'sent';
              if (msg.readBy && msg.readBy.length > 0) {
                status = 'read';
              }

              return {
                id: msg._id || msg.id || Date.now().toString(),
                sender: isMe ? 'You' : senderName,
                text: msg.content || msg.message || msg.text || '',
                time: msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                dateRaw: msg.createdAt || new Date(),
                type: isMe ? 'me' : 'other',
                status: status,
              };
            });
            setChatMessages(historyMessages);
          }

          if (isDealApproved) {
            console.log('Marking conversation as read...');
            await markConversationAsRead(activeConversationId, token);
          }
        }

        // Lock socket/sending for non-approved deals — history is still shown above
        if (!isDealApproved) {
          setIsLoading(false);
          return;
        }

        // 5. Establish Socket connection
        const sendOtpUrl = SummaryApi.sendOTP?.url || '';
        let socketServerUrl = sendOtpUrl ? sendOtpUrl.split('/api/')[0] : 'https://pravisti-backend-538238931844.asia-southeast1.run.app';

        if (socketServerUrl.includes('localhost') || socketServerUrl.includes('127.0.0.1')) {
          if (Platform.OS === 'android') {
            socketServerUrl = socketServerUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
          }
        }

        console.log('Connecting to Socket server:', socketServerUrl);
        socket = io(socketServerUrl, {
          auth: {
            token: token
          },
          extraHeaders: {
            Authorization: `Bearer ${token}`
          },
          transports: ['websocket']
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Connected successfully to Pravisti Socket Server! ID:', socket.id);
          setIsConnected(true);

          if (id) {
            console.log('Attempting to join deal room:', id);
            socket.emit('join_room', { dealId: id }, (response) => {
              if (response && response.success) {
                console.log('Room joined successfully:', response.message);
              } else {
                console.error('Failed to join room:', response?.error || 'Unknown error');
              }
            });
          }

          if (activeConversationId) {
            console.log('Emitting read_messages for conversation:', activeConversationId);
            socket.emit('read_messages', { conversationId: activeConversationId });
          }
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Connection failed:', error.message);
          setIsConnected(false);
        });

        socket.on('receive_message', (msg) => {
          console.log('New Message Received:', msg);
          onReceiveMessage(msg, myUserId);

          const content = msg.content || msg.message || msg.text || '';
          if ((content.startsWith('💸') || content.startsWith('✅') || content.startsWith('❌')) && content.toLowerCase().includes('payment')) {
            console.log('💰 Payment alert received! Playing sound and updating ledger...');
            playPaymentSound();
            fetchPaymentDashboardDataRef.current();
            refreshDealDetailsRef.current();
            if (fetchDealPaymentsRef.current) {
              fetchDealPaymentsRef.current();
            }
          }

          if (content.toLowerCase().includes('delivery') || content.includes('🚚')) {
            console.log('🚚 Delivery alert received! Updating logistics ledger...');
            fetchPaymentDashboardDataRef.current();
            refreshDealDetailsRef.current();
            if (fetchDealDeliveriesRef.current) {
              fetchDealDeliveriesRef.current();
            }
          }
        });

        socket.on('user_online_status', (data) => {
          console.log('👤 [Online Status Update]', data);
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
          console.log('📩 [Read Receipt Update]', data);
          const activeUserId = myUserId || currentUserIdRef.current;
          if (data && data.conversationId === activeConversationId && data.userId !== activeUserId) {
            setChatMessages(prev =>
              prev.map(msg =>
                msg.type === 'me' && msg.status !== 'read'
                  ? { ...msg, status: 'read' }
                  : msg
              )
            );
          }
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Pravisti Chat Socket disconnected:', reason);
          setIsConnected(false);
          setIsCounterpartyTyping(false);
        });

      } catch (err) {
        console.error('Failed to initialize socket chat:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();

    return () => {
      if (socket) {
        const id = routeData?.dealId || routeData?.deal?._id;
        if (id) {
          socket.emit('leave_room', { dealId: id }, (response) => {
            console.log('Left room status:', response);
          });
        }
        socket.disconnect();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
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

    socketRef.current.emit(
      'send_message',
      payload,
      (response) => {
        if (response && response.success) {
          const msgObj = response.data || response.message;
          if (msgObj && typeof msgObj === 'object') {
            console.log('Message sent & saved successfully:', msgObj);
            onReceiveMessage(msgObj, currentUserId);
            // If the response returned a conversationId, store it for future messages
            const returnedConvId = msgObj.conversationId || response.conversationId;
            if (returnedConvId && !conversationIdRef.current) {
              conversationIdRef.current = returnedConvId;
              setConversationId(returnedConvId);
            }
          } else {
            console.log('Message sent successfully (no object in response):', response);
          }
        } else {
          console.error('Message failed to send:', response?.error || 'Unknown error');
        }
      }
    );

    const localMsg = {
      id: Date.now(),
      sender: 'You',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateRaw: new Date(),
      type: 'me',
      status: 'sending',
    };

    setChatMessages(prev => [...prev, localMsg]);
    setMessage('');
  };

  const getCounterpartyInfo = () => {
    if (!deal) return { partyName: routeData?.deal?.party || 'Counterparty', roleLabel: 'Deal Chat', myRole: 'User' };

    const normalizeId = (val) => String(val?._id || val?.id || val || '');
    const sellerCid = normalizeId(deal.sellerCompanyId);
    const buyerCid = normalizeId(deal.buyerCompanyId);
    const brokerCid = normalizeId(deal.brokerCompanyId);

    const viewerRole = deal?.viewerRole || deal?.currentUserRole || '';
    const currentUserRole = deal?.currentUserRole || viewerRole;

    const isSeller = (currentUserRole === 'seller' || viewerRole === 'seller') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(sellerCid).toLowerCase());
    const isBuyer = (currentUserRole === 'buyer' || viewerRole === 'buyer') || currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(buyerCid).toLowerCase());
    const isBroker = (currentUserRole === 'broker' || viewerRole === 'broker') || (!!brokerCid && currentUserCompanyIds.some(id => id && String(id).toLowerCase() === String(brokerCid).toLowerCase()));

    let partyName = 'Counterparty';
    let roleLabel = 'Deal Chat';
    let myRole = 'User';

    if (isSeller) {
      const buyer = deal.buyerCompany || deal.buyerCompanyId;
      partyName = buyer?.companyName || buyer?.name || 'Buyer';
      roleLabel = 'Seller Side';
      myRole = 'Seller';
    } else if (isBuyer) {
      const seller = deal.sellerCompany || deal.sellerCompanyId;
      partyName = seller?.companyName || seller?.name || 'Seller';
      roleLabel = 'Buyer Side';
      myRole = 'Buyer';
    } else if (isBroker) {
      const seller = deal.sellerCompany || deal.sellerCompanyId;
      const buyer = deal.buyerCompany || deal.buyerCompanyId;
      partyName = `${seller?.name || 'Seller'} ↔ ${buyer?.name || 'Buyer'}`;
      roleLabel = 'Broker View';
      myRole = 'Broker';
    } else {
      const seller = deal.sellerCompany || deal.sellerCompanyId;
      const buyer = deal.buyerCompany || deal.buyerCompanyId;
      partyName = `${seller?.name || 'Seller'} ↔ ${buyer?.name || 'Buyer'}`;
      roleLabel = 'Deal View';
      myRole = 'Viewer';
    }

    return { partyName, roleLabel, myRole };
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getMessageDateString = (date) => {
    if (!date) return 'Today';
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const { partyName, roleLabel, myRole } = getCounterpartyInfo();

  const dealName = deal
    ? (deal.products?.[0]?.productId?.name || deal.products?.[0]?.name || deal.dealNumber || 'Sauda Agreement')
    : (routeData?.deal?.title || 'Sauda Agreement');

  const isDealApproved = deal
    ? (() => {
        const s = String(deal.status || '').toLowerCase();
        return s === 'approved' || s === 'active' || s === 'in_progress';
      })()
    : false;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Connecting to secure network...</Text>
      </SafeAreaView>
    );
  }

  const cleanSystemText = (text) => {
    return text
      .replace(/^💸\s*/, '')
      .replace(/^✅\s*/, '')
      .replace(/^❌\s*/, '')
      .replace(/^🚚\s*/, '')
      .replace(/^📦\s*/, '')
      .replace(/^🎉\s*/, '')
      .replace(/^⚠️\s*/, '')
      .replace(/^🛡️\s*/, '')
      .replace(/^📋\s*/, '')
      .replace(/^💳\s*/, '')
      .replace(/^📊\s*/, '')
      .replace(/^📱\s*/, '')
      .replace(/^✉️\s*/, '')
      .replace(/^🏢\s*/, '')
      .replace(/^🚪\s*/, '')
      .replace(/^✕\s*/, '')
      .trim();
  };

  const renderMessageItem = ({ item, index }) => {
    const prevMsg = index > 0 ? chatMessages[index - 1] : null;
    const showDateSeparator = !prevMsg || getMessageDateString(item.dateRaw) !== getMessageDateString(prevMsg.dateRaw);

    const isMe = item.type === 'me';

    const isPaymentUpdateNotification = (item.text.startsWith('💸') || item.text.startsWith('✅') || item.text.startsWith('❌')) &&
      item.text.toLowerCase().includes('payment') && (
        item.text.toLowerCase().includes('approved') ||
        item.text.toLowerCase().includes('rejected') ||
        item.text.toLowerCase().includes('verified')
      );

    const isPaymentAlert = (item.text.startsWith('💸') || item.text.startsWith('✅') || item.text.startsWith('❌')) &&
      item.text.toLowerCase().includes('payment') &&
      !isPaymentUpdateNotification;

    // Detect delivery-related messages (system or user generated)
    const isDeliveryMsg = item.text.toLowerCase().includes('delivery') || item.text.startsWith('🚚') || item.text.includes('🚚');

    const isSystemMsg = (item.text.startsWith('📦') ||
      item.text.startsWith('🎉') ||
      (item.text.startsWith('✅') && item.text.toLowerCase().includes('delivery')) ||
      (item.text.startsWith('❌') && item.text.toLowerCase().includes('delivery')) ||
      isPaymentUpdateNotification) && !isDeliveryMsg;

    if (isPaymentAlert) {
      const matchedPayment = findMatchingPayment(item.text, item.dateRaw, dealPayments);
      const isPaymentCreatedByMe = item.type === 'me';
      const isReceived = item.text.startsWith('✅') || (matchedPayment && matchedPayment.paymentType === 'received');
      const { amount, method, notes } = parsePaymentMessage(item.text);
      const formattedDate = item.dateRaw
        ? new Date(item.dateRaw).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
      const txnId = item.id && isNaN(Number(item.id)) ? `TXN${item.id.slice(-8).toUpperCase()}` : `TXN${String(item.id).slice(-6)}`;

      let titleText = 'Payment Transaction';
      let statusText = 'Pending Approval';
      let showActions = false;

      const amtStr = amount ? `₹${parseFloat(amount.replace(/,/g, '')).toLocaleString('en-IN')}` : '₹0';

      if (matchedPayment) {
        const isReceivedType = matchedPayment.paymentType === 'received';
        const isSentType = matchedPayment.paymentType === 'sent' || matchedPayment.paymentType === 'given';
        const amtStrVal = `₹${parseFloat(matchedPayment.amount || 0).toLocaleString('en-IN')}`;

        if (matchedPayment.status === 'pending') {
          if (isReceivedType) {
            titleText = `Payment Received - ${amtStrVal}`;
            statusText = 'Pending Approval';
            if (myRole === 'Buyer') {
              showActions = true;
            }
          } else {
            titleText = `Payment Sent - ${amtStrVal}`;
            statusText = 'Pending Approval';
            if (myRole === 'Seller') {
              showActions = true;
            }
          }
        } else if (matchedPayment.status === 'approved') {
          if (isSentType) {
            titleText = `${amtStrVal} Sent`;
            statusText = 'Sent ✅ Approved';
          } else {
            titleText = `${amtStrVal} Received`;
            statusText = 'Received ✅ Approved';
          }
        } else if (matchedPayment.status === 'rejected') {
          if (myRole === 'Buyer') {
            titleText = `Payment Rejected ${amtStrVal}`;
            statusText = 'Payment Rejected ❌';
          } else if (myRole === 'Seller') {
            titleText = `Payment Received - ${amtStrVal}`;
            statusText = 'Received ❌ Rejected';
          } else {
            titleText = `Payment Rejected - ${amtStrVal}`;
            statusText = 'Rejected ❌';
          }
        }
      } else {
        // Fallback
        if (item.text.startsWith('✅')) {
          titleText = `${amtStr} Received`;
          statusText = 'Received & Approved';
        } else if (item.text.startsWith('❌')) {
          if (myRole === 'Buyer') {
            titleText = `Payment Rejected ${amtStr}`;
            statusText = 'Payment Rejected';
          } else {
            titleText = `Payment Received - ${amtStr}`;
            statusText = 'Received & Rejected';
          }
        } else {
          titleText = `Payment Sent - ${amtStr}`;
          statusText = 'Pending Approval';
        }
      }

      let headerBgColor = '#5F259F'; // default sent purple
      let badgeText = '✓';
      let badgeTextColor = '#0F9D58';
      let borderTopColor = '#5F259F';

      if (statusText.includes('Approved') || statusText.includes('Sent & Approved') || statusText.includes('Received & Approved')) {
        headerBgColor = '#0F9D58'; // green
        borderTopColor = '#0F9D58';
        badgeText = '✓';
        badgeTextColor = '#0F9D58';
      } else if (statusText.includes('Rejected') || statusText.includes('Received & Rejected') || statusText.includes('❌')) {
        headerBgColor = '#DC2626'; // red
        borderTopColor = '#DC2626';
        badgeText = '✕';
        badgeTextColor = '#DC2626';
      } else {
        // Pending
        headerBgColor = '#EAB308'; // yellow
        borderTopColor = '#EAB308';
        badgeText = '⏳';
        badgeTextColor = '#EAB308';
      }

      return (
        <View style={styles.messageRowContainer}>
          {showDateSeparator && (
            <View style={styles.dateSeparatorContainer}>
              <View style={styles.dateSeparatorPill}>
                <Text style={styles.dateSeparatorText}>{getMessageDateString(item.dateRaw)}</Text>
              </View>
            </View>
          )}

          {/* Alignment wrapper for WhatsApp payment card flow */}
          <View style={[
            styles.txnCardContainer,
            isPaymentCreatedByMe ? styles.txnCardRight : styles.txnCardLeft
          ]}>
            <View style={[
              styles.txnCard,
              { borderTopWidth: 4, borderTopColor: borderTopColor, backgroundColor: isPaymentCreatedByMe ? '#F4FDF4' : '#FFFFFF' }
            ]}>
              {/* Header: PhonePe purple / Google Pay green / Danger red banner */}
              <View style={[
                styles.txnHeader,
                { backgroundColor: headerBgColor }
              ]}>
                <View style={styles.txnHeaderTitleRow}>
                  <View style={styles.txnSuccessBadge}>
                    {badgeText === '✓' ? (
                      <Check size={10} color={badgeTextColor} />
                    ) : badgeText === '✕' ? (
                      <X size={10} color={badgeTextColor} />
                    ) : (
                      <Clock size={10} color={badgeTextColor} />
                    )}
                  </View>
                  <Text style={styles.txnHeaderText}>
                    {titleText}
                  </Text>
                </View>
                <Text style={styles.txnStatusSub}>
                  {statusText}
                </Text>
              </View>

              {/* Body: Receipts values */}
              <View style={styles.txnBody}>
                <Text style={styles.txnAmountLabel}>Amount</Text>
                <Text style={styles.txnAmount}>₹{amount || (matchedPayment ? matchedPayment.amount : '0')}</Text>

                <View style={styles.txnDivider} />

                {/* Details layout grids */}
                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>{isReceived ? 'From' : 'To'}</Text>
                  <Text style={styles.txnDetailValue} numberOfLines={1}>
                    {isReceived
                      ? (deal?.sellerCompany?.name || deal?.sellerCompanyId?.name || 'Seller Party')
                      : (deal?.buyerCompany?.name || deal?.buyerCompanyId?.name || 'Buyer Party')}
                  </Text>
                </View>

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Method</Text>
                  <Text style={styles.txnDetailValue}>{method}</Text>
                </View>

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Date & Time</Text>
                  <Text style={styles.txnDetailValue}>{formattedDate}, {item.time}</Text>
                </View>

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Transaction ID</Text>
                  <Text style={styles.txnDetailValue}>{txnId}</Text>
                </View>

                {notes ? (
                  <View style={styles.txnNotesBox}>
                    <Text style={styles.txnNotesLabel}>Notes</Text>
                    <Text style={styles.txnNotesText}>{notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Approve / Reject Actions Row */}
              {showActions && matchedPayment && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleUpdatePaymentStatus(matchedPayment._id, 'approved')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleUpdatePaymentStatus(matchedPayment._id, 'rejected')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom PhonePe / GPay styled banner */}
              <View style={styles.txnFooter}>
                {statusText.includes('Approved') ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <Check size={12} color="#0F9D58" strokeWidth={3} />
                    <Text style={[styles.txnFooterText, { color: '#0F9D58', fontWeight: '800', marginBottom: 0 }]}>
                      APPROVED BY {matchedPayment ? (matchedPayment.paymentType === 'received' ? 'BUYER' : 'SELLER') : 'PARTNER'}
                    </Text>
                  </View>
                ) : (statusText.includes('Rejected') || statusText.includes('❌')) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <X size={12} color="#DC2626" strokeWidth={3} />
                    <Text style={[styles.txnFooterText, { color: '#DC2626', fontWeight: '800', marginBottom: 0 }]}>
                      REJECTED BY {matchedPayment ? (matchedPayment.paymentType === 'received' ? 'BUYER' : 'SELLER') : 'PARTNER'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <ShieldCheck size={14} color="#64748B" />
                    <Text style={[styles.txnFooterText, { marginBottom: 0 }]}>Secured by Pravisti Ledger</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (isDeliveryMsg) {
      const matchedDelivery = findMatchingDelivery(item.text, item.dateRaw, dealDeliveries);
      const isDeliveryCreatedByMe = item.type === 'me';
      const isSentType = item.text.toLowerCase().includes('sent') || (matchedDelivery && matchedDelivery.deliveryType === 'sent');

      const parsed = parseDeliveryMessage(item.text);
      const formattedDate = item.dateRaw
        ? new Date(item.dateRaw).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
      const deliveryTxnId = item.id && isNaN(Number(item.id)) ? `DLV${item.id.slice(-8).toUpperCase()}` : `DLV${String(item.id).slice(-6)}`;

      let titleText = 'Delivery Transaction';
      let statusText = 'Pending Approval';
      let showActions = false;

      const qtyStr = parsed.quantity ? `${parsed.quantity} Units` : '0 Units';

      let productName = 'Product';
      let unitName = 'Units';

      if (matchedDelivery) {
        const prod = deal?.products?.find(p => {
          const pId = p.productId?._id || p.productId || p._id || p.id;
          const dpId = matchedDelivery.productId?._id || matchedDelivery.productId;
          return String(pId) === String(dpId);
        });

        if (prod) {
          productName = prod.productId?.name || prod.name || 'Product';
          unitName = prod.unitId?.shortName || prod.unitId?.name || prod.unit?.shortName || 'Units';
        } else if (matchedDelivery.productId && typeof matchedDelivery.productId === 'object') {
          productName = matchedDelivery.productId.name || 'Product';
          unitName = matchedDelivery.productId.unitId?.shortName || matchedDelivery.productId.unitId?.name || 'Units';
        }

        const deliveryQtyStr = `${matchedDelivery.quantity} ${unitName}`;

        if (matchedDelivery.status === 'pending') {
          if (matchedDelivery.deliveryType === 'sent') {
            titleText = `Goods Dispatched - ${deliveryQtyStr}`;
            statusText = 'Pending Approval';
            if (myRole === 'Buyer') {
              showActions = true;
            }
          } else {
            titleText = `Goods Received - ${deliveryQtyStr}`;
            statusText = 'Pending Approval';
            if (myRole === 'Seller') {
              showActions = true;
            }
          }
        } else if (matchedDelivery.status === 'approved') {
          if (matchedDelivery.deliveryType === 'sent') {
            titleText = `Dispatch Approved - ${deliveryQtyStr}`;
            statusText = 'Dispatched & Approved';
          } else {
            titleText = `Receipt Approved - ${deliveryQtyStr}`;
            statusText = 'Received & Approved';
          }
        } else if (matchedDelivery.status === 'rejected') {
          if (matchedDelivery.deliveryType === 'sent') {
            titleText = `Dispatch Rejected - ${deliveryQtyStr}`;
            statusText = 'Dispatched & Rejected';
          } else {
            titleText = `Receipt Rejected - ${deliveryQtyStr}`;
            statusText = 'Received & Rejected';
          }
        }
      } else {
        if (item.text.toLowerCase().includes('approved') || item.text.startsWith('✅')) {
          titleText = `Delivery Approved - ${qtyStr}`;
          statusText = 'Approved';
        } else if (item.text.toLowerCase().includes('rejected') || item.text.startsWith('❌')) {
          titleText = `Delivery Rejected - ${qtyStr}`;
          statusText = 'Rejected';
        } else if (isSentType) {
          titleText = `Goods Dispatched - ${qtyStr}`;
          statusText = 'Pending Approval';
        } else {
          titleText = `Goods Received - ${qtyStr}`;
          statusText = 'Pending Approval';
        }
      }

      let headerBgColor = '#2563EB'; // blue for dispatch sent
      let badgeText = '✓';
      let badgeTextColor = '#2563EB';
      let borderTopColor = '#2563EB';

      if (statusText.includes('Approved') || statusText.includes('Approved ✅')) {
        headerBgColor = '#10B981'; // green
        borderTopColor = '#10B981';
        badgeText = '✓';
        badgeTextColor = '#10B981';
      } else if (statusText.includes('Rejected') || statusText.includes('Rejected ❌')) {
        headerBgColor = '#EF4444'; // red
        borderTopColor = '#EF4444';
        badgeText = '✕';
        badgeTextColor = '#EF4444';
      } else {
        headerBgColor = '#F59E0B'; // orange/yellow
        borderTopColor = '#F59E0B';
        badgeText = '⏳';
        badgeTextColor = '#F59E0B';
      }

      const sellerName = deal?.sellerCompany?.name || deal?.sellerCompanyId?.companyName || deal?.sellerCompanyId?.name || 'Seller';
      const buyerName = deal?.buyerCompany?.name || deal?.buyerCompanyId?.companyName || deal?.buyerCompanyId?.name || 'Buyer';

      return (
        <View style={styles.messageRowContainer}>
          {showDateSeparator && (
            <View style={styles.dateSeparatorContainer}>
              <View style={styles.dateSeparatorPill}>
                <Text style={styles.dateSeparatorText}>{getMessageDateString(item.dateRaw)}</Text>
              </View>
            </View>
          )}

          <View style={[
            styles.txnCardContainer,
            isDeliveryCreatedByMe ? styles.txnCardRight : styles.txnCardLeft
          ]}>
            <View style={[
              styles.txnCard,
              { borderTopWidth: 4, borderTopColor: borderTopColor, backgroundColor: isDeliveryCreatedByMe ? '#F8FAFC' : '#FFFFFF' }
            ]}>
              {/* Header Banner */}
              <View style={[
                styles.txnHeader,
                { backgroundColor: headerBgColor }
              ]}>
                <View style={styles.txnHeaderTitleRow}>
                  <View style={styles.txnSuccessBadge}>
                    {badgeText === '✓' ? (
                      <Check size={10} color={badgeTextColor} />
                    ) : badgeText === '✕' ? (
                      <X size={10} color={badgeTextColor} />
                    ) : (
                      <Clock size={10} color={badgeTextColor} />
                    )}
                  </View>
                  <Text style={styles.txnHeaderText}>
                    {titleText}
                  </Text>
                </View>
                <Text style={styles.txnStatusSub}>
                  {statusText}
                </Text>
              </View>

              {/* Body details */}
              <View style={styles.txnBody}>
                <Text style={styles.txnAmountLabel}>Product & Quantity</Text>
                <Text style={styles.txnAmount}>{productName} ({matchedDelivery ? matchedDelivery.quantity : (parsed.quantity || '0')} {unitName})</Text>

                <View style={styles.txnDivider} />

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Recorded By</Text>
                  <Text style={styles.txnDetailValue} numberOfLines={1}>
                    {matchedDelivery?.createdBy?.name || (isSentType ? sellerName : buyerName)}
                  </Text>
                </View>

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Role Type</Text>
                  <Text style={styles.txnDetailValue}>{isSentType ? 'Dispatch (Sent)' : 'Confirm Receipt (Received)'}</Text>
                </View>

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Date & Time</Text>
                  <Text style={styles.txnDetailValue}>{formattedDate}, {item.time}</Text>
                </View>

                <View style={styles.txnDetailRow}>
                  <Text style={styles.txnDetailLabel}>Delivery Ref ID</Text>
                  <Text style={styles.txnDetailValue}>{deliveryTxnId}</Text>
                </View>

                {matchedDelivery?.notes || matchedDelivery?.notes === '' ? (
                  matchedDelivery.notes ? (
                    <View style={styles.txnNotesBox}>
                      <Text style={styles.txnNotesLabel}>Notes</Text>
                      <Text style={styles.txnNotesText}>{matchedDelivery.notes}</Text>
                    </View>
                  ) : null
                ) : (
                  item.text.includes('Notes:') ? (
                    <View style={styles.txnNotesBox}>
                      <Text style={styles.txnNotesLabel}>Notes</Text>
                      <Text style={styles.txnNotesText}>{item.text.split('Notes:')[1].trim()}</Text>
                    </View>
                  ) : null
                )}

                {matchedDelivery?.attachmentUrl ? (
                  <View style={styles.txnNotesBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <FileText size={10} color="#94A3B8" />
                      <Text style={[styles.txnNotesLabel, { marginBottom: 0 }]}>Proof Document Link</Text>
                    </View>
                    <Text style={[styles.txnNotesText, { color: '#2563EB', textDecorationLine: 'underline' }]} numberOfLines={1}>
                      {matchedDelivery.attachmentUrl}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action buttons row */}
              {showActions && matchedDelivery && (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleUpdateDeliveryStatus(matchedDelivery._id, 'approved')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleUpdateDeliveryStatus(matchedDelivery._id, 'rejected')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom footer banner */}
              <View style={styles.txnFooter}>
                {statusText.includes('Approved') ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <Check size={12} color="#10B981" strokeWidth={3} />
                    <Text style={[styles.txnFooterText, { color: '#10B981', fontWeight: '800', marginBottom: 0 }]}>
                      APPROVED BY {matchedDelivery?.deliveryType === 'sent' ? 'BUYER' : 'SELLER'}
                    </Text>
                  </View>
                ) : statusText.includes('Rejected') ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <X size={12} color="#EF4444" strokeWidth={3} />
                    <Text style={[styles.txnFooterText, { color: '#EF4444', fontWeight: '800', marginBottom: 0 }]}>
                      REJECTED BY {matchedDelivery?.deliveryType === 'sent' ? 'BUYER' : 'SELLER'}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <ShieldCheck size={14} color="#64748B" />
                    <Text style={[styles.txnFooterText, { marginBottom: 0 }]}>Pravisti Logistics Ledger</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    }

    if (isSystemMsg) {
      return (
        <View style={styles.messageRowContainer}>
          {showDateSeparator && (
            <View style={styles.dateSeparatorContainer}>
              <View style={styles.dateSeparatorPill}>
                <Text style={styles.dateSeparatorText}>{getMessageDateString(item.dateRaw)}</Text>
              </View>
            </View>
          )}
          <View style={styles.systemMessageContainer}>
            <View style={styles.systemMessagePill}>
              <Text style={styles.systemMessageText}>{cleanSystemText(item.text)}</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.messageRowContainer}>
        {showDateSeparator && (
          <View style={styles.dateSeparatorContainer}>
            <View style={styles.dateSeparatorPill}>
              <Text style={styles.dateSeparatorText}>{getMessageDateString(item.dateRaw)}</Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.messageWrapper,
            isMe ? styles.myMessageWrapper : styles.otherMessageWrapper,
          ]}
        >
          {!isMe && (
            <Text style={styles.senderName}>{item.sender}</Text>
          )}

          <View
            style={[
              styles.messageBubble,
              isMe ? styles.myMessageBubble : styles.otherMessageBubble,
            ]}
          >
            {/* WhatsApp Tail Notch */}
            <View style={isMe ? styles.myBubbleTail : styles.otherBubbleTail} />

            <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
              {item.text}
            </Text>

            <View style={styles.messageMetaRow}>
              <Text style={[styles.messageTimeText, isMe ? styles.myMessageTimeText : styles.otherMessageTimeText]}>
                {item.time}
              </Text>
              {isMe && (
                <View style={styles.statusTickWrapper}>
                  {item.status === 'sending' && (
                    <Text style={[styles.statusTickText, { color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }]}>⏳</Text>
                  )}
                  {item.status === 'sent' && (
                    <Text style={[styles.statusTickText, { color: 'rgba(255, 255, 255, 0.7)' }]}>✓</Text>
                  )}
                  {item.status === 'delivered' && (
                    <Text style={[styles.statusTickText, { color: 'rgba(255, 255, 255, 0.85)' }]}>✓✓</Text>
                  )}
                  {item.status === 'read' && (
                    <Text style={[styles.statusTickText, { color: '#60A5FA', fontWeight: '900' }]}>✓✓</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Premium Glassmorphic-Style Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.7}
        >
          <X size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerAvatarContainer}>
          <View style={[styles.headerAvatarCircle, { borderColor: onlineStatus === 'online' ? '#10B981' : '#E2E8F0' }]}>
            <Text style={styles.headerAvatarText}>
              {getInitials(partyName)}
            </Text>
          </View>
          {isDealApproved && onlineStatus === 'online' && (
            <View style={styles.headerOnlineDot} />
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {dealName}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {partyName}
            </Text>
            <View style={styles.statusDotSeparator} />
            <View style={[
              styles.myRoleBadge,
              myRole === 'Seller' ? styles.roleSeller :
                myRole === 'Buyer' ? styles.roleBuyer :
                  myRole === 'Broker' ? styles.roleBroker : styles.roleViewer
            ]}>
              <Text style={[
                styles.myRoleBadgeText,
                myRole === 'Seller' ? styles.roleTextSeller :
                  myRole === 'Buyer' ? styles.roleTextBuyer :
                    myRole === 'Broker' ? styles.roleTextBroker : styles.roleTextViewer
              ]}>
                {myRole.toUpperCase()}
              </Text>
            </View>
            {isDealApproved && (
              <>
                <View style={styles.statusDotSeparator} />
                <View style={[
                  styles.networkStatusPill,
                  { backgroundColor: isConnected ? '#DCFCE7' : '#FEF3C7' }
                ]}>
                  <Text style={[
                    styles.networkStatusText,
                    { color: isConnected ? '#166534' : '#92400E' }
                  ]}>
                    {isConnected ? 'SECURE' : 'CONNECTING'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.infoButton} activeOpacity={0.7}>
          <Info size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* ─── FULL SCREEN LOCKED VIEW (IF UNAPPROVED) ─── */}
      {!isDealApproved ? (
        <View style={styles.lockedFullscreenContainer}>
          <View style={styles.lockedCard}>
            <View style={styles.lockedBadgeBubble}>
              <Lock size={32} color="#DC2626" />
            </View>
            <Text style={styles.lockedCardTitle}>Negotiation Closed</Text>
            <Text style={styles.lockedCardSubtitle}>Agreement Pending Approval</Text>
            <Text style={styles.lockedCardDesc}>
              Chat conversations are strictly disabled for this Sauda. Both Buyer and Seller must fully approve the deal terms inside the trade ledger to unlock the real-time negotiation channel.
            </Text>
            <TouchableOpacity
              style={styles.viewTermsBtn}
              onPress={() => onNavigate('pop')}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                <FileText size={16} color="#FFFFFF" />
                <Text style={styles.viewTermsBtnText}>View Trade Ledger Terms</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Chat List or Stunning Empty Welcome State */}
          {chatMessages.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyWelcomeContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.emptyWelcomeCard}>
                <View style={styles.welcomeEmojiBubble}>
                  <Handshake size={44} color="#007AFF" />
                </View>
                <Text style={styles.welcomeTitle}>Channel Unlocked!</Text>
                <Text style={styles.welcomeSubtitle}>Approved Sauda Negotiation Ledger</Text>
                <Text style={styles.welcomeDesc}>
                  Your agreement is officially approved. Send a secure real-time message to <Text style={{ fontWeight: '800', color: '#007AFF' }}>{partyName}</Text> to align on logistics, packaging, and dispatch timelines.
                </Text>

                {/* Dynamic Suggestion Chips */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'center' }}>
                  <Lightbulb size={14} color="#F59E0B" />
                  <Text style={styles.suggestionsLabel}>SUGGESTED DISCUSSIONS</Text>
                </View>
                <View style={styles.chipsRow}>
                  {suggestionChips.map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.chipButton}
                      onPress={() => setMessage(chip)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chipText}>{chip}</Text>
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
              contentContainerStyle={styles.chatList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}

          {/* Interactive Typing Indicator */}
          {isCounterpartyTyping && (
            <View style={styles.typingIndicatorWrapper}>
              <View style={styles.typingBubble}>
                <Text style={styles.typingDot}>•</Text>
                <Text style={[styles.typingDot, { opacity: 0.6 }]}>•</Text>
                <Text style={[styles.typingDot, { opacity: 0.3 }]}>•</Text>
                <Text style={styles.typingText}>{partyName} is typing...</Text>
              </View>
            </View>
          )}

          {/* Premium Floating capsule Input Area */}
          <View style={styles.inputContainerWrapper}>
            {showAttachMenu && (
              <View style={styles.attachMenuContainer}>
                {(myRole === 'Buyer' || myRole === 'Broker') && (
                  <TouchableOpacity
                    style={[styles.attachMenuItem, styles.sendPaymentBtn, { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPaymentAction('sent')}
                  >
                    <CreditCard size={14} color="#10B981" />
                    <Text style={[styles.attachMenuText, styles.sendPaymentText]}>Send Payment</Text>
                  </TouchableOpacity>
                )}

                {(myRole === 'Seller' || myRole === 'Broker') && (
                  <TouchableOpacity
                    style={[styles.attachMenuItem, styles.takePaymentBtn, { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectPaymentAction('received')}
                  >
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={[styles.attachMenuText, styles.takePaymentText]}>Take Payment</Text>
                  </TouchableOpacity>
                )}

                {(myRole === 'Seller' || myRole === 'Broker') && (
                  <TouchableOpacity
                    style={[styles.attachMenuItem, styles.recordDispatchBtn, { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectDeliveryAction('sent')}
                  >
                    <Truck size={14} color="#3B82F6" />
                    <Text style={[styles.attachMenuText, styles.recordDispatchText]}>Record Dispatch</Text>
                  </TouchableOpacity>
                )}

                {(myRole === 'Buyer' || myRole === 'Broker') && (
                  <TouchableOpacity
                    style={[styles.attachMenuItem, styles.confirmReceiptBtn, { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectDeliveryAction('received')}
                  >
                    <Download size={14} color="#3B82F6" />
                    <Text style={[styles.attachMenuText, styles.confirmReceiptText]}>Confirm Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.inputArea}>
              <TouchableOpacity
                style={styles.attachButton}
                activeOpacity={0.7}
                onPress={() => setShowAttachMenu(prev => !prev)}
              >
                {showAttachMenu ? (
                  <X size={18} color="#64748B" />
                ) : (
                  <Plus size={18} color="#64748B" />
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.textInput}
                placeholder={`Type message as ${myRole}...`}
                placeholderTextColor="#94A3B8"
                value={message}
                onChangeText={handleInputChange}
                multiline
              />

              <TouchableOpacity
                style={[styles.sendButton, !message.trim() && { backgroundColor: '#E2E8F0' }]}
                activeOpacity={0.8}
                onPress={handleSend}
                disabled={!message.trim()}
              >
                <Send size={16} color={message.trim() ? '#FFFFFF' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* 💳 LOG PAYMENT MODAL */}
      <Modal
        visible={isPaymentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Payment Entry</Text>
              <TouchableOpacity onPress={() => setIsPaymentModalVisible(false)} style={{ padding: 4 }}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              {/* Amount input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Amount (INR)*</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter amount (e.g. 50000)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />
              </View>

              {/* Payment Type Selection */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Type*</Text>
                <View style={styles.modalSelectorRow}>
                  <TouchableOpacity
                    style={[styles.modalSelectorBtn, paymentType === 'sent' && styles.modalSelectorBtnActive]}
                    onPress={() => setPaymentType('sent')}
                  >
                    <Text style={[styles.modalSelectorBtnText, paymentType === 'sent' && styles.modalSelectorBtnTextActive]}>
                      Sent (Paid)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSelectorBtn, paymentType === 'received' && styles.modalSelectorBtnActive]}
                    onPress={() => setPaymentType('received')}
                  >
                    <Text style={[styles.modalSelectorBtnText, paymentType === 'received' && styles.modalSelectorBtnTextActive]}>
                      Received
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method Grid Selector */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Payment Method*</Text>
                <View style={styles.methodGrid}>
                  {['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'RTGS', 'NEFT', 'IMPS'].map(method => {
                    const isActive = paymentMethod === method;
                    return (
                      <TouchableOpacity
                        key={method}
                        style={[styles.methodGridItem, isActive && styles.methodGridItemActive]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Text style={[styles.methodGridText, isActive && styles.methodGridTextActive]}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Transaction Notes (Optional)</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="e.g. Advance payment / Milestone 1"
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={3}
                  value={paymentNotes}
                  onChangeText={setPaymentNotes}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalCancelBtn]}
                  onPress={() => setIsPaymentModalVisible(false)}
                  disabled={isLoggingPayment}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalSubmitBtn]}
                  onPress={handleLogPayment}
                  disabled={isLoggingPayment}
                >
                  {isLoggingPayment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Log Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🚚 LOG DELIVERY MODAL */}
      <Modal
        visible={isDeliveryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDeliveryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Product Delivery</Text>
              <TouchableOpacity onPress={() => setIsDeliveryModalVisible(false)} style={{ padding: 4 }}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              {/* Product Selection */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Select Product*</Text>
                <View style={styles.productSelectionContainer}>
                  {deal?.products?.map((prod) => {
                    const pId = prod.productId?._id || prod.productId || prod._id || prod.id;
                    const isSelected = String(deliveryProductId) === String(pId);
                    const prodName = prod.productId?.name || prod.name || 'Product';
                    return (
                      <TouchableOpacity
                        key={pId}
                        style={[
                          styles.productSelectBtn,
                          isSelected && styles.productSelectBtnActive
                        ]}
                        onPress={() => setDeliveryProductId(pId)}
                      >
                        <Text style={[
                          styles.productSelectBtnText,
                          isSelected && styles.productSelectBtnTextActive
                        ]}>
                          {prodName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Quantity Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Quantity to Deliver*</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Enter quantity (e.g. 10)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={deliveryQuantity}
                  onChangeText={setDeliveryQuantity}
                />
              </View>

              {/* Delivery Type Display */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Delivery Mode</Text>
                <View style={[styles.readOnlyBadge, deliveryType === 'sent' ? styles.readOnlyBadgeSent : styles.readOnlyBadgeReceived]}>
                  <Text style={[styles.readOnlyBadgeText, deliveryType === 'sent' ? styles.readOnlyBadgeTextSent : styles.readOnlyBadgeTextReceived]}>
                    {deliveryType === 'sent' ? '🚚 SENT (DISPATCHED BY SELLER)' : '📥 RECEIVED (CONFIRMED BY BUYER)'}
                  </Text>
                </View>
              </View>

              {/* Notes Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Delivery Notes / Remarks (Optional)</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="e.g. Truck number, dispatch details..."
                  placeholderTextColor="#94A3B8"
                  multiline={true}
                  numberOfLines={2}
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                />
              </View>

              {/* Attachment URL Input */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Proof Document / Image URL (Optional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="e.g. https://cdn.example.com/slip.jpg"
                  placeholderTextColor="#94A3B8"
                  value={deliveryAttachmentUrl}
                  onChangeText={setDeliveryAttachmentUrl}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalCancelBtn]}
                  onPress={() => setIsDeliveryModalVisible(false)}
                  disabled={isLoggingDelivery}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, styles.modalSubmitBtn, { backgroundColor: '#3B82F6' }]}
                  onPress={handleLogDelivery}
                  disabled={isLoggingDelivery}
                >
                  {isLoggingDelivery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Record Delivery</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5DDD5',
  },
  keyboardView: {
    flex: 1,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backIcon: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '800',
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  headerAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#007AFF',
    letterSpacing: -0.2,
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusDotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  myRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRoleBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  roleSeller: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  roleTextSeller: {
    color: '#2E7D32',
  },
  roleBuyer: {
    backgroundColor: '#E3F2FD',
    borderColor: '#BBDEFB',
  },
  roleTextBuyer: {
    color: '#1565C0',
  },
  roleBroker: {
    backgroundColor: '#F3E5F5',
    borderColor: '#E1BEE7',
  },
  roleTextBroker: {
    color: '#6A1B9A',
  },
  roleViewer: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  roleTextViewer: {
    color: '#616161',
  },
  networkStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  networkStatusText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },

  // Stunning Full Screen Locked View
  lockedFullscreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  lockedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#FFE4E6',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 4,
  },
  lockedBadgeBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockedBadgeEmoji: {
    fontSize: 32,
  },
  lockedCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#9F1239',
    marginBottom: 4,
  },
  lockedCardSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E11D48',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  lockedCardDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 24,
  },
  viewTermsBtn: {
    backgroundColor: '#E11D48',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  viewTermsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // Empty Welcome State with suggestions
  emptyWelcomeContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyWelcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 3,
  },
  welcomeEmojiBubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  welcomeEmoji: {
    fontSize: 30,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  welcomeDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 24,
  },
  suggestionsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  chipButton: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 11,
    color: '#312E81',
    fontWeight: '700',
  },

  chatList: {
    padding: 16,
    paddingBottom: 32,
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 0,
    backgroundColor: 'transparent',
  },
  dateSeparatorPill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  dateSeparatorText: {
    fontSize: 10,
    color: '#667781',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  messageWrapper: {
    marginBottom: 14,
    maxWidth: '80%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 4,
    marginLeft: 6,
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    position: 'relative',
  },
  myMessageBubble: {
    backgroundColor: '#D9FDD3',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    minWidth: 95,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    minWidth: 80,
  },
  messageRowContainer: {
    width: '100%',
  },
  myBubbleTail: {
    position: 'absolute',
    right: -4,
    top: 0,
    width: 10,
    height: 10,
    backgroundColor: '#D9FDD3',
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
  otherBubbleTail: {
    position: 'absolute',
    left: -4,
    top: 0,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  myMessageText: {
    color: '#111B21',
  },
  otherMessageText: {
    color: '#111B21',
  },
  messageMetaRow: {
    position: 'absolute',
    bottom: 4,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageTimeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  myMessageTimeText: {
    color: '#667781',
  },
  otherMessageTimeText: {
    color: '#667781',
  },
  statusTickWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTickText: {
    fontSize: 8,
  },
  typingIndicatorWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  typingDot: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '900',
    marginTop: -4,
  },
  typingText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginLeft: 4,
  },
  inputContainerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 28,
    backgroundColor: 'transparent',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: {
    fontSize: 20,
    color: '#64748B',
    fontWeight: '700',
    marginTop: -1,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    fontSize: 14,
    color: '#1E293B',
    maxHeight: 100,
    fontWeight: '500',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIconText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* PAYMENT MENU & ALERTS & MODAL STYLES */
  attachMenuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    gap: 10,
  },
  attachMenuItem: {
    flexBasis: '48%',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  attachMenuText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  sendPaymentBtn: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  sendPaymentText: {
    color: '#E11D48',
  },
  takePaymentBtn: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  takePaymentText: {
    color: '#16A34A',
  },
  recordDispatchBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  recordDispatchText: {
    color: '#2563EB',
  },
  confirmReceiptBtn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  confirmReceiptText: {
    color: '#D97706',
  },
  paymentCardWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  paymentCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    elevation: 4,
  },
  paymentReceivedCard: {
    borderColor: '#D1FAE5',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  paymentSentCard: {
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  paymentIndicatorBar: {
    width: 6,
    height: '100%',
  },
  paymentCardContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  paymentCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentCardText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
    lineHeight: 18,
  },
  paymentCardTime: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalCloseIcon: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '700',
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  modalInputGroup: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: '850',
    color: '#475569',
    letterSpacing: 0.2,
  },
  modalTextInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '700',
  },
  modalSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  modalSelectorBtnActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E0F2FE',
  },
  modalSelectorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSelectorBtnTextActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodGridItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  methodGridItemActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E0F2FE',
  },
  methodGridText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  methodGridTextActive: {
    color: '#4F46E5',
    fontWeight: '900',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontWeight: '900',
    fontSize: 12,
  },
  modalSubmitBtn: {
    backgroundColor: '#007AFF',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },

  /* GPAY / PHONEPE TRANSACTION CARDS */
  txnCardSent: {
    borderTopColor: '#5F259F',
  },
  txnCardReceived: {
    borderTopColor: '#0F9D58',
  },
  txnCardRejected: {
    borderTopColor: '#DC2626',
  },
  txnCardContainer: {
    width: '100%',
    marginVertical: 10,
    flexDirection: 'row',
  },
  txnCardLeft: {
    justifyContent: 'flex-start',
    paddingLeft: 16,
  },
  txnCardRight: {
    justifyContent: 'flex-end',
    paddingRight: 16,
  },
  txnCard: {
    width: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  txnHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  txnHeaderSent: {
    backgroundColor: '#5F259F',
  },
  txnHeaderReceived: {
    backgroundColor: '#0F9D58',
  },
  txnHeaderRejected: {
    backgroundColor: '#DC2626',
  },
  txnRejectedBadge: {
    backgroundColor: '#FFFFFF',
  },
  txnRejectedCross: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '950',
  },
  txnHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txnSuccessBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnSuccessCheck: {
    color: '#0F9D58',
    fontSize: 10,
    fontWeight: '950',
  },
  txnHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  txnStatusSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 2,
    marginLeft: 22,
  },
  txnBody: {
    padding: 12,
  },
  txnAmountLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  txnAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  txnDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  txnDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  txnDetailLabel: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '700',
  },
  txnDetailValue: {
    fontSize: 9,
    color: '#1E293B',
    fontWeight: '800',
    maxWidth: '60%',
  },
  txnNotesBox: {
    marginTop: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  txnNotesLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  txnNotesText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
    marginTop: 1,
  },
  txnFooter: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txnFooterText: {
    fontSize: 8,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  systemMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  systemMessagePill: {
    backgroundColor: '#FFEFC6', // WhatsApp beige/yellow system pill
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: '85%',
    borderWidth: 0.5,
    borderColor: '#E2D8C0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  systemMessageText: {
    fontSize: 11,
    color: '#514D43',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  deliveryCardContainer: {
    width: '100%',
    marginVertical: 10,
    alignItems: 'center',
  },
  deliveryCard: {
    width: 280,
    maxWidth: '85%',
    backgroundColor: '#F0FDF4',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    overflow: 'hidden',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  deliveryHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  deliveryBody: {
    padding: 12,
  },
  deliveryMessageText: {
    fontSize: 12,
    color: '#14532D',
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  deliveryFooter: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  deliveryFooterText: {
    fontSize: 8,
    color: '#16A34A',
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* ================= DELIVERY CUSTOM STYLES ================= */
  productSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  productSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  productSelectBtnActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  productSelectBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  productSelectBtnTextActive: {
    color: '#1E40AF',
    fontWeight: '800',
  },
  readOnlyBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readOnlyBadgeSent: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  readOnlyBadgeReceived: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  readOnlyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  readOnlyBadgeTextSent: {
    color: '#1D4ED8',
  },
  readOnlyBadgeTextReceived: {
    color: '#047857',
  },
});

export default DealChat;