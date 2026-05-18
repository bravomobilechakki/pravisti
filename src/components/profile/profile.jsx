import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const Profile = ({ onNavigate }) => {
  const user = {
    name: 'Rahul Sharma',
    role: 'Broker',
    mobile: '+91 98765 43210',
    email: 'rahul.sharma@email.com',
    company: 'Mahansh Traders',
    gstin: '27AABCU9603R1ZM',
    address: '42, Trade Center, Andheri East, Mumbai - 400069',
  };

  const menuItems = [
    {
      icon: '🏢',
      label: 'My Companies',
      subtitle: 'Manage registered companies',
    },
    { icon: '🤝', label: 'My Deals', subtitle: 'View all sauda deals' },
    { icon: '👥', label: 'Contacts', subtitle: 'Saved parties & brokers' },
    { icon: '📊', label: 'Reports', subtitle: 'Commission & analytics' },
    { icon: '🔔', label: 'Notifications', subtitle: 'Manage alerts' },
    { icon: '🔒', label: 'Privacy & Security', subtitle: 'Account settings' },
    { icon: '❓', label: 'Help & Support', subtitle: 'FAQs & contact us' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('Dashboard')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user.role}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userCompany}>{user.company}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Deals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₹1.2Cr</Text>
              <Text style={styles.statLabel}>Volume</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📱</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Mobile</Text>
              <Text style={styles.infoValue}>{user.mobile}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>✉️</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🧾</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>GSTIN</Text>
              <Text style={styles.infoValue}>{user.gstin}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📍</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user.address}</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                if (item.label === 'My Companies') {
                  onNavigate('MyCompanies');
                } else if (item.label === 'My Deals') {
                  onNavigate('DealsList');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={async () => {
            try {
              const { logoutUser } = require('../../services/api');
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const token = await AsyncStorage.getItem('userToken');
              if (token) {
                await logoutUser(token);
                await AsyncStorage.removeItem('userToken');
              }
            } catch(e) {
              console.log("Error logging out", e);
            }
            onNavigate('Login');
          }}
        >
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Pravisti v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#0F172A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3170CD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3170cdff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  userCompany: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3170cdff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  menuArrow: {
    fontSize: 22,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 10,
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 16,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingBottom: 25,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 85,
  },
  centerTabItem: {
    top: -25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3170cdff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#3170cdff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  centerButtonIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  tabItem: {
    alignItems: 'center',
    gap: 4,
  },
  tabIcon: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tabLabelActive: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: 'bold',
  },
});

export default Profile;
