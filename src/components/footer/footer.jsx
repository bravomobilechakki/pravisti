import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Handshake, Plus, MessageSquare, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Footer = ({ onNavigate, activeScreen = 'Dashboard', isBroker = false }) => {
  const insets = useSafeAreaInsets();
  const [cachedRole, setCachedRole] = React.useState(null);

  React.useEffect(() => {
    const checkRole = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        if (role) setCachedRole(role);
      } catch (e) { }
    };
    checkRole();
  }, [activeScreen]);

  const isBrokerRole = isBroker || cachedRole === 'Broker' || String(activeScreen || '').startsWith('Broker');

  const tabs = [
    {
      screen: isBrokerRole ? 'BrokerDashboard' : 'Dashboard',
      Icon: LayoutDashboard,
      label: 'Home',
      activeScreens: ['Dashboard', 'BrokerDashboard'],
      color: '#3465EA', // Royal Blue
      activeBg: 'rgba(52, 101, 234, 0.12)',
    },
    {
      screen: isBrokerRole ? 'BrokerCreatedDeals' : 'DealsList',
      Icon: Handshake,
      label: 'Saudas',
      activeScreens: ['DealsList', 'BrokerDealsList', 'BrokerCreatedDeals'],
      color: '#10B981', // Emerald Green
      activeBg: 'rgba(16, 185, 129, 0.12)',
    },
    {
      screen: isBrokerRole ? 'BrokerAddCompany' : 'AddCompany',
      Icon: Plus,
      label: 'Create',
      isCenter: true,
      color: '#3465EA',
    },
    {
      screen: 'ChatList',
      Icon: MessageSquare,
      label: 'Chat',
      activeScreens: ['ChatList', 'DealChat'],
      color: '#8B5CF6', // Indigo Violet
      activeBg: 'rgba(139, 92, 246, 0.12)',
    },
    {
      screen: isBrokerRole ? 'Profile' : 'Profile',
      Icon: User,
      label: 'Profile',
      activeScreens: ['Profile', 'BrokerProfile'],
      color: '#F59E0B', // Amber Gold
      activeBg: 'rgba(245, 158, 11, 0.12)',
    },
  ];

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.tabBarContainer}>
        {tabs.map((tab, index) => {
          if (tab.isCenter) {
            const Icon = tab.Icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.centerTabWrapper}
                onPress={() => onNavigate(tab.screen)}
                activeOpacity={0.88}
              >
                <View style={styles.centerButtonOuterRing}>
                  <View style={[styles.centerButtonInner, { backgroundColor: tab.color }]}>
                    <Icon size={24} color="#FFFFFF" strokeWidth={2.6} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }

          const isActive = tab.activeScreens
            ? tab.activeScreens.includes(activeScreen)
            : activeScreen === tab.screen;
          const Icon = tab.Icon;
          const iconColor = tab.color;

          return (
            <TouchableOpacity
              key={index}
              style={styles.tabItem}
              onPress={() => onNavigate(tab.screen)}
              activeOpacity={0.75}
            >
              <View style={[
                styles.iconContainer,
                isActive && { backgroundColor: tab.activeBg }
              ]}>
                <Icon
                  size={20}
                  color={iconColor}
                  strokeWidth={isActive ? 2.4 : 2.0}
                />
              </View>
              <Text style={[
                styles.tabLabel,
                { color: isActive ? tab.color : '#64748B' },
                isActive && { fontWeight: '800' }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  centerTabWrapper: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonOuterRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#3465EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    padding: 3,
  },
  centerButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  iconContainer: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 14,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});

export default Footer;
