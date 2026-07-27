import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Sprout, Sun, Plus, ArrowRight } from 'lucide-react-native';

const MyCompanies = ({ onNavigate }) => {

  const registeredCompanies = [
    {
      id: 1,
      name: 'Mahansh Traders Pvt Ltd',
      gst: '27AABCU9603R1ZM',
      contact: 'Rajesh Mahansh',
      status: 'Active',
      deals: 12,
      iconType: 'grain',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 2,
      name: 'Sunrise Agro Exports',
      gst: '24AADCS7856R1ZP',
      contact: 'Vikram Patel',
      status: 'Active',
      deals: 8,
      iconType: 'sun',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Companies</Text>
        <TouchableOpacity
          style={styles.addBtnTop}
          onPress={() => onNavigate('AddCompany')}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {registeredCompanies.map(company => (
          <View key={company.id} style={styles.card}>

            {/* 🔷 TOP */}
            <View style={styles.topRow}>
              <View style={[styles.iconCircle, { backgroundColor: company.bgColor }]}>
                {company.iconType === 'grain' ? (
                  <Sprout size={22} color={company.color} />
                ) : (
                  <Sun size={22} color={company.color} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.gst}>GST: {company.gst}</Text>
              </View>

              <View style={[styles.statusPill, { backgroundColor: company.bgColor }]}>
                <View style={[styles.dot, { backgroundColor: company.color }]} />
                <Text style={[styles.statusText, { color: company.color }]}>
                  {company.status}
                </Text>
              </View>
            </View>

            {/* 📊 STATS */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{company.deals}</Text>
                <Text style={styles.statLabel}>Saudas</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>₹12K</Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>Active</Text>
                <Text style={styles.statLabel}>Status</Text>
              </View>
            </View>

            {/* 💎 RECENT SAUDA */}
            <View style={styles.saudaBox}>
              <Text style={styles.saudaTitle}>Recent Sauda</Text>

              <View style={styles.saudaItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sprout size={14} color="#10B981" />
                  <Text style={styles.saudaProduct}>Wheat</Text>
                </View>
                <Text style={styles.saudaMeta}>100kg • ₹2500</Text>
              </View>

              <TouchableOpacity 
                onPress={() => onNavigate('DealsList', { company })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
              >
                <Text style={styles.viewAll}>View All</Text>
                <ArrowRight size={12} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {/* ⚡ ACTIONS */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => onNavigate('CreateDeal', { company })}
              >
                <Text style={styles.createText}>+ Create Sauda</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => onNavigate('CompanyDetails', { company })}
              >
                <Text style={styles.detailsText}>Details</Text>
              </TouchableOpacity>
            </View>

          </View>
        ))}

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
    padding: 16,
    backgroundColor: '#fff',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  addBtnTop: {
    backgroundColor: '#3B82F6',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  companyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  gst: {
    fontSize: 11,
    color: '#64748B',
  },

  statusPill: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: 'center',
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  statBox: {
    alignItems: 'center',
  },

  statNumber: {
    fontWeight: '800',
    fontSize: 14,
  },

  statLabel: {
    fontSize: 10,
    color: '#64748B',
  },

  saudaBox: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },

  saudaTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },

  saudaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  saudaProduct: {
    fontWeight: '700',
  },

  saudaMeta: {
    fontSize: 12,
    color: '#64748B',
  },

  viewAll: {
    marginTop: 6,
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },

  createBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  createText: {
    color: '#fff',
    fontWeight: '800',
  },

  detailsBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  detailsText: {
    fontWeight: '700',
  },

});