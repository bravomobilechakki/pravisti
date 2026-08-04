import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  Image,
  Share,
  Linking,
} from 'react-native';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Share2,
  Building2,
  FileText,
  ShieldCheck,
  Clock,
  ArrowLeft,
} from 'lucide-react-native';

const COLORS = {
  headerStart: '#3465EA',
  headerMiddle: '#2554D7',
  headerEnd: '#1E46C6',
  glowWhite: 'rgba(255, 255, 255, 0.12)',
  glowIndigo: 'rgba(52, 101, 234, 0.20)',
  glassBg: 'rgba(255, 255, 255, 0.15)',
  glassBorder: 'rgba(255, 255, 255, 0.20)',
  primaryBtn: '#3465EA',
  primaryBtnHighlight: '#4B79EE',
  bg: '#F7F8FC',
  receiptBg: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E5E7EB',
  divider: '#F1F5F9',
  successOuter: '#D1FAE5',
  successInner: '#34D399',
  successDark: '#10B981',
  errorOuter: '#FEE2E2',
  errorInner: '#EF4444',
  errorDark: '#DC2626',
};

const DEFAULT_CONFIGS = {
  dealCreated: {
    headerTitle: 'Deal Receipt',
    title: 'Deal Created Successfully!',
    message: 'The deal has been created and sent to the selected parties for confirmation.',
    primaryButtonLabel: 'View Deal',
  },
  dealApproved: {
    headerTitle: 'Approval Receipt',
    title: 'Deal Approved Successfully!',
    message: 'Your approval has been recorded successfully.',
    primaryButtonLabel: 'Done',
  },
  dealDeclined: {
    headerTitle: 'Deal Update',
    title: 'Deal Declined',
    message: 'Your response has been recorded.',
    primaryButtonLabel: 'Done',
    isDecline: true,
  },
  companyCreated: {
    headerTitle: 'Company Receipt',
    title: 'Company Created Successfully!',
    message: 'The company profile is ready to use.',
    primaryButtonLabel: 'View Company',
  },
  companyUpdated: {
    headerTitle: 'Company Update',
    title: 'Company Updated Successfully!',
    message: 'The latest company information has been saved.',
    primaryButtonLabel: 'Done',
  },
  paymentRecorded: {
    headerTitle: 'Payment Receipt',
    title: 'Payment Recorded Successfully!',
    message: 'The payment entry has been added to this deal.',
    primaryButtonLabel: 'View Deal',
  },
  deliveryUpdated: {
    headerTitle: 'Delivery Receipt',
    title: 'Delivery Updated Successfully!',
    message: 'The delivery progress has been updated.',
    primaryButtonLabel: 'Done',
  },
  profileUpdated: {
    headerTitle: 'Profile Update',
    title: 'Profile Updated Successfully!',
    message: 'Your latest profile information has been saved.',
    primaryButtonLabel: 'Done',
  },
  traderInvited: {
    headerTitle: 'Invitation Receipt',
    title: 'Trader Invited Successfully!',
    message: 'An invitation has been sent to register on Pravisti.',
    primaryButtonLabel: 'Done',
  },
  productAdded: {
    headerTitle: 'Product Confirmation',
    title: 'Product Added Successfully!',
    message: 'The product details have been saved to your catalog.',
    primaryButtonLabel: 'Done',
  },
  default: {
    headerTitle: 'Confirmation',
    title: 'Action Completed Successfully!',
    message: 'Your request has been processed successfully.',
    primaryButtonLabel: 'Done',
  },
};

const BrokerSuccessReceipt = ({
  visible = false,
  actionType = 'default',
  title,
  message,
  headerTitle,
  referenceId,
  dateTime,
  primaryAmount,
  amountLabel = 'Transaction Value',
  partyInfo,
  summaryItems = [],
  details = [],
  primaryButtonLabel,
  onDone,
  onClose,
  onShare,
  onWhatsAppShare,
  showShare = false,
  showWhatsAppBtn = true,
  showDetails: initialShowDetails = true,
}) => {
  const [showDetailsState, setShowDetailsState] = useState(initialShowDetails);

  if (!visible) return null;

  const config = DEFAULT_CONFIGS[actionType] || DEFAULT_CONFIGS.default;
  const isDecline = config.isDecline || actionType === 'dealDeclined';

  const finalHeaderTitle = headerTitle || config.headerTitle;
  const finalTitle = title || config.title;
  const finalMessage = message || config.message;
  const finalButtonLabel = primaryButtonLabel || config.primaryButtonLabel;

  const formattedDateTime = dateTime
    ? typeof dateTime === 'string'
      ? dateTime
      : new Date(dateTime).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const handleWhatsAppShare = async () => {
    if (onWhatsAppShare) {
      onWhatsAppShare();
      return;
    }
    let shareMsg = `*${finalTitle}* 🤝\n\n`;
    if (referenceId) shareMsg += `*Ref:* ${referenceId}\n`;
    summaryItems.forEach(item => {
      if (item.label && item.value) {
        shareMsg += `*${item.label}:* ${item.value}\n`;
      }
    });
    if (primaryAmount) shareMsg += `*Total Value:* ${primaryAmount}\n`;
    shareMsg += `\n*Date:* ${formattedDateTime}\n\n`;
    shareMsg += `View deal details on Pravisti App:\nhttps://play.google.com/store/apps/details?id=com.pravisti`;

    const waUrl = `whatsapp://send?text=${encodeURIComponent(shareMsg)}`;
    try {
      await Linking.openURL(waUrl);
    } catch (e) {
      console.warn('WhatsApp direct launch failed, attempting fallback Share:', e);
      try {
        await Share.share({ message: shareMsg });
      } catch (shareErr) {
        console.warn('Share fallback error:', shareErr);
      }
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
      return;
    }
    handleWhatsAppShare();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onDone) {
      onDone();
    }
  };

  const handleDone = () => {
    if (onDone) {
      onDone();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.headerStart} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ─── HERO HEADER ─── */}
          <View style={styles.header}>
            <View style={styles.glowOrbTop} />
            <View style={styles.glowOrbBottom} />

            {/* Header Top Bar */}
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                style={styles.headerGlassBtn}
                onPress={handleClose}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close Receipt"
              >
                <ArrowLeft size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.headerTitleText} numberOfLines={1}>
                {finalHeaderTitle}
              </Text>

              {showShare || onShare || actionType === 'dealCreated' ? (
                <TouchableOpacity
                  style={styles.headerGlassBtn}
                  onPress={handleWhatsAppShare}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Share Receipt"
                >
                  <Share2 size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>
          </View>

          {/* ─── OVERLAPPING WHITE RECEIPT CARD ─── */}
          <View style={styles.receiptCardContainer}>
            {/* Top Centered Status Circle */}
            <View style={styles.iconCircleWrapper}>
              <View
                style={[
                  styles.outerIconCircle,
                  isDecline ? styles.declineOuterCircle : styles.successOuterCircle,
                ]}
              >
                <View
                  style={[
                    styles.innerIconCircle,
                    isDecline ? styles.declineInnerCircle : styles.successInnerCircle,
                  ]}
                >
                  {isDecline ? (
                    <X size={26} color="#FFFFFF" strokeWidth={2.5} />
                  ) : (
                    <Check size={26} color="#FFFFFF" strokeWidth={2.5} />
                  )}
                </View>
              </View>
            </View>

            {/* Heading & Confirmation Message */}
            <View style={styles.textHeadingSection}>
              <Text style={styles.receiptTitleText}>{finalTitle}</Text>
              <Text style={styles.receiptMessageText}>{finalMessage}</Text>
            </View>

            <View style={styles.dividerLine} />

            {/* Primary Amount Display (If available) */}
            {primaryAmount !== undefined && primaryAmount !== null && (
              <View style={styles.amountDisplayRow}>
                <Text style={styles.amountLabelText}>{amountLabel}</Text>
                <Text style={styles.amountValueText}>{primaryAmount}</Text>
              </View>
            )}

            {/* Party or Beneficiary Entity Card (If available) */}
            {partyInfo && (partyInfo.name || partyInfo.title) && (
              <View style={styles.partyCardRow}>
                {partyInfo.avatarUri ? (
                  <Image
                    source={{ uri: partyInfo.avatarUri }}
                    style={styles.partyAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.partyInitialsBox}>
                    <Text style={styles.partyInitialsText}>
                      {partyInfo.initials ||
                        (partyInfo.name || 'CO')
                          .trim()
                          .split(/\s+/)
                          .map((w) => w[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.partyDetailsCol}>
                  <Text style={styles.partyNameText} numberOfLines={1}>
                    {partyInfo.name || partyInfo.title}
                  </Text>
                  <Text style={styles.partySubText} numberOfLines={1}>
                    {partyInfo.subText || partyInfo.role || 'Business Entity'}
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Summary Items */}
            {summaryItems.length > 0 && (
              <View style={styles.summaryListSection}>
                {summaryItems.map((item, idx) => {
                  if (item.value === undefined || item.value === null || item.value === '') {
                    return null;
                  }
                  return (
                    <View key={idx} style={styles.summaryRow}>
                      <Text style={styles.summaryLabelText}>{item.label}</Text>
                      <Text
                        style={[
                          styles.summaryValueText,
                          item.highlight && styles.summaryHighlightValue,
                        ]}
                        numberOfLines={2}
                      >
                        {String(item.value)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Date & Time Row */}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabelText}>Date & time</Text>
              <Text style={styles.metaValueText}>{formattedDateTime}</Text>
            </View>

            {/* Reference Number Row */}
            {referenceId ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabelText}>No. Ref</Text>
                <Text style={styles.metaValueTextBold}>{referenceId}</Text>
              </View>
            ) : null}

            {/* Expandable "See Details" Section */}
            {details.length > 0 && (
              <View style={styles.detailsAccordionSection}>
                <TouchableOpacity
                  style={styles.detailsToggleRow}
                  onPress={() => setShowDetailsState(!showDetailsState)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailsToggleText}>See Details</Text>
                  {showDetailsState ? (
                    <ChevronUp size={18} color={COLORS.textSecondary} />
                  ) : (
                    <ChevronDown size={18} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>

                {showDetailsState && (
                  <View style={styles.expandedDetailsContainer}>
                    {details.map((detail, index) => {
                      if (
                        detail.value === undefined ||
                        detail.value === null ||
                        detail.value === ''
                      ) {
                        return null;
                      }
                      return (
                        <View key={index} style={styles.expandedRow}>
                          <Text style={styles.expandedLabel}>{detail.label}</Text>
                          <Text style={styles.expandedValue}>{String(detail.value)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* ─── STICKY BOTTOM DONE BUTTON ─── */}
        <View style={styles.bottomBar}>
          {actionType === 'dealCreated' || showWhatsAppBtn ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.whatsappPrimaryBtn}
                onPress={handleWhatsAppShare}
                activeOpacity={0.85}
              >
                <Share2 size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.whatsappPrimaryBtnText}>Share Deal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.donePrimaryBtn, { flex: 1 }]}
                onPress={handleDone}
                activeOpacity={0.85}
              >
                <Text style={styles.donePrimaryBtnText}>{finalButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.donePrimaryBtn}
              onPress={handleDone}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={finalButtonLabel}
            >
              <Text style={styles.donePrimaryBtnText}>{finalButtonLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  /* ── HEADER ── */
  header: {
    backgroundColor: COLORS.headerStart,
    height: 210,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 12) + 8 : 14,
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: COLORS.glowWhite,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.glowIndigo,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  headerGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    flex: 1,
    textAlign: 'center',
  },

  /* ── OVERLAPPING RECEIPT PANEL ── */
  receiptCardContainer: {
    backgroundColor: COLORS.receiptBg,
    marginHorizontal: 16,
    marginTop: -85,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 20,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#EEF0F4',
  },

  /* Status Icon Circle */
  iconCircleWrapper: {
    alignItems: 'center',
    marginTop: -29,
    marginBottom: 14,
  },
  outerIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successOuterCircle: {
    backgroundColor: COLORS.successOuter,
  },
  declineOuterCircle: {
    backgroundColor: COLORS.errorOuter,
  },
  innerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successInnerCircle: {
    backgroundColor: COLORS.successInner,
  },
  declineInnerCircle: {
    backgroundColor: COLORS.errorInner,
  },

  /* Headings */
  textHeadingSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  receiptMessageText: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },

  dividerLine: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 14,
  },

  /* Amount */
  amountDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  amountLabelText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  amountValueText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  /* Beneficiary Entity Card */
  partyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 14,
  },
  partyAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
  },
  partyInitialsBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  partyInitialsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284C7',
  },
  partyDetailsCol: {
    flex: 1,
  },
  partyNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  partySubText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },

  /* Summary Section */
  summaryListSection: {
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabelText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORS.textMuted,
    flex: 1,
  },
  summaryValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },
  summaryHighlightValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.headerStart,
  },

  /* Meta Rows */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  metaLabelText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  metaValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  metaValueTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },

  /* Expandable Accordion */
  detailsAccordionSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 12,
  },
  detailsToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailsToggleText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  expandedDetailsContainer: {
    marginTop: 8,
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  expandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    flex: 1,
  },
  expandedValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },

  /* ── STICKY BOTTOM BAR ── */
  bottomBar: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 14,
  },
  donePrimaryBtn: {
    height: 52,
    backgroundColor: COLORS.primaryBtn,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primaryBtn,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  donePrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  whatsappPrimaryBtn: {
    flex: 1,
    height: 52,
    backgroundColor: '#179345ff',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#20944bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  whatsappPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default BrokerSuccessReceipt;
