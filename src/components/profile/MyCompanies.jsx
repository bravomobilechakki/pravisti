import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';

const MyCompanies = ({ onNavigate }) => {

  const companies = [
    {
      id: 1,
      name: 'Mahansh Traders Pvt Ltd',
      gst: '27AABCU9603R1ZM',
      contact: 'Rajesh Mahansh',
      deals: 12,
      icon: '🌾',
      color: '#22C55E',
    },
    {
      id: 2,
      name: 'Sunrise Agro Exports',
      gst: '24AADCS7856R1ZP',
      contact: 'Vikram Patel',
      deals: 8,
      icon: '☀️',
      color: '#F59E0B',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 🔷 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('pop')}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>My Companies</Text>
          <Text style={styles.subtitle}>{companies.length} Businesses</Text>
        </View>

        <TouchableOpacity onPress={() => onNavigate('AddCompany')}>
          <Text style={styles.add}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* 📊 Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{companies.length}</Text>
            <Text style={styles.statText}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#22C55E' }]}>3</Text>
            <Text style={styles.statText}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#3B82F6' }]}>25</Text>
            <Text style={styles.statText}>Deals</Text>
          </View>
        </View>

        {/* 🏢 Company Cards */}
        {companies.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => onNavigate('CompanyDetails', { item })}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.company}>{item.name}</Text>
              <Text style={styles.gst}>GST: {item.gst}</Text>

              <View style={styles.row}>
                <Text style={styles.meta}>👤 {item.contact}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.meta}>🤝 {item.deals}</Text>
              </View>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* ➕ CTA */}
        <TouchableOpacity
          style={styles.cta}
          onPress={() => onNavigate('AddCompany')}
        >
          <Text style={styles.ctaText}>+ Add New Company</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default MyCompanies;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  back: {
    fontSize: 26,
    color: '#0F172A',
  },

  title: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },

  subtitle: {
    color: '#64748B',
    fontSize: 12,
  },

  add: {
    fontSize: 26,
    color: '#3B82F6',
  },

  content: {
    padding: 16,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statCard: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  statNumber: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },

  statText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },

  icon: {
    fontSize: 24,
  },

  company: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },

  gst: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },

  row: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },

  meta: {
    color: '#475569',
    fontSize: 12,
  },

  dot: {
    color: '#CBD5E1',
    marginHorizontal: 6,
  },

  arrow: {
    color: '#94A3B8',
    fontSize: 22,
  },

  cta: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },

  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});