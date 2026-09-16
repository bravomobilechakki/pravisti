import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import {
  Mail,
  Phone,
  Building2,
  Briefcase,
  Camera,
  LogOut,
  Edit2,
  X,
  ArrowLeft,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { getUserProfile, updateUserProfile, resolveImageUrl } from '../../services/api';
import uploadService from '../../services/uploadService';

const PRIMARY_BLUE = '#2563EB';

export const StaffProfile = ({
  currentUser: initialUser,
  onNavigate,
  routeData,
  onProfileUpdated,
  onBack,
}) => {
  const [user, setUser] = useState(initialUser || routeData?.user || null);
  const [loading, setLoading] = useState(!initialUser && !routeData?.user);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');

  // Fetch latest staff profile if needed
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const cachedStr = await AsyncStorage.getItem('userInfo');
        if (cachedStr && isMounted) {
          try {
            const parsed = JSON.parse(cachedStr);
            setUser((prev) => ({ ...prev, ...parsed }));
          } catch (e) {}
        }

        if (token) {
          const res = await getUserProfile(token);
          if (res && res.success && res.data && isMounted) {
            setUser((prev) => ({ ...prev, ...res.data }));
            await AsyncStorage.setItem('userInfo', JSON.stringify(res.data));
          }
        }
      } catch (err) {
        console.warn('Profile load notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync edit form fields
  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setEditPhone(user.mobileNumber || user.phone || '');
      setEditDesignation(user.designation || 'Staff Member');
      setProfileImageUri(user.profilePicture || user.avatar || user.image || '');
    }
  }, [user]);

  // Initials
  const userInitials = useMemo(() => {
    const name = (user?.name || 'Staff Member').trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'ST').toUpperCase();
  }, [user?.name]);

  // Employee ID
  const staffEmployeeId = useMemo(() => {
    if (user?.employeeId) return user.employeeId;
    if (user?._id) return `EMP-${String(user._id).slice(-5).toUpperCase()}`;
    return 'EMP-84920';
  }, [user?._id, user?.employeeId]);

  // Photo picker
  const handlePickAvatar = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingImage(true);

      const uploadRes = await uploadService.upload(asset);
      const uploadedUrl = uploadRes?.url || uploadRes?.secure_url || asset.uri;

      setProfileImageUri(uploadedUrl);
      const updated = { ...user, profilePicture: uploadedUrl };
      setUser(updated);
      await AsyncStorage.setItem('userInfo', JSON.stringify(updated));

      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        await updateUserProfile({ profilePicture: uploadedUrl }, token);
      }
      if (onProfileUpdated) onProfileUpdated(updated);
    } catch (err) {
      console.warn('Avatar upload error:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save edits
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Validation', 'Please enter your name.');
      return;
    }

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const updatedFields = {
        name: editName.trim(),
        email: editEmail.trim(),
        mobileNumber: editPhone.trim(),
        designation: editDesignation.trim(),
        profilePicture: profileImageUri,
      };

      const merged = { ...user, ...updatedFields };
      setUser(merged);
      await AsyncStorage.setItem('userInfo', JSON.stringify(merged));

      if (token) {
        try {
          await updateUserProfile(updatedFields, token);
        } catch (apiErr) {
          console.warn('Profile update notice:', apiErr);
        }
      }

      if (onProfileUpdated) onProfileUpdated(merged);
      setIsEditModalVisible(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userRole');
          } catch (e) {}
          if (onNavigate) {
            onNavigate('Login', {}, { replace: true });
          }
        },
      },
    ]);
  };

  const avatarUrl = profileImageUri ? resolveImageUrl(profileImageUri) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sober Header */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.editIconBtn}
          onPress={() => setIsEditModalVisible(true)}
          activeOpacity={0.7}
        >
          <Edit2 size={18} color={PRIMARY_BLUE} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={PRIMARY_BLUE} />
          </View>
        ) : (
          <>
            {/* User Avatar & Name Section */}
            <View style={styles.profileHeaderCard}>
              <View style={styles.avatarBox}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{userInitials}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cameraBtn}
                  onPress={handlePickAvatar}
                  disabled={isUploadingImage}
                  activeOpacity={0.8}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Camera size={13} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.userName}>{user?.name || 'Staff Member'}</Text>
              <Text style={styles.userRole}>
                {user?.designation || user?.department || 'Production Staff'}
              </Text>

              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>ID: {staffEmployeeId}</Text>
              </View>
            </View>

            {/* Clean Single Details Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Phone size={16} color="#64748B" style={{ marginRight: 12 }} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Mobile</Text>
                  <Text style={styles.infoValue}>
                    {user?.mobileNumber || user?.phone ? `+91 ${user.mobileNumber || user.phone}` : 'Not provided'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Mail size={16} color="#64748B" style={{ marginRight: 12 }} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{user?.email || 'staff@pravisti.com'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Building2 size={16} color="#64748B" style={{ marginRight: 12 }} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Company</Text>
                  <Text style={styles.infoValue}>
                    {user?.company || user?.firmName || 'Pravisti Commodities'}
                  </Text>
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Briefcase size={16} color="#64748B" style={{ marginRight: 12 }} />
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>
                    {user?.department || 'Operations & Production'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Simple Edit Button */}
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => setIsEditModalVisible(true)}
              activeOpacity={0.8}
            >
              <Edit2 size={15} color={PRIMARY_BLUE} style={{ marginRight: 6 }} />
              <Text style={styles.editProfileBtnText}>Edit Profile Details</Text>
            </TouchableOpacity>

            {/* Simple Clean Sign Out Button */}
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <LogOut size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </>
        )}
      </ScrollView>

      {/* Simple Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalInputs} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Designation</Text>
              <TextInput
                style={styles.textInput}
                value={editDesignation}
                onChangeText={setEditDesignation}
                placeholder="Designation"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Mobile</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnSave}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 50,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  editIconBtn: {
    padding: 6,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  avatarBox: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 10,
  },
  editProfileBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_BLUE,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    maxHeight: '80%',
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalInputs: {
    maxHeight: 280,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  btnSave: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default StaffProfile;
