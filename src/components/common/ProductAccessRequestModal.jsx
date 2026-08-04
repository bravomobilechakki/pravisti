import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {
  ShieldAlert,
  Building2,
  User,
  Package,
  FileText,
  CheckCircle2,
  XCircle,
  X,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react-native';
import { respondToProductAccessRequest } from '../../services/api';

const ProductAccessRequestModal = ({
  visible,
  requests = [],
  onClose,
  onResponseSuccess,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const activeRequest = pendingRequests[currentIndex] || pendingRequests[0];

  if (!visible || !activeRequest) return null;

  const broker = activeRequest.brokerCompanyId || {};
  const buyer = activeRequest.buyerCompanyId || {};
  const deal = activeRequest.dealId || {};
  const products = activeRequest.productIds || [];

  const handleAction = async (status) => {
    try {
      setSubmitting(true);
      const res = await respondToProductAccessRequest(activeRequest._id, status);
      setSubmitting(false);

      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      Alert.alert(
        `Request ${statusText}`,
        `Product access request has been ${status === 'approved' ? 'approved successfully' : 'rejected'}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (pendingRequests.length > 1) {
                if (currentIndex >= pendingRequests.length - 1) {
                  setCurrentIndex(0);
                }
              }
              if (onResponseSuccess) {
                onResponseSuccess();
              }
            },
          },
        ]
      );
    } catch (err) {
      setSubmitting(false);
      Alert.alert('Error', err.message || 'Failed to process request');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBadge}>
                <ShieldAlert size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.headerTitle}>Product Access Request</Text>
                <Text style={styles.headerSubtitle}>
                  Broker requires access to your products to create deal
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {pendingRequests.length > 1 && (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  disabled={currentIndex === 0}
                  onPress={() => setCurrentIndex(prev => prev - 1)}
                  style={[styles.pageBtn, currentIndex === 0 && styles.disabledBtn]}
                >
                  <ChevronLeft size={16} color={currentIndex === 0 ? "#94A3B8" : "#3B82F6"} />
                </TouchableOpacity>
                <Text style={styles.pageText}>
                  Request {currentIndex + 1} of {pendingRequests.length}
                </Text>
                <TouchableOpacity
                  disabled={currentIndex >= pendingRequests.length - 1}
                  onPress={() => setCurrentIndex(prev => prev + 1)}
                  style={[styles.pageBtn, currentIndex >= pendingRequests.length - 1 && styles.disabledBtn]}
                >
                  <ChevronRight size={16} color={currentIndex >= pendingRequests.length - 1 ? "#94A3B8" : "#3B82F6"} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Broker Information */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Building2 size={16} color="#2563EB" />
                <Text style={styles.sectionTitle}>Requesting Broker</Text>
              </View>
              <Text style={styles.companyName}>{broker.name || 'Broker Company'}</Text>
              {broker.phone ? (
                <View style={styles.infoRow}>
                  <Phone size={13} color="#64748B" />
                  <Text style={styles.infoText}>{broker.phone}</Text>
                </View>
              ) : null}
              {broker.email ? (
                <View style={styles.infoRow}>
                  <Mail size={13} color="#64748B" />
                  <Text style={styles.infoText}>{broker.email}</Text>
                </View>
              ) : null}
            </View>

            {/* Buyer Information */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <User size={16} color="#059669" />
                <Text style={styles.sectionTitle}>Target Buyer Company</Text>
              </View>
              <Text style={styles.companyName}>{buyer.name || 'Buyer Company'}</Text>
              {buyer.phone ? (
                <View style={styles.infoRow}>
                  <Phone size={13} color="#64748B" />
                  <Text style={styles.infoText}>{buyer.phone}</Text>
                </View>
              ) : null}
            </View>

            {/* Deal Details */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <FileText size={16} color="#7C3AED" />
                <Text style={styles.sectionTitle}>Draft Deal Info</Text>
              </View>
              <View style={styles.dealRow}>
                <Text style={styles.dealLabel}>Deal #:</Text>
                <Text style={styles.dealValue}>{deal.dealNumber || 'DRAFT'}</Text>
              </View>
              {deal.expiryDate && (
                <View style={styles.dealRow}>
                  <Text style={styles.dealLabel}>Expiry Date:</Text>
                  <Text style={styles.dealValue}>{formatDate(deal.expiryDate)}</Text>
                </View>
              )}
              {deal.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{deal.notes}</Text>
                </View>
              )}
            </View>

            {/* Requested Products */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Package size={16} color="#D97706" />
                <Text style={styles.sectionTitle}>Requested Products ({products.length})</Text>
              </View>
              {products.map((prod, idx) => (
                <View key={prod._id || idx} style={styles.productItem}>
                  <View style={styles.productDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{prod.name || 'Product'}</Text>
                    {prod.gstCode && (
                      <Text style={styles.productMeta}>GST: {prod.gstCode}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            {submitting ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ paddingVertical: 12 }} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleAction('rejected')}
                >
                  <XCircle size={18} color="#DC2626" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleAction('approved')}
                >
                  <CheckCircle2 size={18} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve Access</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFBEB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#92400E',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 12,
  },
  pageBtn: {
    padding: 4,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  pageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
  },
  dealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dealLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  dealValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  notesBox: {
    marginTop: 6,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  notesText: {
    fontSize: 12,
    color: '#1E40AF',
    marginTop: 2,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  productDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  productMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  footerActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  rejectBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    backgroundColor: '#059669',
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ProductAccessRequestModal;
