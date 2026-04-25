import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const Footer = ({ onNavigate, activeScreen = 'Dashboard' }) => {
  const tabs = [
    { screen: 'Dashboard', icon: '📊', label: 'Home' },
    { screen: 'DealsList', icon: '💎', label: 'Saudas' },
    { screen: 'AddCompany', icon: '+', label: '', isCenter: true },
    { screen: 'ChatList', icon: '💬', label: 'Chat' },
    { screen: 'Profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab, index) => {
        if (tab.isCenter) {
          return (
            <TouchableOpacity
              key={index}
              style={styles.centerTabItem}
              onPress={() => onNavigate(tab.screen)}
              activeOpacity={0.9}
            >
              <View style={styles.centerButton}>
                <Text style={styles.centerButtonIcon}>{tab.icon}</Text>
              </View>
            </TouchableOpacity>
          );
        }

        const isActive = activeScreen === tab.screen;
        return (
          <TouchableOpacity
            key={index}
            style={styles.tabItem}
            onPress={() => onNavigate(tab.screen)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
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

export default Footer;
