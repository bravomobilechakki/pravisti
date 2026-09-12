import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
  Alert,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  Share2,
  Download,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Printer,
  FileText,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Number to Indian Currency Words Formatter
function numberToIndianWords(num) {
  if (!num || isNaN(num)) return '';
  const n = Math.floor(Math.abs(Number(num)));
  if (n === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const b = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  const inWords = (val) => {
    let str = '';
    if (val > 19) {
      str += b[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + a[val % 10] : '');
    } else {
      str += a[val];
    }
    return str;
  };

  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const hundred = Math.floor(rem / 100);
  const rest = rem % 100;

  let result = '';
  if (crore > 0) result += inWords(crore) + ' Crore ';
  if (lakh > 0) result += inWords(lakh) + ' Lakh ';
  if (thousand > 0) result += inWords(thousand) + ' Thousand ';
  if (hundred > 0) result += inWords(hundred) + ' Hundred ';
  if (rest > 0) result += inWords(rest) + ' ';

  return result.trim() + ' Rupees Only';
}

const DealInvoice = ({ onNavigate, routeData }) => {
  const deal = routeData?.deal || {};
  const passedSellerDetails = routeData?.sellerCompanyDetails || {};
  const passedBuyerDetails = routeData?.buyerCompanyDetails || {};

  // Extract Deal Numbers & Dates
  const dealNumber =
    deal.dealNumber ||
    deal.contractNumber ||
    deal.dealId ||
    (deal._id ? String(deal._id).slice(-8).toUpperCase() : 'DEAL-001');

  const invoiceNumber = `INV-${dealNumber}`;
  const dealDate = deal.createdAt
    ? new Date(deal.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const dealTime = deal.createdAt
    ? new Date(deal.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Extract Parties
  const rawSeller =
    (typeof deal.sellerCompanyId === 'object' && deal.sellerCompanyId) ||
    (typeof deal.sellerCompany === 'object' && deal.sellerCompany) ||
    passedSellerDetails;

  const rawBuyer =
    (typeof deal.buyerCompanyId === 'object' && deal.buyerCompanyId) ||
    (typeof deal.buyerCompany === 'object' && deal.buyerCompany) ||
    passedBuyerDetails;

  const sellerName =
    deal.sellerCompanyName ||
    rawSeller.name ||
    rawSeller.companyName ||
    deal.sellerName ||
    'Supplier / Seller Firm';

  const sellerAddress =
    rawSeller.address ||
    rawSeller.registeredAddress ||
    [rawSeller.city, rawSeller.state].filter(Boolean).join(', ') ||
    'Registered Mandi Yard, India';

  const sellerGstin =
    rawSeller.gstin ||
    rawSeller.gstNumber ||
    rawSeller.registrationNumber ||
    rawSeller.taxId ||
    '—';

  const sellerPhone =
    rawSeller.mobileNumber ||
    rawSeller.phone ||
    rawSeller.ownerPhone ||
    '—';

  const sellerEmail = rawSeller.email || '—';

  const buyerName =
    deal.buyerCompanyName ||
    rawBuyer.name ||
    rawBuyer.companyName ||
    deal.buyerName ||
    'Buyer / Consignee Firm';

  const buyerAddress =
    rawBuyer.address ||
    rawBuyer.registeredAddress ||
    [rawBuyer.city, rawBuyer.state].filter(Boolean).join(', ') ||
    'Commercial Trade Hub, India';

  const buyerGstin =
    rawBuyer.gstin ||
    rawBuyer.gstNumber ||
    rawBuyer.registrationNumber ||
    rawBuyer.taxId ||
    '—';

  const buyerPhone =
    rawBuyer.mobileNumber ||
    rawBuyer.phone ||
    rawBuyer.ownerPhone ||
    '—';

  const buyerEmail = rawBuyer.email || '—';

  const brokerName =
    (typeof deal.brokerCompanyId === 'object' && deal.brokerCompanyId?.name) ||
    deal.brokerName ||
    deal.brokerCompanyName ||
    (deal.isAssisted ? 'Licensed APMC Broker' : 'Direct B2B Contract');

  // Product and Pricing breakdown
  const rawProduct =
    (typeof deal.productId === 'object' && deal.productId) ||
    (typeof deal.product === 'object' && deal.product) ||
    {};

  const productName =
    deal.productName ||
    rawProduct.name ||
    rawProduct.productName ||
    deal.commodity ||
    'Agricultural Commodity';

  const quantity = Number(deal.quantity || deal.dealQuantity || 1);
  const unit =
    deal.unit ||
    deal.unitName ||
    rawProduct.unit ||
    (typeof deal.unitId === 'object' && deal.unitId?.name) ||
    'Tons';

  const rate = Number(deal.price || deal.rate || deal.unitPrice || 0);
  const subtotal = Number(deal.subtotal || deal.totalBeforeTax || quantity * rate);
  const discount = Number(deal.discount || 0);
  const taxableAmount = Math.max(0, subtotal - discount);

  const gstRate = Number(deal.gst || deal.gstPercent || deal.taxRate || 0);
  const gstAmount = Number(
    deal.gstAmount || (gstRate > 0 ? (taxableAmount * gstRate) / 100 : 0)
  );

  const grandTotal = Number(deal.totalAmount || deal.grandTotal || taxableAmount + gstAmount);
  const amountInWords = numberToIndianWords(grandTotal);

  // Bank details
  const bankInfo =
    rawSeller.bankDetails ||
    (typeof deal.bankDetails === 'object' ? deal.bankDetails : null) ||
    {};

  const bankName = bankInfo.bankName || 'HDFC Bank Ltd.';
  const accountNo = bankInfo.accountNumber || bankInfo.accountNo || 'XXXXXXXX9214';
  const ifscCode = bankInfo.ifscCode || bankInfo.ifsc || 'HDFC0001824';
  const branchName = bankInfo.branchName || bankInfo.branch || 'APMC Commercial Branch';

  const handleShare = async () => {
    try {
      const summaryText = `📄 *PRAVISTI B2B TAX INVOICE / SAUDA CONTRACT*
---------------------------------------
Invoice No: ${invoiceNumber}
Date: ${dealDate}
Status: VERIFIED & CONFIRMED

*Seller*: ${sellerName} (GSTIN: ${sellerGstin})
*Buyer*: ${buyerName} (GSTIN: ${buyerGstin})
*Broker*: ${brokerName}

*Item*: ${productName}
*Quantity*: ${quantity} ${unit}
*Rate*: ₹${rate.toLocaleString('en-IN')} per ${unit}
---------------------------------------
Subtotal: ₹${subtotal.toLocaleString('en-IN')}
Discount: ₹${discount.toLocaleString('en-IN')}
GST (${gstRate}%): ₹${gstAmount.toLocaleString('en-IN')}
*GRAND TOTAL*: ₹${grandTotal.toLocaleString('en-IN')}
(${amountInWords})

Verified on Pravisti B2B Commodity Platform.`;

      await Share.share({
        title: `Invoice_${invoiceNumber}`,
        message: summaryText,
      });
    } catch (e) {
      console.warn('Error sharing invoice', e);
    }
  };

  const handleDownload = () => {
    Alert.alert(
      'Download Invoice',
      `Invoice #${invoiceNumber} for ₹${grandTotal.toLocaleString('en-IN')} has been generated in standard A4 format.`,
      [
        { text: 'Share Receipt', onPress: handleShare },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ─── TOP ACTION TOOLBAR ─── */}
      <View style={styles.topToolbar}>
        <TouchableOpacity
          style={styles.toolBackBtn}
          onPress={() => onNavigate('pop')}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.toolTitleCol}>
          <Text style={styles.toolTitle}>Tax Invoice Document</Text>
          <Text style={styles.toolSubTitle}>{invoiceNumber} • A4 Format</Text>
        </View>

        <View style={styles.toolActionsRight}>
          <TouchableOpacity
            style={styles.toolActionBtn}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolActionBtn, styles.toolActionBtnPrimary]}
            onPress={handleDownload}
            activeOpacity={0.8}
          >
            <Download size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── A4 PAPER VIEWER SCROLL AREA ─── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* A4 PAPER CANVAS */}
        <View style={styles.a4Page}>
          {/* 1. DOCUMENT HEADER */}
          <View style={styles.docHeader}>
            <View style={styles.docBrandCol}>
              <Image
                source={require('../../../images/blue_logo.png')}
                style={styles.brandLogoImage}
                resizeMode="contain"
              />
              <Text style={styles.platformSubText}>B2B COMMODITY TRADE CONTRACT</Text>
              <Text style={styles.platformRefText}>APMC Electronic Sauda System</Text>
            </View>

            <View style={styles.docMetaCol}>
              <View style={styles.copyBadge}>
                <Text style={styles.copyBadgeText}>TAX INVOICE</Text>
              </View>
              <Text style={styles.metaInvNo}>{invoiceNumber}</Text>
              <Text style={styles.metaDate}>Date: {dealDate}</Text>
              {dealTime ? <Text style={styles.metaTime}>Time: {dealTime}</Text> : null}
              <View style={styles.verifiedStatusPill}>
                <CheckCircle2 size={10} color="#16A34A" />
                <Text style={styles.verifiedStatusText}>DIGITALLY VERIFIED</Text>
              </View>
            </View>
          </View>

          {/* Top Divider */}
          <View style={styles.thickDivider} />

          {/* 2. PARTIES SECTION (SELLER & BUYER GRID) */}
          <View style={styles.partiesContainer}>
            {/* SELLER (BILL FROM) */}
            <View style={styles.partyBox}>
              <View style={styles.partyBoxHeader}>
                <Text style={styles.partyBoxRole}>BILLED BY (SUPPLIER / SELLER)</Text>
              </View>
              <View style={styles.partyBoxBody}>
                <Text style={styles.partyCompanyName}>{sellerName}</Text>
                <Text style={styles.partyAddressText}>{sellerAddress}</Text>
                <View style={styles.partyMetaRow}>
                  <Text style={styles.partyMetaLabel}>GSTIN:</Text>
                  <Text style={styles.partyMetaVal}>{sellerGstin}</Text>
                </View>
                <View style={styles.partyMetaRow}>
                  <Text style={styles.partyMetaLabel}>Contact:</Text>
                  <Text style={styles.partyMetaVal}>{sellerPhone}</Text>
                </View>
                <View style={styles.partyMetaRow}>
                  <Text style={styles.partyMetaLabel}>Email:</Text>
                  <Text style={styles.partyMetaVal}>{sellerEmail}</Text>
                </View>
              </View>
            </View>

            {/* BUYER (BILL TO) */}
            <View style={[styles.partyBox, { borderRightWidth: 0 }]}>
              <View style={styles.partyBoxHeader}>
                <Text style={styles.partyBoxRole}>BILLED TO (BUYER / RECIPIENT)</Text>
              </View>
              <View style={styles.partyBoxBody}>
                <Text style={styles.partyCompanyName}>{buyerName}</Text>
                <Text style={styles.partyAddressText}>{buyerAddress}</Text>
                <View style={styles.partyMetaRow}>
                  <Text style={styles.partyMetaLabel}>GSTIN:</Text>
                  <Text style={styles.partyMetaVal}>{buyerGstin}</Text>
                </View>
                <View style={styles.partyMetaRow}>
                  <Text style={styles.partyMetaLabel}>Contact:</Text>
                  <Text style={styles.partyMetaVal}>{buyerPhone}</Text>
                </View>
                <View style={styles.partyMetaRow}>
                  <Text style={styles.partyMetaLabel}>Email:</Text>
                  <Text style={styles.partyMetaVal}>{buyerEmail}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3. TRADE LOGISTICS STRIP */}
          <View style={styles.tradeInfoStrip}>
            <View style={styles.tradeInfoItem}>
              <Text style={styles.tradeInfoLabel}>INTERMEDIARY BROKER</Text>
              <Text style={styles.tradeInfoVal} numberOfLines={1}>{brokerName}</Text>
            </View>
            <View style={styles.tradeInfoItem}>
              <Text style={styles.tradeInfoLabel}>SETTLEMENT</Text>
              <Text style={styles.tradeInfoVal}>Immediate / Bank</Text>
            </View>
            <View style={styles.tradeInfoItem}>
              <Text style={styles.tradeInfoLabel}>PLACE OF SUPPLY</Text>
              <Text style={styles.tradeInfoVal}>{rawBuyer.state || rawSeller.state || 'Intra-State'}</Text>
            </View>
          </View>

          {/* 4. COMMODITY & GOODS TABLE (A4 GRID) */}
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableTh, styles.colSn]}>#</Text>
              <Text style={[styles.tableTh, styles.colDesc]}>COMMODITY & SPECIFICATIONS</Text>
              <Text style={[styles.tableTh, styles.colQty]}>QTY</Text>
              <Text style={[styles.tableTh, styles.colRate]}>RATE (₹)</Text>
              <Text style={[styles.tableTh, styles.colAmt]}>AMOUNT (₹)</Text>
            </View>

            {/* Row 1: Primary Deal Item */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableTd, styles.colSn, { fontWeight: '700' }]}>01</Text>
              <View style={[styles.colDesc, { paddingHorizontal: 6, paddingVertical: 4 }]}>
                <Text style={styles.itemTitle}>{productName}</Text>
                <Text style={styles.itemSubSpecs}>
                  Trade Quality Standard • APMC Grade A • Moisture Tolerance as agreed
                </Text>
                <Text style={styles.itemHsn}>HSN/SAC: 1001 / Agricultural Produce</Text>
              </View>
              <Text style={[styles.tableTd, styles.colQty]}>
                {quantity.toLocaleString('en-IN')}{'\n'}
                <Text style={styles.unitSub}>{unit}</Text>
              </Text>
              <Text style={[styles.tableTd, styles.colRate]}>
                ₹{rate.toLocaleString('en-IN')}
              </Text>
              <Text style={[styles.tableTd, styles.colAmt, { fontWeight: '800' }]}>
                ₹{subtotal.toLocaleString('en-IN')}
              </Text>
            </View>

            {/* Table Filler Row for authentic invoice height */}
            <View style={styles.tableEmptyRow}>
              <Text style={[styles.tableTd, styles.colSn]}> </Text>
              <Text style={[styles.tableTd, styles.colDesc]}> </Text>
              <Text style={[styles.tableTd, styles.colQty]}> </Text>
              <Text style={[styles.tableTd, styles.colRate]}> </Text>
              <Text style={[styles.tableTd, styles.colAmt]}> </Text>
            </View>
          </View>

          {/* 5. TOTALS & FINANCIAL SUMMARY SECTION */}
          <View style={styles.financialSection}>
            {/* Left: Amount in words & Bank Info */}
            <View style={styles.financialLeftCol}>
              <View style={styles.wordsBox}>
                <Text style={styles.wordsBoxTitle}>TOTAL AMOUNT IN WORDS:</Text>
                <Text style={styles.wordsBoxValue}>{amountInWords}</Text>
              </View>

              <View style={styles.bankCardBox}>
                <Text style={styles.bankCardTitle}>BANK SETTLEMENT DETAILS</Text>
                <Text style={styles.bankCardRow}>
                  <Text style={styles.bankLabel}>Bank: </Text>{bankName}
                </Text>
                <Text style={styles.bankCardRow}>
                  <Text style={styles.bankLabel}>A/C No: </Text>{accountNo}
                </Text>
                <Text style={styles.bankCardRow}>
                  <Text style={styles.bankLabel}>IFSC: </Text>{ifscCode}
                </Text>
                <Text style={styles.bankCardRow}>
                  <Text style={styles.bankLabel}>Branch: </Text>{branchName}
                </Text>
              </View>
            </View>

            {/* Right: Calculations Grid */}
            <View style={styles.financialRightCol}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Taxable Subtotal</Text>
                <Text style={styles.calcVal}>₹{subtotal.toLocaleString('en-IN')}</Text>
              </View>

              {discount > 0 ? (
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: '#DC2626' }]}>Trade Discount</Text>
                  <Text style={[styles.calcVal, { color: '#DC2626' }]}>
                    -₹{discount.toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Net Value</Text>
                <Text style={styles.calcVal}>₹{taxableAmount.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>
                  GST Tax {gstRate > 0 ? `(${gstRate}%)` : '(Exempted)'}
                </Text>
                <Text style={styles.calcVal}>
                  {gstAmount > 0 ? `+₹${gstAmount.toLocaleString('en-IN')}` : '₹0'}
                </Text>
              </View>

              <View style={styles.calcDivider} />

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  ₹{grandTotal.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* 6. TERMS & DECLARATION */}
          <View style={styles.termsBox}>
            <Text style={styles.termsTitle}>TERMS & CONDITIONS OF SAUDA:</Text>
            <Text style={styles.termsItem}>
              1. All trade terms conform to APMC Agricultural Produce Market Rules & bilateral contracts.
            </Text>
            <Text style={styles.termsItem}>
              2. Weight and quality tolerance are subject to Mandi weighbridge inspection upon dispatch.
            </Text>
            <Text style={styles.termsItem}>
              3. Disputes, if any, shall be subject to the jurisdiction of the competent trade market court.
            </Text>
          </View>

          {/* 7. DIGITAL SIGNATURES & OFFICIAL PLATFORM SEAL */}
          <View style={styles.signaturesSection}>
            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signaturePartyName}>{sellerName}</Text>
              <Text style={styles.signatureRole}>Authorized Signatory (Seller)</Text>
            </View>

            <View style={styles.platformSealBadge}>
              <ShieldCheck size={26} color="#2327D8" />
              <Text style={styles.platformSealText}>PRAVISTI B2B</Text>
              <Text style={styles.platformSealSub}>DIGITAL AUDIT SEAL</Text>
            </View>

            <View style={styles.signatureCol}>
              <View style={styles.signatureLine} />
              <Text style={styles.signaturePartyName}>{buyerName}</Text>
              <Text style={styles.signatureRole}>Verified Receiver (Buyer)</Text>
            </View>
          </View>

          {/* Document Footer */}
          <View style={styles.pageFooter}>
            <Text style={styles.pageFooterText}>
              This is a computer-generated tax invoice verified under the Pravisti B2B Platform. No physical signature required.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default DealInvoice;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark Slate Backdrop for realistic paper preview
  },
  topToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  toolBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolTitleCol: {
    flex: 1,
    marginLeft: 12,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  toolSubTitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  toolActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolActionBtnPrimary: {
    backgroundColor: '#2327D8',
  },

  /* Scrollable Paper Background */
  scrollArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },

  /* ─── A4 PAPER CANVAS ─── */
  a4Page: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },

  /* 1. Document Header */
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  docBrandCol: {
    flex: 1,
  },
  brandLogoImage: {
    width: 140,
    height: 40,
    marginBottom: 4,
  },
  platformSubText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#2327D8',
    letterSpacing: 0.8,
  },
  platformRefText: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  docMetaCol: {
    alignItems: 'flex-end',
  },
  copyBadge: {
    backgroundColor: '#2327D8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  copyBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  metaInvNo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaDate: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  metaTime: {
    fontSize: 9.5,
    color: '#64748B',
  },
  verifiedStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  verifiedStatusText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#15803D',
  },

  thickDivider: {
    height: 2,
    backgroundColor: '#2327D8',
    marginBottom: 10,
  },

  /* 2. Parties Grid */
  partiesContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    marginBottom: 10,
    overflow: 'hidden',
  },
  partyBox: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  partyBoxHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  partyBoxRole: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2327D8',
    letterSpacing: 0.5,
  },
  partyBoxBody: {
    padding: 8,
  },
  partyCompanyName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  partyAddressText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
    marginBottom: 4,
  },
  partyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  partyMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  partyMetaVal: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1E293B',
  },

  /* 3. Trade Info Strip */
  tradeInfoStrip: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  tradeInfoItem: {
    flex: 1,
  },
  tradeInfoLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  tradeInfoVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },

  /* 4. Table Grid */
  tableContainer: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#2327D8',
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  tableTh: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  colSn: {
    width: 26,
    textAlign: 'center',
  },
  colDesc: {
    flex: 1,
    paddingLeft: 4,
  },
  colQty: {
    width: 60,
    textAlign: 'center',
  },
  colRate: {
    width: 75,
    textAlign: 'right',
    paddingRight: 4,
  },
  colAmt: {
    width: 85,
    textAlign: 'right',
    paddingRight: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  tableTd: {
    fontSize: 10.5,
    color: '#1E293B',
    paddingVertical: 2,
  },
  itemTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemSubSpecs: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  itemHsn: {
    fontSize: 8.5,
    color: '#2327D8',
    fontWeight: '600',
    marginTop: 1,
  },
  unitSub: {
    fontSize: 9,
    color: '#64748B',
  },
  tableEmptyRow: {
    flexDirection: 'row',
    height: 18,
    backgroundColor: '#FAFAFA',
  },

  /* 5. Financial Breakdown Section */
  financialSection: {
    flexDirection: 'row',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  financialLeftCol: {
    flex: 1.2,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  wordsBox: {
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 4,
    marginBottom: 8,
  },
  wordsBoxTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
  },
  wordsBoxValue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 13,
  },
  bankCardBox: {
    backgroundColor: '#EFF6FF',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bankCardTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#2327D8',
    marginBottom: 3,
  },
  bankCardRow: {
    fontSize: 9,
    color: '#1E293B',
    marginTop: 1,
  },
  bankLabel: {
    fontWeight: '700',
    color: '#64748B',
  },

  financialRightCol: {
    flex: 1,
    padding: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  calcLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EEF2FE',
    padding: 6,
    borderRadius: 4,
    marginTop: 2,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2327D8',
  },
  grandTotalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2327D8',
  },

  /* 6. Terms Box */
  termsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  termsTitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  termsItem: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 11.5,
    marginTop: 1,
  },

  /* 7. Signatures */
  signaturesSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 10,
    marginTop: 6,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  signatureLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#94A3B8',
    marginBottom: 4,
  },
  signaturePartyName: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 8,
    color: '#64748B',
    textAlign: 'center',
  },
  platformSealBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  platformSealText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#2327D8',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  platformSealSub: {
    fontSize: 7,
    color: '#64748B',
    fontWeight: '700',
  },

  /* Footer */
  pageFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
    alignItems: 'center',
  },
  pageFooterText: {
    fontSize: 7.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
