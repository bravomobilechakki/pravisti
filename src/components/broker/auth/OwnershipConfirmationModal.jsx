import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import {
  ShieldCheck,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { confirmOwnerVerification } from '../../../services/api';

const OwnershipConfirmationModal = ({
  visible,
  onClose,
  userData,
  onConfirmed,
  onRejected,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const companyName = userData?.companyName || userData?.company || 'Nature Fresh Foods Pvt Ltd';
  const brokerName = userData?.brokerName || 'Rahul Sharma';
  const brokerCompany = userData?.brokerCompanyName || 'XYZ Brokers Pvt Ltd';

  const handleConfirm = async (isConfirmed) => {
    setIsLoading(true);
    try {
      const res = await confirmOwnerVerification({
        userId: userData?._id,
        confirm: isConfirmed,
      });

      if (isConfirmed) {
        Alert.alert(
          'Account Activated! 🎉',
          `Welcome to Pravisti! Your company "${companyName}" and all pre-created deals are now active on your dashboard.`,
          [
            {
              text: 'Go to Dashboard',
              onPress: () => {
                if (onConfirmed) onConfirmed();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Information Rejected',
          'Thank you. We have notified the broker and removed the unconfirmed account information.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onRejected) onRejected();
                onClose();
              },
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(15, 23, 42, 0.8)" />
      <View style={styles.overlay}>
        <View style={styles.cardContainer}>
          {/* Top Banner */}
          <View style={styles.topBanner}>
            <Sparkles size={28} color="#FFFFFF" style={{ marginBottom: 6 }} />
            <Text style={styles.welcomeText}>Welcome to Pravisti 👋</Text>
            <Text style={styles.bannerSub}>
              Broker assisted account creation verification.
            </Text>
          </View>

          <ScrollView contentContainerStyle={styles.bodyContent}>
            {/* Context Explanation */}
            <Text style={styles.introText}>
              Broker <Text style={{ fontWeight: '800', color: '#4F46E5' }}>{brokerCompany}</Text> has created a business account on your behalf to initiate a commodity deal.
            </Text>

            {/* Company Info Box */}
            <View style={styles.infoBox}>
              <View style={styles.boxHeader}>
                <Building2 size={18} color="#4F46E5" style={{ marginRight: 6 }} />
                <Text style={styles.boxTitle}>Company Information</Text>
              </View>
              <Text style={styles.companyName}>{companyName}</Text>
              {userData?.address ? (
                <View style={styles.metaRow}>
                  <MapPin size={14} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.metaText}>{userData.address}</Text>
                </View>
              ) : null}
            </View>

            {/* Broker Info Box */}
            <View style={styles.infoBox}>
              <View style={styles.boxHeader}>
                <User size={18} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.boxTitle}>Created By Broker</Text>
              </View>
              <Text style={styles.brokerName}>{brokerName}</Text>
              <Text style={styles.brokerCompanyText}>{brokerCompany}</Text>
            </View>

            {/* Confirmation Question */}
            <Text style={styles.questionText}>
              Do you confirm that this business information belongs to you?
            </Text>

            {/* Action Buttons */}
            {isLoading ? (
              <ActivityIndicator size="large" color="#4F46E5" style={{ marginVertical: 20 }} />
            ) : (
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.noBtn}
                  onPress={() => handleConfirm(false)}
                >
                  <XCircle size={18} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.noBtnText}>NO (Reject)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.yesBtn}
                  onPress={() => handleConfirm(true)}
                >
                  <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.yesBtnText}>YES (Confirm)</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  topBanner: {
    backgroundColor: '#312E81',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12,
    color: '#C7D2FE',
    fontWeight: '500',
  },
  bodyContent: {
    padding: 20,
  },
  introText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  boxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  boxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  brokerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  brokerCompanyText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  questionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginVertical: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  noBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
  },
  noBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  yesBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  yesBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default OwnershipConfirmationModal;
