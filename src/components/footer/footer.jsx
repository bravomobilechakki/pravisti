import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Building2, Plus, Bell, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fontSize, moderateScale, scale, isTablet } from '../../utils/responsive';

const Footer = ({ onNavigate, activeScreen = 'Dashboard', isBroker = false }) => {
  const insets = useSafeAreaInsets();
  const [cachedRole, setCachedRole] = React.useState(null);
  const [unreadNotifCount, setUnreadNotifCount] = React.useState(0);

  React.useEffect(() => {
    const checkRole = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        if (role) setCachedRole(role);
      } catch (e) { }
    };
    const fetchUnread = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const { getPendingInvitations } = require('../../services/api');
          const res = await getPendingInvitations(token);
          if (res && res.success && Array.isArray(res.data)) {
            setUnreadNotifCount(res.data.length);
          }
        }
      } catch (e) { }
    };
    checkRole();
    fetchUnread();
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
      screen: 'MyCompanies',
      Icon: Building2,
      label: 'Companies',
      activeScreens: ['MyCompanies', 'CompanyDetails', 'BrokerCompanyDetails'],
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
      screen: 'Notifications',
      Icon: Bell,
      label: 'Notifications',
      activeScreens: ['Notifications', 'ChatList', 'DealChat'],
      color: '#8B5CF6', // Indigo Violet
      activeBg: 'rgba(139, 92, 246, 0.12)',
      badge: unreadNotifCount > 0 ? unreadNotifCount : null,
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
    <View style={[styles.tabBarWrapper, { paddingBottom: Math.max(insets.bottom, scale(6)) }]}>
      <View style={[styles.tabBarContainer, isTablet && styles.tabBarContainerTablet]}>
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
                    <Icon size={isTablet ? 28 : 24} color="#FFFFFF" strokeWidth={2.6} />
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
                  size={isTablet ? 24 : 20}
                  color={iconColor}
                  strokeWidth={isActive ? 2.4 : 2.0}
                />
                {tab.badge ? (
                  <View style={styles.footerBadgePill}>
                    <Text style={styles.footerBadgeText}>
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Text>
                  </View>
                ) : null}
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
    bottom: Platform.OS === 'ios' ? 12 : 10,
    left: 12,
    right: 12,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  tabBarContainer: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#EFF6FF', // Light bluish royal pastel shade
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 16,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  tabBarContainerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  centerTabWrapper: {
    top: -22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonOuterRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 14,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    borderWidth: 3.5,
    borderColor: '#EFF6FF',
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
    paddingVertical: 4,
    position: 'relative',
  },
  iconContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBadgePill: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  footerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
});

export default Footer;
