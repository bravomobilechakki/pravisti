import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Bell, User } from 'lucide-react-native';

const Navbar = ({ onNavigate, user }) => {
  return (
    <View style={styles.header}>
      {/* Left: Brand Logo */}
      <View style={styles.brandRow}>
        <Image
          source={require('../../images/trader1.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Right: Notifications & Profile Icon */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => onNavigate && onNavigate('ChatList')}
        >
          <Bell size={20} color="#475569" />
          <View style={styles.badgeDot} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={() => onNavigate && onNavigate('Profile')}
        >
          {user?.name ? (
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <User size={18} color="#4F46E5" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 110,
    height: 36,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4F46E5',
  },
});

export default Navbar;
