import React, { useState, useEffect } from 'react';
import { StyleSheet, View, BackHandler, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, getPendingVerificationStatus } from './src/services/api';

import Login from './src/components/login/login';
import Signup from './src/components/login/Signup';
import StaffLogin from './src/components/login/StaffLogin';
import ChooseIndustry from './src/components/login/ChooseIndustry';
import {
  Dashboard,
  AddCompany,
  CompanyDetails,
  CompanyProfileDetails,
  DealsList,
  CreateDeal,
  DealDetails,
  DealChat,
  ChatList,
  Profile,
  MyCompanies,
  ContactPicker,
  CategoryPage,
  AddProductPage,
  TransactionHistory,
  OnboardedUsers,
  CompanyPayments,
  CompanyDeliveries,
  CompanyLedger,
  DealInvoice,
  ProjectsList,
  CreateProject,
  ProjectDetails,
} from './src/components/trader';
import Notifications from './src/components/common/Notifications';
import AIBotScreen from './src/components/common/AIBotScreen';
import AIBotFloatingButton from './src/components/common/AIBotFloatingButton';
import {
  BrokerDashboard,
  BrokerAddCompany,
  BrokerCompanyDetails,
  BrokerOnboardUser,
  BrokerDealDetails,
  BrokerProfile,
  CreateBrokerDeal,
  BrokerCreatedDeals,
  BrokerPendingQueue,
  OwnershipConfirmationModal,
} from './src/components/broker';
import { StaffDashboard, StaffProfile, StaffTasksSelf } from './src/components/staff';
import { VoicePreferencesScreen } from './src/modules/voice';

const LoginScreen = Login as any;
const SignupScreen = Signup as any;
const StaffLoginScreen = StaffLogin as any;
const StaffProfileScreen = StaffProfile as any;
const StaffTasksSelfScreen = StaffTasksSelf as any;
const ChooseIndustryScreen = ChooseIndustry as any;
const DashboardScreen = Dashboard as any;
const AddCompanyScreen = AddCompany as any;
const CompanyDetailsScreen = CompanyDetails as any;
const CompanyProfileDetailsScreen = CompanyProfileDetails as any;
const DealsListScreen = DealsList as any;
const CreateDealScreen = CreateDeal as any;
const DealDetailsScreen = DealDetails as any;
const DealChatScreen = DealChat as any;
const ChatListScreen = ChatList as any;
const ProfileScreen = Profile as any;
const MyCompaniesScreen = MyCompanies as any;
const ContactPickerScreen = ContactPicker as any;
const CategoryPageScreen = CategoryPage as any;
const AddProductPageScreen = AddProductPage as any;
const TransactionHistoryScreen = TransactionHistory as any;
const OnboardedUsersScreen = OnboardedUsers as any;
const CompanyPaymentsScreen = CompanyPayments as any;
const CompanyDeliveriesScreen = CompanyDeliveries as any;
const CompanyLedgerScreen = CompanyLedger as any;
const DealInvoiceScreen = DealInvoice as any;
const ProjectsListScreen = ProjectsList as any;
const CreateProjectScreen = CreateProject as any;
const ProjectDetailsScreen = ProjectDetails as any;
const NotificationsScreen = Notifications as any;
const BrokerDashboardScreen = BrokerDashboard as any;
const StaffDashboardScreen = StaffDashboard as any;
const BrokerAddCompanyScreen = BrokerAddCompany as any;
const BrokerCompanyDetailsScreen = BrokerCompanyDetails as any;
const BrokerOnboardUserScreen = BrokerOnboardUser as any;
const BrokerProfileScreen = BrokerProfile as any;
const CreateBrokerDealScreen = CreateBrokerDeal as any;
const BrokerCreatedDealsScreen = BrokerCreatedDeals as any;
const BrokerPendingQueueScreen = BrokerPendingQueue as any;
const BrokerDealDetailsScreen = BrokerDealDetails as any;
const VoicePreferencesScreenComponent = VoicePreferencesScreen as any;
const AIBotScreenComponent = AIBotScreen as any;
const AIBotFloatingButtonComponent = AIBotFloatingButton as any;

const checkIsUserBroker = (userObj: any, explicitRole?: string): boolean => {
  if (explicitRole) {
    const cleanExp = explicitRole.toString().toLowerCase();
    if (cleanExp === 'trader' || cleanExp === 'seller' || cleanExp === 'buyer') return false;
    if (cleanExp === 'broker') return true;
  }
  const actualUser = (userObj && typeof userObj === 'object' && userObj.user && typeof userObj.user === 'object') ? userObj.user : userObj;
  const uRole = (
    userObj?.role ||
    actualUser?.role ||
    actualUser?.userType ||
    (actualUser?.roles && actualUser.roles[0]) ||
    ''
  ).toString().toLowerCase();

  return uRole.includes('broker');
};

const isAuthOrStaffScreen = (screenName: string): boolean => {
  if (!screenName) return true;
  const s = String(screenName).toLowerCase().replace(/[^a-z]/g, '');
  return [
    'login',
    'signup',
    'stafflogin',
    'staffdashboard',
    'staffprofile',
    'stafftasksself',
    'chooseindustry',
    'aibot',
    'dealchat',
  ].includes(s);
};

const getScreenStatusBarConfig = (screenName: string) => {
  switch (screenName) {
    case 'Dashboard':
    case 'AddCompany':
    case 'BrokerDashboard':
    case 'BrokerProfile':
    case 'Profile':
    case 'AIBot':
    case 'ProjectsList':
    case 'StaffDashboard':
    case 'StaffTasksSelf':
      return { bg: '#2327D8', barStyle: 'light-content' as const };
    case 'Notifications':
    case 'MyCompanies':
      return { bg: '#1A56DB', barStyle: 'light-content' as const };
    case 'Login':
    case 'Signup':
    case 'ChooseIndustry':
    case 'DealInvoice':
      return { bg: '#0F172A', barStyle: 'light-content' as const };
    case 'BrokerLogin':
    case 'BrokerOTPVerify':
    case 'BrokerAuthGateway':
      return { bg: '#312E81', barStyle: 'light-content' as const };
    case 'BrokerAddCompany':
    case 'BrokerCompanyDetails':
    case 'BrokerOnboardUser':
      return { bg: '#1E1B4B', barStyle: 'light-content' as const };
    case 'VoicePreferences':
      return { bg: '#1541D8', barStyle: 'light-content' as const };
    default:
      return { bg: '#FFFFFF', barStyle: 'dark-content' as const };
  }
};

function App() {
  const [navigationStack, setNavigationStack] = useState([
    { screen: 'Login', data: {} as any },
  ]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showOwnershipModal, setShowOwnershipModal] = useState(false);
  const [pendingUserData, setPendingUserData] = useState<any>(null);

  const checkPendingVerification = async (tokenToUse?: string) => {
    try {
      const token = tokenToUse || (await AsyncStorage.getItem('userToken'));
      if (!token) return;
      const response = await getPendingVerificationStatus(token);
      if (response && response.success && response.data) {
        const details = response.data.details || response.data;
        const isPending = response.data.pending || details.accountStatus === 'pending';
        if (isPending && details) {
          setPendingUserData(details);
          setShowOwnershipModal(true);
        }
      }
    } catch (err) {
      console.warn('Pending verification check notice:', err);
    }
  };

  // Auto-login logic
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');

        if (token) {
          // If staff role is saved, direct to StaffDashboard
          if (role === 'staff') {
            const cachedStaff = await AsyncStorage.getItem('userInfo');
            let staffData = {};
            if (cachedStaff) {
              try { staffData = JSON.parse(cachedStaff); } catch { }
            }
            setNavigationStack([{ screen: 'StaffDashboard', data: { user: staffData, role: 'staff' } }]);
            setIsInitializing(false);
            return;
          }

          const storedProfileStr = await AsyncStorage.getItem('user_completed_profile');
          let cachedUser: any = null;
          if (storedProfileStr) {
            try {
              cachedUser = JSON.parse(storedProfileStr);
            } catch { }
          }

          // If we have cached profile, launch immediately without waiting for server!
          if (cachedUser) {
            const isBroker = checkIsUserBroker(cachedUser);
            const initialScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
            setNavigationStack([{ screen: initialScreen, data: { user: cachedUser, role: isBroker ? 'Broker' : 'Trader' } }]);
            setIsInitializing(false);
          }

          // Fetch latest profile from server
          try {
            const response = await getUserProfile(token);
            if (response && response.success && response.data) {
              const userData = response.data;
              let mergedUser = userData;
              if (cachedUser) {
                mergedUser = { ...userData, ...cachedUser };
              }
              const isBroker = checkIsUserBroker(mergedUser);
              const initialScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
              setNavigationStack([{ screen: initialScreen, data: { user: mergedUser, role: isBroker ? 'Broker' : 'Trader' } }]);
              AsyncStorage.setItem('user_completed_profile', JSON.stringify(mergedUser)).catch(() => { });
              checkPendingVerification(token);
            } else if (response?.statusCode === 401 || (response?.message && response.message.toLowerCase().includes('token'))) {
              // Token strictly invalid/expired by auth server
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('user_completed_profile');
              setNavigationStack([{ screen: 'Login', data: {} }]);
            }
          } catch (netErr) {
            console.warn('Network error during session verification, continuing with cached session:', netErr);
          }
        } else {
          // No token saved, show Login screen
          setNavigationStack([{ screen: 'Login', data: {} }]);
        }
      } catch (error) {
        console.warn('Failed to restore session automatically', error);
        setNavigationStack([{ screen: 'Login', data: {} }]);
      } finally {
        setIsInitializing(false);
      }
    };
    initializeAuth();
  }, []);

  const current = navigationStack[navigationStack.length - 1];

  const pushScreen = (screen: string, data = {}) => {
    setNavigationStack(prev => [...prev, { screen, data }]);
  };

  const replaceScreen = (screen: string, data = {}) => {
    setNavigationStack([{ screen, data }]);
  };

  const popScreen = React.useCallback(() => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
      return true; // handled
    }
    return false; // let system exit app if on first screen
  }, [navigationStack]);

  useEffect(() => {
    const backAction = () => {
      return popScreen();
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [popScreen]);

  if (isInitializing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const refreshUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const response = await getUserProfile(token);
        if (response && response.success) {
          const storedProfileStr = await AsyncStorage.getItem('user_completed_profile');
          const storedProfile = storedProfileStr ? JSON.parse(storedProfileStr) : null;
          const mergedUser = {
            ...response.data,
            ...(storedProfile || {}),
          };
          const isBrokerRole = checkIsUserBroker(mergedUser);
          const updatedUser = {
            ...mergedUser,
            role: isBrokerRole ? 'Broker' : 'Trader',
          };

          setNavigationStack(prev => {
            const newStack = [...prev];
            const lastIdx = newStack.length - 1;
            newStack[lastIdx] = {
              ...newStack[lastIdx],
              data: {
                ...newStack[lastIdx].data,
                role: isBrokerRole ? 'Broker' : 'Trader',
                user: updatedUser
              }
            };
            return newStack;
          });
          return updatedUser;
        }
      }
    } catch (error) {
      console.error('Failed to refresh profile', error);
    }
  };

  const { screen, data } = current || { screen: 'Login', data: {} as any };
  const checkUser = data?.user || {};
  const isBrokerUser = checkIsUserBroker(checkUser, data?.role);

  const onNavigate = async (target: string, targetData = {} as any, options = { replace: false, refresh: false }) => {
    const targetUser = targetData?.user || checkUser;
    const isTargetBroker = checkIsUserBroker(targetUser, targetData?.role);

    let finalData = {
      ...targetData,
      role: isTargetBroker ? 'Broker' : 'Trader',
      user: targetUser,
    };

    if (options.refresh) {
      const freshUser = await refreshUserProfile();
      if (freshUser) {
        finalData = { ...finalData, user: freshUser, role: checkIsUserBroker(freshUser) ? 'Broker' : 'Trader' };
      }
    }

    let finalTarget = target;
    if (finalTarget === 'Dashboard' || finalTarget === 'BrokerDashboard') {
      finalTarget = isTargetBroker ? 'BrokerDashboard' : 'Dashboard';
    } else if (finalTarget === 'AddCompany' || finalTarget === 'BrokerAddCompany') {
      finalTarget = isTargetBroker ? 'BrokerAddCompany' : 'AddCompany';
    } else if (finalTarget === 'Profile' || finalTarget === 'BrokerProfile') {
      finalTarget = isTargetBroker ? 'BrokerProfile' : 'Profile';
    } else if (finalTarget === 'CompanyDetails' || finalTarget === 'BrokerCompanyDetails') {
      finalTarget = isTargetBroker ? 'BrokerCompanyDetails' : 'CompanyDetails';
    }

    if (finalTarget === 'pop' || finalTarget === 'back') {
      const popped = popScreen();
      if (!popped) {
        replaceScreen(isTargetBroker ? 'BrokerDashboard' : 'Dashboard', finalData);
      }
      return;
    }

    if (finalTarget === 'Dashboard' || finalTarget === 'BrokerDashboard' || finalTarget === 'Profile' || finalTarget === 'BrokerProfile') {
      checkPendingVerification();
    }

    if (options.replace || finalTarget === 'Dashboard' || finalTarget === 'BrokerDashboard' || finalTarget === 'StaffDashboard' || finalTarget === 'Login' || finalTarget === 'StaffLogin') {
      replaceScreen(finalTarget, finalData);
    } else {
      pushScreen(finalTarget, finalData);
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'Login':
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
      case 'Signup':
        return <SignupScreen onNavigate={onNavigate} routeData={data} />;
      case 'StaffLogin':
        return <StaffLoginScreen onNavigate={onNavigate} routeData={data} />;
      case 'ChooseIndustry':
        return <ChooseIndustryScreen onNavigate={onNavigate} routeData={data} />;
      case 'Dashboard':
        return isBrokerUser ? (
          <BrokerDashboardScreen onNavigate={onNavigate} routeData={data} />
        ) : (
          <DashboardScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'AddCompany':
        return isBrokerUser ? (
          <BrokerAddCompanyScreen onNavigate={onNavigate} routeData={data} />
        ) : (
          <AddCompanyScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'CompanyDetails':
        return isBrokerUser ? (
          <BrokerCompanyDetailsScreen onNavigate={onNavigate} routeData={data} />
        ) : (
          <CompanyDetailsScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'CompanyProfileDetails':
        return <CompanyProfileDetailsScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerCompanyDetails':
        return <BrokerCompanyDetailsScreen onNavigate={onNavigate} routeData={data} />;
      case 'DealsList':
        return <DealsListScreen onNavigate={onNavigate} routeData={data} />;
      case 'CreateDeal':
        return isBrokerUser ? (
          <CreateBrokerDealScreen onNavigate={onNavigate} routeData={data} />
        ) : (
          <CreateDealScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'CreateBrokerDeal':
        return <CreateBrokerDealScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerCreatedDeals':
      case 'BrokerDealsList':
        return <BrokerCreatedDealsScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerPendingQueue':
        return <BrokerPendingQueueScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerDealDetails':
        return <BrokerDealDetailsScreen onNavigate={onNavigate} routeData={data} />;
      case 'DealDetails':
        return isBrokerUser ? (
          <BrokerDealDetailsScreen onNavigate={onNavigate} routeData={data} />
        ) : (
          <DealDetailsScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'DealChat':
        return <DealChatScreen onNavigate={onNavigate} routeData={data} />;
      case 'ChatList':
        return <ChatListScreen onNavigate={onNavigate} routeData={data} />;
      case 'Notifications':
        return <NotificationsScreen onNavigate={onNavigate} routeData={data} />;
      case 'Profile':
        return isBrokerUser ? (
          <BrokerProfileScreen onNavigate={onNavigate} routeData={data} />
        ) : (
          <ProfileScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'MyCompanies':
        return <MyCompaniesScreen onNavigate={onNavigate} routeData={data} />;
      case 'ContactPicker':
        return <ContactPickerScreen onNavigate={onNavigate} routeData={data} />;
      case 'CategoryPage':
        return <CategoryPageScreen onNavigate={onNavigate} routeData={data} />;
      case 'AddProductPage':
        return <AddProductPageScreen onNavigate={onNavigate} routeData={data} />;
      case 'TransactionHistory':
        return <TransactionHistoryScreen onNavigate={onNavigate} routeData={data} />;
      case 'OnboardedUsers':
        return <OnboardedUsersScreen onNavigate={onNavigate} routeData={data} />;
      case 'CompanyPayments':
        return <CompanyPaymentsScreen onNavigate={onNavigate} routeData={data} />;
      case 'CompanyDeliveries':
      case 'Deliveries':
        return <CompanyDeliveriesScreen onNavigate={onNavigate} routeData={data} />;
      case 'CompanyLedger':
      case 'Ledger':
        return <CompanyLedgerScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerDashboard':
        return <BrokerDashboardScreen onNavigate={onNavigate} routeData={data} />;
      case 'StaffDashboard':
        return <StaffDashboardScreen onNavigate={onNavigate} routeData={data} />;
      case 'StaffProfile':
        return <StaffProfileScreen onNavigate={onNavigate} routeData={data} onBack={() => onNavigate('pop')} />;
      case 'StaffTasksSelf':
        return <StaffTasksSelfScreen onNavigate={onNavigate} routeData={data} onBack={() => onNavigate('pop')} />;
      case 'BrokerAddCompany':
        return <BrokerAddCompanyScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerOnboardUser':
        return <BrokerOnboardUserScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerProfile':
        return <BrokerProfileScreen onNavigate={onNavigate} routeData={data} />;
      case 'VoicePreferences':
        return <VoicePreferencesScreenComponent onBack={() => onNavigate('pop')} userToken={data?.token} routeData={data} />;
      case 'AIBot':
        return <AIBotScreenComponent onNavigate={onNavigate} routeData={data} />;
      case 'DealInvoice':
        return <DealInvoiceScreen onNavigate={onNavigate} routeData={data} />;
      case 'ProjectsList':
        return <ProjectsListScreen onNavigate={onNavigate} routeData={data} />;
      case 'CreateProject':
        return <CreateProjectScreen onNavigate={onNavigate} routeData={data} />;
      case 'ProjectDetails':
        return <ProjectDetailsScreen onNavigate={onNavigate} routeData={data} />;
      default:
        if (data?.token || data?.user) {
          return isBrokerUser ? (
            <BrokerDashboardScreen onNavigate={onNavigate} routeData={data} />
          ) : (
            <DashboardScreen onNavigate={onNavigate} routeData={data} />
          );
        }
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
    }
  };

  // const isAuthScreen = current && !['Login', 'Signup', 'ChooseIndustry', 'VoicePreferences'].includes(current.screen);

  const statusBarConfig = getScreenStatusBarConfig(screen);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: statusBarConfig.bg }]}
        edges={['top']}
      >
        <StatusBar
          barStyle={statusBarConfig.barStyle}
          backgroundColor={statusBarConfig.bg}
          translucent={false}
        />
        <View style={{ flex: 1, backgroundColor: statusBarConfig.bg === '#0F172A' ? '#0F172A' : '#FFFFFF' }}>
          {renderScreen()}
        </View>

        {/* Global Draggable Pravisti AI Assistant across main trading screens only */}
        {!isAuthOrStaffScreen(screen) && (
          <AIBotFloatingButtonComponent
            onPress={() => onNavigate('AIBot', {
              user: data?.user || (checkUser && Object.keys(checkUser).length > 0 ? checkUser : undefined),
              company: data?.company,
              companyId: data?.companyId || data?.company?._id || data?.company?.id,
              role: isBrokerUser ? 'Broker' : 'Trader',
            })}
          />
        )}

        <OwnershipConfirmationModal
          visible={showOwnershipModal}
          onClose={() => setShowOwnershipModal(false)}
          userData={pendingUserData}
          onConfirmed={() => {
            setShowOwnershipModal(false);
            refreshUserProfile();
          }}
          onRejected={() => {
            setShowOwnershipModal(false);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default App;
