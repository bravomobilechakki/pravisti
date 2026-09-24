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
  Menu,
  Bell,
  User,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Smartphone,
  Phone,
  PhoneCall,
  Mail,
  Calendar,
  MapPin,
  Building2,
  Settings,
  Lock,
  Globe,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  Edit2,
  Camera,
  Home,
  Folder,
  Package,
  X,
  ArrowLeft,
  Check,
} from 'lucide-react-native';
import Svg, { Rect, Line, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  getStaffProfile,
  changeStaffPassword,
  updateUserProfile,
  resolveImageUrl,
  getUserNotifications,
  getStaffDashboardStats,
  getCompanyDetails,
  getMyAssignedTasks,
} from '../../services/api';
import uploadService from '../../services/uploadService';

const BRAND_BLUE = '#0066FF';
const ACCENT_NAVY = '#0F172A';

export const StaffProfile = ({
  currentUser: initialUser,
  activeCompany: initialCompany,
  tasksCount: propTasksCount,
  projectsCount: propProjectsCount,
  demandsCount: propDemandsCount,
  stats: propStats,
  onNavigate,
  routeData,
  onProfileUpdated,
  onBack,
  onTabChange,
  onOpenDrawer,
  onOpenNotifications,
  hideBottomBar = false,
}) => {
  const [user, setUser] = useState(initialUser || routeData?.user || null);
  const [activeCompany, setActiveCompany] = useState(initialCompany || routeData?.company || null);
  const [dashboardStats, setDashboardStats] = useState(propStats || null);
  const [tasksCount, setTasksCount] = useState(propTasksCount ?? 0);
  const [projectsCount, setProjectsCount] = useState(propProjectsCount ?? 0);
  const [demandsCount, setDemandsCount] = useState(propDemandsCount ?? 0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const [loading, setLoading] = useState(!initialUser && !routeData?.user);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmergency, setEditEmergency] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch latest staff profile & stats if needed
  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const cachedStr = await AsyncStorage.getItem('userInfo');
        const storedCompanyId = await AsyncStorage.getItem('selectedCompanyId');

        if (cachedStr && isMounted) {
          try {
            const parsed = JSON.parse(cachedStr);
            setUser((prev) => ({ ...prev, ...parsed }));
          } catch (e) { }
        }

        if (token) {
          const [staffRes, notifRes, statsRes, myTasksRes] = await Promise.allSettled([
            getStaffProfile(token),
            getUserNotifications(token),
            getStaffDashboardStats(token),
            getMyAssignedTasks(null, token),
          ]);

          let resolvedStaff = null;
          if (staffRes.status === 'fulfilled' && staffRes.value?.success && staffRes.value.data && isMounted) {
            resolvedStaff = staffRes.value.data;
            setUser((prev) => ({ ...prev, ...resolvedStaff }));
            await AsyncStorage.setItem('userInfo', JSON.stringify(resolvedStaff));
          }

          // Resolve Company using companyId from staff profile
          const targetCompId =
            resolvedStaff?.companyId?._id ||
            resolvedStaff?.companyId ||
            resolvedStaff?.company?._id ||
            resolvedStaff?.company ||
            user?.companyId?._id ||
            user?.companyId ||
            storedCompanyId;

          if (targetCompId && typeof targetCompId === 'string' && isMounted) {
            try {
              const compDetailsRes = await getCompanyDetails(targetCompId);
              if (compDetailsRes?.success && compDetailsRes.data && isMounted) {
                setActiveCompany(compDetailsRes.data);
              }
            } catch (err) {
              console.warn('Notice fetching company details in StaffProfile:', err);
            }
          } else if (typeof resolvedStaff?.companyId === 'object' && resolvedStaff?.companyId?.name && isMounted) {
            setActiveCompany(resolvedStaff.companyId);
          }

          if (notifRes.status === 'fulfilled' && notifRes.value?.success && isMounted) {
            const list = notifRes.value.data?.notifications || notifRes.value.data || [];
            const unread = Array.isArray(list) ? list.filter((n) => !n.read && !n.isRead).length : 0;
            setUnreadNotifsCount(unread);
          }

          if (statsRes.status === 'fulfilled' && statsRes.value?.success && statsRes.value.data && isMounted) {
            const sData = statsRes.value.data;
            setDashboardStats(sData);
            if (sData.taskStats) {
              const assigned = sData.taskStats.totalAssigned ?? sData.taskStats.totalTasks ?? 0;
              setTasksCount(assigned);
            }
            if (sData.assignedProjectsCount !== undefined) {
              setProjectsCount(sData.assignedProjectsCount);
            }
            if (sData.demandStats?.total !== undefined) {
              setDemandsCount(sData.demandStats.total);
            } else if (sData.taskStats?.done !== undefined) {
              setDemandsCount(sData.taskStats.done);
            }
            if (sData.staff) {
              setUser((prev) => ({
                ...prev,
                name: prev?.name || sData.staff.name,
                designation: prev?.designation || sData.staff.designation,
              }));
            }
          }

          if (myTasksRes.status === 'fulfilled' && myTasksRes.value?.success && isMounted) {
            const tList = Array.isArray(myTasksRes.value.data) ? myTasksRes.value.data : [];
            if (tList.length > 0) {
              setTasksCount((prev) => (prev > 0 ? prev : tList.length));
              const pIds = new Set(tList.map((t) => t.projectId || t.project?._id || t.project).filter(Boolean));
              if (pIds.size > 0) {
                setProjectsCount((prev) => (prev > 0 ? prev : pIds.size));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Staff profile load notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCompany]);

  // Sync edit form fields
  useEffect(() => {
    if (user) {
      setEditName(user.name || user.fullName || '');
      setEditEmail(user.email || '');
      setEditPhone(user.mobileNumber || user.phone || '');
      setEditDesignation(user.designation || user.department || user.role || '');
      setEditAddress(user.address || user.city || '');
      setEditEmergency(user.emergencyContactName || user.emergencyContact || '');
      setProfileImageUri(user.profilePicture || user.avatar || user.image || '');
    }
  }, [user]);

  // Initials
  const userInitials = useMemo(() => {
    const name = (user?.name || user?.fullName || 'Staff Member').trim();
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name.substring(0, 2) || 'ST').toUpperCase();
  }, [user?.name, user?.fullName]);

  // Company Information Resolution
  const companyDisplayName = useMemo(() => {
    if (activeCompany?.name) return activeCompany.name;
    if (activeCompany?.companyName) return activeCompany.companyName;
    if (typeof user?.companyId === 'object' && user?.companyId?.name) return user.companyId.name;
    if (typeof user?.company === 'object' && user?.company?.name) return user.company.name;
    if (user?.companyName) return user.companyName;
    if (typeof user?.company === 'string' && user.company.trim()) return user.company;
    if (user?.firmName) return user.firmName;
    return 'Not Assigned';
  }, [activeCompany, user]);

  const companyBranchName = useMemo(() => {
    if (activeCompany?.branch) return activeCompany.branch;
    if (typeof user?.companyId === 'object' && user?.companyId?.branch) return user.companyId.branch;
    if (user?.companyBranch) return user.companyBranch;
    if (user?.branch) return user.branch;
    if (user?.unit) return user.unit;
    if (activeCompany?.address?.city) return `${activeCompany.address.city} Branch`;
    if (activeCompany?.city) return `${activeCompany.city} Branch`;
    return 'Not Provided';
  }, [activeCompany, user]);

  const siteLocationName = useMemo(() => {
    if (user?.siteLocation) return user.siteLocation;
    if (user?.siteCity) return user.siteCity;
    if (activeCompany?.address) {
      const { street, city, state } = activeCompany.address;
      const parts = [street, city, state].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    if (activeCompany?.city) {
      return activeCompany.state ? `${activeCompany.city}, ${activeCompany.state}` : activeCompany.city;
    }
    if (activeCompany?.location) return activeCompany.location;
    return 'Not Provided';
  }, [activeCompany, user]);

  const workSiteName = useMemo(() => {
    if (user?.workSite) return user.workSite;
    if (user?.siteName) return user.siteName;
    if (user?.plant) return user.plant;
    if (companyDisplayName !== 'Not Assigned') return `${companyDisplayName} Site`;
    return 'Not Provided';
  }, [user, companyDisplayName]);

  // Employee ID
  const staffEmployeeId = useMemo(() => {
    if (user?.employeeId) return user.employeeId;
    const rawId = user?._id || user?.id;
    if (rawId) return `EMP-${String(rawId).slice(-5).toUpperCase()}`;
    return 'Not Provided';
  }, [user?._id, user?.id, user?.employeeId]);

  // Formatted Dates
  const formattedDob = useMemo(() => {
    if (user?.dob) {
      try {
        return new Date(user.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) { }
    }
    return user?.dateOfBirth || 'Not Provided';
  }, [user?.dob, user?.dateOfBirth]);

  const formattedJoiningDate = useMemo(() => {
    const d = user?.joiningDate || user?.dateOfJoining || user?.createdAt;
    if (d) {
      try {
        return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) { }
    }
    return 'Not Provided';
  }, [user?.joiningDate, user?.dateOfJoining, user?.createdAt]);

  // Personal Info Added Items (Hide anything not added)
  const personalPairs = useMemo(() => {
    const rawItems = [
      {
        label: 'FULL NAME',
        value: user?.name || user?.fullName || null,
        icon: User,
      },
      {
        label: 'EMPLOYEE ID',
        value: (user?.employeeId || user?._id || user?.id) ? staffEmployeeId : null,
        icon: User,
      },
      {
        label: 'MOBILE NUMBER',
        value: (user?.mobileNumber || user?.phone) ? `+91 ${user?.mobileNumber || user?.phone}` : null,
        icon: Smartphone,
      },
      {
        label: 'ALTERNATE PHONE',
        value: (user?.alternatePhone || user?.altMobile || user?.secondaryPhone) ? `+91 ${user?.alternatePhone || user?.altMobile || user?.secondaryPhone}` : null,
        icon: Smartphone,
      },
      {
        label: 'EMAIL ADDRESS',
        value: user?.email || null,
        icon: Mail,
      },
      {
        label: 'DEPARTMENT',
        value: user?.department || user?.dept || null,
        icon: Building2,
      },
      {
        label: 'DATE OF BIRTH',
        value: (user?.dob || user?.dateOfBirth) ? formattedDob : null,
        icon: Calendar,
      },
      {
        label: 'JOINING DATE',
        value: (user?.joiningDate || user?.dateOfJoining || user?.createdAt) ? formattedJoiningDate : null,
        icon: Calendar,
      },
      {
        label: 'RESIDENTIAL ADDRESS',
        value: editAddress || user?.address || user?.city || null,
        icon: MapPin,
      },
      {
        label: 'STATE / COUNTRY',
        value: user?.state ? (user.state + (user?.country ? `, ${user.country}` : '')) : (user?.location || null),
        icon: MapPin,
      },
      {
        label: 'EMERGENCY CONTACT',
        value: editEmergency || user?.emergencyContactName || user?.emergencyContact || null,
        icon: PhoneCall,
      },
      {
        label: 'EMERGENCY PHONE',
        value: (user?.emergencyContactPhone || user?.emergencyPhone) ? `+91 ${user?.emergencyContactPhone || user?.emergencyPhone}` : null,
        icon: PhoneCall,
      },
    ];

    const valid = rawItems.filter(
      (item) => item.value && String(item.value).trim() && item.value !== 'Not Provided' && item.value !== 'Not Assigned'
    );

    const pairs = [];
    for (let i = 0; i < valid.length; i += 2) {
      pairs.push(valid.slice(i, i + 2));
    }
    return pairs;
  }, [user, staffEmployeeId, formattedDob, formattedJoiningDate, editAddress, editEmergency]);

  // Company Info Added Items (Hide anything not added)
  const companyPairs = useMemo(() => {
    const rawItems = [
      {
        label: 'COMPANY NAME',
        value: companyDisplayName !== 'Not Assigned' ? companyDisplayName : null,
        icon: Building2,
      },
      {
        label: 'BRANCH / UNIT',
        value: (companyBranchName && companyBranchName !== 'Not Provided') ? companyBranchName : null,
        icon: Building2,
      },
      {
        label: 'DESIGNATION',
        value: user?.designation || (Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles.join(', ') : (user?.role || null)),
        icon: Briefcase,
      },
      {
        label: 'REPORTING MANAGER',
        value: user?.reportingManager?.name || (typeof user?.reportingManager === 'string' ? user.reportingManager : null) || user?.managerName || user?.supervisor || null,
        icon: Briefcase,
      },
      {
        label: 'EMPLOYMENT TYPE',
        value: user?.employmentType || user?.workType || (user?.status ? `${String(user.status).toUpperCase()} Staff` : null),
        icon: Calendar,
      },
      {
        label: 'SHIFT TIMINGS',
        value: user?.shiftTimings || user?.shift || null,
        icon: Calendar,
      },
      {
        label: 'WORK SITE / PLANT',
        value: (workSiteName && workSiteName !== 'Not Provided') ? workSiteName : null,
        icon: MapPin,
      },
      {
        label: 'SITE LOCATION',
        value: (siteLocationName && siteLocationName !== 'Not Provided') ? siteLocationName : null,
        icon: MapPin,
      },
    ];

    const valid = rawItems.filter(
      (item) => item.value && String(item.value).trim() && item.value !== 'Not Provided' && item.value !== 'Not Assigned'
    );

    const pairs = [];
    for (let i = 0; i < valid.length; i += 2) {
      pairs.push(valid.slice(i, i + 2));
    }
    return pairs;
  }, [companyDisplayName, companyBranchName, user, workSiteName, siteLocationName]);

  // Counts
  const totalProjects = propProjectsCount ?? projectsCount ?? dashboardStats?.assignedProjectsCount ?? (user?.assignedProjects?.length || 0);
  const totalTasks = propTasksCount ?? tasksCount ?? dashboardStats?.taskStats?.totalAssigned ?? dashboardStats?.taskStats?.totalTasks ?? (user?.assignedTasks?.length || 0);
  const totalReports = propDemandsCount ?? demandsCount ?? dashboardStats?.demandStats?.total ?? dashboardStats?.taskStats?.done ?? 0;

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
        address: editAddress.trim(),
        emergencyContact: editEmergency.trim(),
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
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password handler
  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation', 'Please enter your current password.');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await changeStaffPassword(currentPassword.trim(), newPassword.trim(), token);
      if (res && res.success) {
        Alert.alert('Success', 'Password changed successfully!');
        setIsPasswordModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Notice', res?.message || 'Could not update password. Please check your current password.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out from Pravisti Staff?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('userInfo');
          } catch (e) { }
          if (onNavigate) {
            onNavigate('Login', {}, { replace: true });
          }
        },
      },
    ]);
  };

  const avatarUrl = profileImageUri ? resolveImageUrl(profileImageUri) : null;

  const handleTabPress = (tabName) => {
    if (onTabChange) {
      onTabChange(tabName);
    } else if (tabName === 'Home') {
      if (onBack) onBack();
      else if (onNavigate) onNavigate('StaffDashboard', { user }, { replace: true });
    } else if (onNavigate) {
      onNavigate(tabName, { user });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Brand Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerLeftBtn}
          onPress={() => {
            if (onOpenDrawer) {
              onOpenDrawer();
            } else if (onBack) {
              onBack();
            }
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {onBack && !onOpenDrawer ? (
            <ArrowLeft size={22} color={ACCENT_NAVY} />
          ) : (
            <Menu size={24} color={BRAND_BLUE} />
          )}
        </TouchableOpacity>

        {/* Pravisti Brand Logo */}
        <View style={styles.brandLogoWrapper}>
          <Image
            source={require('../../images/blue_logo.png')}
            style={styles.brandLogoImg}
            resizeMode="contain"
          />
        </View>

        {/* Right Actions: Notification Bell + Avatar */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              } else if (onNavigate) {
                onNavigate('Notifications');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Bell size={22} color={ACCENT_NAVY} />
            {unreadNotifsCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.userBadgeBtn}
            activeOpacity={0.8}
            onPress={() => setIsEditModalVisible(true)}
          >
            <Text style={styles.userBadgeText}>{userInitials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={BRAND_BLUE} />
            <Text style={styles.loadingText}>Loading staff profile...</Text>
          </View>
        ) : (
          <>
            {/* Hero Profile Banner Card */}
            <View style={styles.heroCard}>
              {/* Construction Crane & Building Silhouette Watermark */}
              <View style={styles.craneWatermark} pointerEvents="none">
                <Svg width="140" height="110" viewBox="0 0 140 110" fill="none">
                  <Line x1="45" y1="110" x2="45" y2="15" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
                  <Line x1="53" y1="110" x2="53" y2="15" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
                  <Line x1="45" y1="100" x2="53" y2="90" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="53" y1="90" x2="45" y2="80" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="45" y1="80" x2="53" y2="70" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="53" y1="70" x2="45" y2="60" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="45" y1="60" x2="53" y2="50" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="53" y1="50" x2="45" y2="40" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="45" y1="40" x2="53" y2="30" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="53" y1="30" x2="45" y2="20" stroke="#93C5FD" strokeWidth="1.2" opacity="0.4" />
                  <Line x1="15" y1="18" x2="135" y2="18" stroke="#93C5FD" strokeWidth="2" opacity="0.6" />
                  <Line x1="49" y1="5" x2="120" y2="18" stroke="#93C5FD" strokeWidth="1.2" opacity="0.5" />
                  <Line x1="49" y1="5" x2="20" y2="18" stroke="#93C5FD" strokeWidth="1.2" opacity="0.5" />
                  <Line x1="49" y1="5" x2="49" y2="18" stroke="#93C5FD" strokeWidth="2" opacity="0.6" />
                  <Line x1="105" y1="18" x2="105" y2="55" stroke="#93C5FD" strokeWidth="1.5" opacity="0.5" />
                  <Rect x="101" y="55" width="8" height="6" fill="#93C5FD" opacity="0.6" />
                  <G opacity="0.35">
                    <Rect x="70" y="45" width="60" height="65" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="4 2" />
                    <Line x1="70" y1="65" x2="130" y2="65" stroke="#60A5FA" strokeWidth="1" />
                    <Line x1="70" y1="85" x2="130" y2="85" stroke="#60A5FA" strokeWidth="1" />
                    <Line x1="90" y1="45" x2="90" y2="110" stroke="#60A5FA" strokeWidth="1" />
                    <Line x1="110" y1="45" x2="110" y2="110" stroke="#60A5FA" strokeWidth="1" />
                  </G>
                </Svg>
              </View>



              {/* Left Staff Avatar & Info */}
              <View style={styles.heroContentRow}>
                <View style={styles.avatarContainer}>
                  {avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>{userInitials}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.cameraIconBtn}
                    onPress={handlePickAvatar}
                    disabled={isUploadingImage}
                    activeOpacity={0.8}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Camera size={12} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Staff Details Column */}
                <View style={styles.staffDetailsCol}>
                  <Text style={styles.staffNameText} numberOfLines={1}>
                    {user?.name || user?.fullName || 'Staff Member'}
                  </Text>
                  <Text style={styles.staffRoleText} numberOfLines={1}>
                    {user?.designation || user?.department || user?.role || 'Staff'}
                  </Text>

                  {/* Company Row */}
                  {companyDisplayName !== 'Not Assigned' && (
                    <View style={styles.metaRow}>
                      <Building2 size={12} color={BRAND_BLUE} style={styles.metaIcon} />
                      <Text style={[styles.metaText, styles.heroCompanyText]} numberOfLines={1}>
                        {companyDisplayName}
                      </Text>
                    </View>
                  )}

                  {/* Phone Row - Only show if added */}
                  {Boolean(user?.mobileNumber || user?.phone) && (
                    <View style={styles.metaRow}>
                      <Phone size={12} color="#475569" style={styles.metaIcon} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {`+91 ${user.mobileNumber || user.phone}`}
                      </Text>
                    </View>
                  )}

                  {/* Email Row - Only show if added */}
                  {Boolean(user?.email && user.email.trim()) && (
                    <View style={styles.metaRow}>
                      <Mail size={12} color="#475569" style={styles.metaIcon} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Stats Row (3 Side-by-Side Cards) */}
            <View style={styles.statsRow}>
              {/* Card 1: Projects */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Briefcase size={18} color="#2563EB" />
                </View>
                <Text style={styles.statNumber}>{totalProjects}</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>

              {/* Card 2: Tasks */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <ClipboardCheck size={18} color="#10B981" />
                </View>
                <Text style={styles.statNumber}>{totalTasks}</Text>
                <Text style={styles.statLabel}>Tasks</Text>
              </View>

              {/* Card 3: Reports */}
              <View style={styles.statCard}>
                <View style={[styles.statIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <BarChart3 size={18} color="#8B5CF6" />
                </View>
                <Text style={styles.statNumber}>{totalReports}</Text>
                <Text style={styles.statLabel}>Reports</Text>
              </View>
            </View>

            {/* Section 1: Personal Information Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIconCircle}>
                    <User size={16} color={BRAND_BLUE} />
                  </View>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                </View>

                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setIsEditModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Edit2 size={13} color={BRAND_BLUE} style={{ marginRight: 4 }} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>

              {/* Info Rows with Left Icons and 2 Pill Columns */}
              <View style={styles.cardContent}>
                {personalPairs.length > 0 ? (
                  personalPairs.map((pair, idx) => {
                    const LeadingIcon = pair[0].icon;
                    const isLast = idx === personalPairs.length - 1;
                    return (
                      <View
                        key={`personal-row-${idx}`}
                        style={[styles.infoLineRow, isLast && { borderBottomWidth: 0, marginBottom: 0 }]}
                      >
                        <LeadingIcon size={18} color="#64748B" style={styles.infoLeadingIcon} />
                        <View style={styles.pillsContainer}>
                          <View style={styles.infoPill}>
                            <Text style={styles.pillLabel}>{pair[0].label}</Text>
                            <Text style={styles.pillValue} numberOfLines={1}>
                              {pair[0].value}
                            </Text>
                          </View>
                          {pair[1] ? (
                            <View style={styles.infoPill}>
                              <Text style={styles.pillLabel}>{pair[1].label}</Text>
                              <Text style={styles.pillValue} numberOfLines={1}>
                                {pair[1].value}
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.infoPill, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />
                          )}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#94A3B8' }}>No personal details added yet.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Section 2: Company Information Card (Only show if company details are added) */}
            {companyPairs.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionIconCircle}>
                      <Building2 size={16} color={BRAND_BLUE} />
                    </View>
                    <Text style={styles.sectionTitle}>Company Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  {companyPairs.map((pair, idx) => {
                    const LeadingIcon = pair[0].icon;
                    const isLast = idx === companyPairs.length - 1;
                    return (
                      <View
                        key={`company-row-${idx}`}
                        style={[styles.infoLineRow, isLast && { borderBottomWidth: 0, marginBottom: 0 }]}
                      >
                        <LeadingIcon size={18} color="#64748B" style={styles.infoLeadingIcon} />
                        <View style={styles.pillsContainer}>
                          <View style={styles.infoPill}>
                            <Text style={styles.pillLabel}>{pair[0].label}</Text>
                            <Text style={styles.pillValue} numberOfLines={1}>
                              {pair[0].value}
                            </Text>
                          </View>
                          {pair[1] ? (
                            <View style={styles.infoPill}>
                              <Text style={styles.pillLabel}>{pair[1].label}</Text>
                              <Text style={styles.pillValue} numberOfLines={1}>
                                {pair[1].value}
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.infoPill, { backgroundColor: 'transparent', borderColor: 'transparent' }]} />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Section 3: Settings Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIconCircle}>
                    <Settings size={16} color={BRAND_BLUE} />
                  </View>
                  <Text style={styles.sectionTitle}>Settings</Text>
                </View>
              </View>

              <View style={styles.settingsContent}>
                {/* Setting 1: Change Password */}
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setIsPasswordModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Lock size={18} color="#475569" style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingItemTitle}>Change Password / Security</Text>
                      <Text style={styles.settingItemSub}>Update credentials & 2FA</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={BRAND_BLUE} />
                </TouchableOpacity>

                {/* Setting 2: App Language */}
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setIsLanguageModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Globe size={18} color="#475569" style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingItemTitle}>App Language</Text>
                      <Text style={styles.settingItemSub}>{selectedLanguage} (हिन्दी / English)</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={BRAND_BLUE} />
                </TouchableOpacity>

                {/* Setting 3: Help & Support */}
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setIsHelpModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <HelpCircle size={18} color="#475569" style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingItemTitle}>Help & Support</Text>
                      <Text style={styles.settingItemSub}>Contact manager, hotline & FAQs</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={BRAND_BLUE} />
                </TouchableOpacity>

                {/* Setting 4: About Pravisti */}
                <TouchableOpacity
                  style={[styles.settingItem, { borderBottomWidth: 0 }]}
                  onPress={() => setIsAboutModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.settingItemLeft}>
                    <Info size={18} color="#475569" style={styles.settingIcon} />
                    <View>
                      <Text style={styles.settingItemTitle}>About Pravisti</Text>
                      <Text style={styles.settingItemSub}>App v1.0.7 (Build 84)</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={BRAND_BLUE} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Logout Action Button */}
            <TouchableOpacity
              style={styles.logoutCardBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <LogOut size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutCardBtnText}>Log Out</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </>
        )}
      </ScrollView>

      {/* Bottom Dock Navigation Bar matching reference */}
      {!hideBottomBar && (
        <View style={styles.bottomDockBar}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => handleTabPress('Home')}
            activeOpacity={0.7}
          >
            <Home size={22} color="#94A3B8" />
            <Text style={styles.dockLabel}>Home</Text>
          </TouchableOpacity>

          {/* Tab 2: Projects */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => handleTabPress('Projects')}
            activeOpacity={0.7}
          >
            <Folder size={22} color="#94A3B8" />
            <Text style={styles.dockLabel}>Projects</Text>
          </TouchableOpacity>

          {/* Tab 3: My Tasks */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => handleTabPress('Tasks')}
            activeOpacity={0.7}
          >
            <ClipboardList size={22} color="#94A3B8" />
            <Text style={styles.dockLabel}>My Tasks</Text>
          </TouchableOpacity>

          {/* Tab 4: Materials */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => handleTabPress('Materials')}
            activeOpacity={0.7}
          >
            <Package size={22} color="#94A3B8" />
            <Text style={styles.dockLabel}>Materials</Text>
          </TouchableOpacity>

          {/* Tab 5: Profile (Active) */}
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => { }}
            activeOpacity={0.7}
          >
            <User size={22} color={BRAND_BLUE} />
            <Text style={[styles.dockLabel, styles.dockLabelActive]}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.sectionIconCircle, { marginRight: 8 }]}>
                  <Edit2 size={16} color={BRAND_BLUE} />
                </View>
                <Text style={styles.modalTitle}>Edit Staff Profile</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalInputs} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>ASSIGNED COMPANY / ORGANIZATION</Text>
              <View style={[styles.textInput, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 13.5, color: '#334155', fontWeight: '600' }} numberOfLines={1}>
                  {companyDisplayName !== 'Not Assigned' ? companyDisplayName : 'Not Assigned'}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>EMPLOYEE ID</Text>
              <View style={[styles.textInput, { backgroundColor: '#F1F5F9', justifyContent: 'center' }]}>
                <Text style={{ fontSize: 13.5, color: '#334155', fontWeight: '600' }} numberOfLines={1}>
                  {staffEmployeeId}
                </Text>
              </View>

              <Text style={styles.fieldLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>DESIGNATION / ROLE</Text>
              <TextInput
                style={styles.textInput}
                value={editDesignation}
                onChangeText={setEditDesignation}
                placeholder="Site Supervisor / Production Staff"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.textInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>RESIDENTIAL ADDRESS</Text>
              <TextInput
                style={styles.textInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="City, State, Address"
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>EMERGENCY CONTACT & PHONE</Text>
              <TextInput
                style={styles.textInput}
                value={editEmergency}
                onChangeText={setEditEmergency}
                placeholder="Name & Contact number"
                placeholderTextColor="#94A3B8"
              />

              <View style={[styles.modalButtons, { marginTop: 16, marginBottom: 12 }]}>
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
                    <Text style={styles.btnSaveText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.sectionIconCircle, { marginRight: 8 }]}>
                  <Lock size={16} color={BRAND_BLUE} />
                </View>
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPasswordModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.modalInputs}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
              <TextInput
                style={styles.textInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <Text style={styles.fieldLabel}>NEW PASSWORD (MIN 6 CHARACTERS)</Text>
              <TextInput
                style={styles.textInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={styles.textInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />

              <View style={[styles.modalButtons, { marginTop: 16, marginBottom: 8 }]}>
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => setIsPasswordModalVisible(false)}
                  disabled={isChangingPassword}
                >
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnSave}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnSaveText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language Selector Modal */}
      <Modal
        visible={isLanguageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsLanguageModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { maxHeight: 340 }]}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Select App Language</Text>
              <TouchableOpacity onPress={() => setIsLanguageModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {['English (Default)', 'हिन्दी (Hindi)', 'मराठी (Marathi)', 'ગુજરાતી (Gujarati)'].map((lang) => {
              const clean = lang.split(' ')[0];
              const isSelected = selectedLanguage.includes(clean);
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langOptionRow, isSelected && styles.langOptionActive]}
                  onPress={() => {
                    setSelectedLanguage(clean);
                    setIsLanguageModalVisible(false);
                  }}
                >
                  <Text style={[styles.langOptionText, isSelected && { color: BRAND_BLUE, fontWeight: '700' }]}>
                    {lang}
                  </Text>
                  {isSelected && <Check size={18} color={BRAND_BLUE} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={isHelpModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsHelpModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setIsHelpModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 14 }}>
                For operational assistance, site query resolution, or reporting issues, please contact Pravisti Desk:
              </Text>
              <View style={styles.supportPill}>
                <Phone size={16} color={BRAND_BLUE} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  {activeCompany?.phone ? `Site Office: ${activeCompany.phone}` : 'Support Desk: +91 1800-202-8888'}
                </Text>
              </View>
              <View style={[styles.supportPill, { marginTop: 8 }]}>
                <Mail size={16} color={BRAND_BLUE} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                  {activeCompany?.email || 'helpdesk@pravisti.com'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btnSave, { marginTop: 14 }]}
              onPress={() => setIsHelpModalVisible(false)}
            >
              <Text style={styles.btnSaveText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={isAboutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsAboutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>About Pravisti</Text>
              <TouchableOpacity onPress={() => setIsAboutModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', paddingVertical: 14 }}>
              <Image
                source={require('../../images/blue_logo.png')}
                style={{ width: 140, height: 40, marginBottom: 12 }}
                resizeMode="contain"
              />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                Pravisti Staff Portal v2.0
              </Text>
              {companyDisplayName !== 'Not Assigned' && (
                <View style={[styles.supportPill, { marginTop: 10, backgroundColor: '#EDF5FF', alignSelf: 'center' }]}>
                  <Building2 size={15} color={BRAND_BLUE} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#0F172A' }}>
                    {companyDisplayName}
                  </Text>
                </View>
              )}
              <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 10, textAlign: 'center', paddingHorizontal: 16 }}>
                Integrated Trade, Production Operations & Commodity Management Suite.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btnSave, { marginTop: 10 }]}
              onPress={() => setIsAboutModalVisible(false)}
            >
              <Text style={styles.btnSaveText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Top Header Bar
  topHeader: {
    height: 58,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeftBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoWrapper: {
    flex: 1,
    alignItems: 'flex-start',
    marginLeft: 10,
  },
  brandLogoImg: {
    width: 140,
    height: 38,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    position: 'relative',
    padding: 6,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userBadgeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  userBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Scroll View
  mainScrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 20,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '500',
  },

  // Hero Profile Card
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#EDF5FF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D8E8FD',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
  },
  craneWatermark: {
    position: 'absolute',
    right: 8,
    bottom: -6,
  },
  quoteBadgeContainer: {
    position: 'absolute',
    top: 14,
    right: 12,
    alignItems: 'flex-end',
  },
  quoteTextLine1: {
    fontSize: 12.5,
    fontWeight: '800',
    color: BRAND_BLUE,
    lineHeight: 14,
  },
  quoteTextLine2: {
    fontSize: 12.5,
    fontWeight: '800',
    color: BRAND_BLUE,
    lineHeight: 14,
  },
  quoteTextLine3: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    lineHeight: 14,
  },
  quoteTextLine4: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    lineHeight: 14,
  },
  quoteTextLine5: {
    fontSize: 12,
    fontWeight: '800',
    color: BRAND_BLUE,
    lineHeight: 15,
  },
  heroContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '68%',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#CBD5E1',
  },
  avatarPlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  staffDetailsCol: {
    flex: 1,
  },
  staffNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: ACCENT_NAVY,
    marginBottom: 2,
  },
  staffRoleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 19,
    fontWeight: '800',
    color: ACCENT_NAVY,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Section Cards
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: ACCENT_NAVY,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_BLUE,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  // Info Line Rows
  infoLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLeadingIcon: {
    width: 24,
    marginRight: 8,
  },
  pillsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  infoPill: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  pillValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },

  // Settings
  settingsContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingItemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: ACCENT_NAVY,
  },
  settingItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Logout Card
  logoutCardBtn: {
    marginHorizontal: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Bottom Navigation Dock
  bottomDockBar: {
    height: 60,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 8,
  },
  dockItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 3,
  },
  dockLabelActive: {
    color: BRAND_BLUE,
    fontWeight: '700',
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ACCENT_NAVY,
  },
  modalInputs: {
    maxHeight: 320,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: ACCENT_NAVY,
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  btnCancelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  btnSave: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
  },
  btnSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  langOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  langOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  langOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  supportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
  },
});

export default StaffProfile;

