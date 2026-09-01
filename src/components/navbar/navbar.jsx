import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Bell, User, Mic } from 'lucide-react-native';

import { fontSize, moderateScale, scale } from '../../utils/responsive';
import VoiceService from '../../modules/voice/VoiceService';

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

      {/* Right: Voice Mic, Notifications & Profile Icon */}
      <View style={styles.actionsRow}>
        {/* Voice Assistant Mic Button */}
        <TouchableOpacity
          style={styles.voiceIconBtn}
          onPress={() => VoiceService.emit('open-voice-modal')}
          activeOpacity={0.75}
        >
          <Mic size={19} color="#0B2265" />
          <View style={styles.voiceDot} />
        </TouchableOpacity>

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
    paddingHorizontal: scale(16),
    paddingVertical: moderateScale(10),
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
    width: moderateScale(110),
    height: moderateScale(36),
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  voiceIconBtn: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  voiceDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#F59E0B',
  },
  iconBtn: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
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
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  avatarText: {
    fontSize: fontSize(15),
    fontWeight: '700',
    color: '#4F46E5',
  },
});

export default Navbar;
