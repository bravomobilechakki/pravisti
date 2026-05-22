import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

const ChatList = ({ onNavigate }) => {
  const activeDeals = [
    {
      id: 1,
      title: 'Basmati Rice (Grade A)',
      party: 'Mahansh Traders',
      icon: '🌾',
      lastMessage: 'Can you confirm the delivery date?',
      time: '2:30 PM',
      unread: 3,
      status: 'CONFIRMED',
      statusColor: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 2,
      title: 'Yellow Maize (Feed)',
      party: 'Sunrise Agro Exports',
      icon: '🌽',
      lastMessage: 'Rate is finalized at ₹2,150/quintal',
      time: '1:15 PM',
      unread: 0,
      status: 'PENDING',
      statusColor: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      id: 3,
      title: 'Chana Dal (Premium)',
      party: 'Bharat Commodities',
      icon: '🫘',
      lastMessage: 'Quality check report attached',
      time: '11:45 AM',
      unread: 1,
      status: 'CONFIRMED',
      statusColor: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 4,
      title: 'Wheat (Sharbati)',
      party: 'Goyal Grains',
      icon: '🚜',
      lastMessage: 'Payment received. Thanks!',
      time: 'Yesterday',
      unread: 0,
      status: 'COMPLETED',
      statusColor: '#6366F1',
      bgColor: '#EEF2FF',
    },
    {
      id: 5,
      title: 'Soybean (Organic)',
      party: 'Patel Oil Mills',
      icon: '🫛',
      lastMessage: 'Need 50 more tons, can you arrange?',
      time: 'Yesterday',
      unread: 2,
      status: 'PENDING',
      statusColor: '#F59E0B',
      bgColor: '#FFFBEB',
    },
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
        <Text style={styles.headerTitle}>Deal Chats</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={[styles.filterTab, styles.filterTabActive]}>
          <Text style={[styles.filterText, styles.filterTextActive]}>
            All (5)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterText}>Unread (3)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterTab}>
          <Text style={styles.filterText}>Active (4)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeDeals.map(deal => (
          <TouchableOpacity
            key={deal.id}
            style={styles.chatCard}
            onPress={() => onNavigate('DealChat', { deal })}
            activeOpacity={0.7}
          >
            <View style={styles.chatIconContainer}>
              <Text style={styles.chatIcon}>{deal.icon}</Text>
            </View>

            <View style={styles.chatInfo}>
              <View style={styles.chatTopRow}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {deal.title}
                </Text>
                <Text style={styles.chatTime}>{deal.time}</Text>
              </View>
              <Text style={styles.chatParty}>{deal.party}</Text>
              <Text
                style={[
                  styles.chatLastMsg,
                  deal.unread > 0 && styles.chatLastMsgUnread,
                ]}
                numberOfLines={1}
              >
                {deal.lastMessage}
              </Text>
            </View>

            <View style={styles.chatRight}>
              {deal.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{deal.unread}</Text>
                </View>
              )}
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: deal.statusColor },
                ]}
              />
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            Select a deal to start chatting with the party
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backIcon: {
    fontSize: 24,
    color: '#111827',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: '#4F46E5',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatIcon: {
    fontSize: 24,
  },
  chatInfo: {
    flex: 1,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  chatParty: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
    marginBottom: 4,
  },
  chatLastMsg: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '400',
  },
  chatLastMsgUnread: {
    color: '#475569',
    fontWeight: '600',
  },
  chatRight: {
    alignItems: 'center',
    marginLeft: 8,
    gap: 8,
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomHint: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  hintText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
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
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4F46E5',
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
  tabIconActive: {
    fontSize: 20,
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

export default ChatList;
