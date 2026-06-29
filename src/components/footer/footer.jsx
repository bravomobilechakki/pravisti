import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Handshake, Plus, MessageSquare, User } from 'lucide-react-native';

const Footer = ({ onNavigate, activeScreen = 'Dashboard' }) => {
  const insets = useSafeAreaInsets();
  const tabs = [
    { screen: 'Dashboard', Icon: LayoutDashboard, label: 'Home' },
    { screen: 'DealsList', Icon: Handshake, label: 'Saudas' },
    { screen: 'AddCompany', Icon: Plus, label: '', isCenter: true },
    { screen: 'ChatList', Icon: MessageSquare, label: 'Chat' },
    { screen: 'Profile', Icon: User, label: 'Profile' },
  ];

  return (
    <View style={[styles.tabBar, { paddingBottom: 20 + insets.bottom, height: 80 + insets.bottom }]}>
      {tabs.map((tab, index) => {
        if (tab.isCenter) {
          const Icon = tab.Icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.centerTabItem}
              onPress={() => onNavigate(tab.screen)}
              activeOpacity={0.9}
            >
              <View style={styles.centerButton}>
                <Icon size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          );
        }

        const isActive = activeScreen === tab.screen;
        const Icon = tab.Icon;
        return (
          <TouchableOpacity
            key={index}
            style={styles.tabItem}
            onPress={() => onNavigate(tab.screen)}
            activeOpacity={0.7}
          >
            <Icon size={20} color={isActive ? '#4F46E5' : '#9CA3AF'} />
            <Text style={isActive ? styles.tabLabelActive : styles.tabLabel}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
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
  tabLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  tabLabelActive: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
});

export default Footer;
