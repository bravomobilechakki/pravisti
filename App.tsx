import React, { useState, useEffect } from 'react';
import { StyleSheet, View, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile, getPendingVerificationStatus } from './src/services/api';

import Login from './src/components/login/login';
import Signup from './src/components/login/Signup';
import ChooseIndustry from './src/components/login/ChooseIndustry';
import Footer from './src/components/footer/footer';
import {
  Dashboard,
  AddCompany,
  CompanyDetails,
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
} from './src/components/trader';
import {
  BrokerDashboard,
  BrokerLogin,
  BrokerOTPVerify,
  BrokerRegistration,
  BrokerAuthGateway,
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

const LoginScreen = Login as any;
const SignupScreen = Signup as any;
const ChooseIndustryScreen = ChooseIndustry as any;
const DashboardScreen = Dashboard as any;
const AddCompanyScreen = AddCompany as any;
const CompanyDetailsScreen = CompanyDetails as any;
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
const BrokerDashboardScreen = BrokerDashboard as any;
const BrokerAddCompanyScreen = BrokerAddCompany as any;
const BrokerCompanyDetailsScreen = BrokerCompanyDetails as any;
const BrokerOnboardUserScreen = BrokerOnboardUser as any;
const BrokerProfileScreen = BrokerProfile as any;
const CreateBrokerDealScreen = CreateBrokerDeal as any;
const BrokerCreatedDealsScreen = BrokerCreatedDeals as any;
const BrokerPendingQueueScreen = BrokerPendingQueue as any;
const BrokerDealDetailsScreen = BrokerDealDetails as any;

const checkIsUserBroker = (userObj: any, explicitRole?: string): boolean => {
  if (explicitRole) {
    const cleanExp = explicitRole.toString().toLowerCase();
    if (cleanExp === 'trader' || cleanExp === 'seller' || cleanExp === 'buyer') return false;
    if (cleanExp === 'broker') return true;
  }
  const uRole = (
    userObj?.role ||
    userObj?.userType ||
    (userObj?.roles && userObj.roles[0]) ||
    ''
  ).toString().toLowerCase();

  return uRole.includes('broker');
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
        if (token) {
          const response = await getUserProfile(token);
          if (response && response.success) {
            const userData = response.data;
            const storedProfileStr = await AsyncStorage.getItem('user_completed_profile');
            let mergedUser = userData;
            if (storedProfileStr) {
              mergedUser = { ...userData, ...JSON.parse(storedProfileStr) };
            }
            const isBroker = checkIsUserBroker(mergedUser);
            const initialScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
            setNavigationStack([{ screen: initialScreen, data: { user: mergedUser, role: isBroker ? 'Broker' : 'Trader' } }]);

            if (!isBroker) {
              checkPendingVerification(token);
            }
          } else {
            // Token invalid or expired
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('user_completed_profile');
          }
        }
      } catch (error) {
        console.error('Failed to restore session automatically', error);
        try {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('user_completed_profile');
        } catch (clearError) {
          console.warn('Failed to clear invalid credentials', clearError);
        }
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

  const navigateTab = (screen: string) => {
    const userData = current?.data?.user || {};
    const isBroker = checkIsUserBroker(userData, current?.data?.role);

    let targetScreen = screen;
    if (screen === 'Dashboard' || screen === 'BrokerDashboard') {
      targetScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
    } else if (screen === 'Profile' || screen === 'BrokerProfile') {
      targetScreen = isBroker ? 'BrokerProfile' : 'Profile';
    } else if (screen === 'AddCompany' || screen === 'BrokerAddCompany') {
      targetScreen = isBroker ? 'BrokerAddCompany' : 'AddCompany';
    }

    const homeScreen = isBroker ? 'BrokerDashboard' : 'Dashboard';
    const activeData = { ...current?.data, user: userData, role: isBroker ? 'Broker' : 'Trader' };

    if (targetScreen === homeScreen) {
      setNavigationStack([{ screen: homeScreen, data: activeData }]);
    } else {
      setNavigationStack([
        { screen: homeScreen, data: activeData },
        { screen: targetScreen, data: activeData }
      ]);
    }
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

  const renderScreen = () => {
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
      }

      if (finalTarget === 'pop') {
        const popped = popScreen();
        if (!popped) {
          replaceScreen(isTargetBroker ? 'BrokerDashboard' : 'Dashboard', finalData);
        }
        return;
      }

      if (!isTargetBroker && (finalTarget === 'Dashboard' || finalTarget === 'Profile')) {
        checkPendingVerification();
      }

      if (options.replace || finalTarget === 'Dashboard' || finalTarget === 'BrokerDashboard' || finalTarget === 'Login') {
        replaceScreen(finalTarget, finalData);
      } else {
        pushScreen(finalTarget, finalData);
      }
    };

    switch (screen) {
      case 'Login':
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
      case 'Signup':
        return <SignupScreen onNavigate={onNavigate} routeData={data} />;
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
      case 'BrokerDashboard':
        return <BrokerDashboardScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerAddCompany':
        return <BrokerAddCompanyScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerOnboardUser':
        return <BrokerOnboardUserScreen onNavigate={onNavigate} routeData={data} />;
      case 'BrokerProfile':
        return <BrokerProfileScreen onNavigate={onNavigate} routeData={data} />;
      default:
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
    }
  };

  const showFooter = current ? ['Dashboard', 'BrokerDashboard'].includes(current.screen) : false;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {renderScreen()}
        {showFooter && current && (
          <Footer onNavigate={navigateTab} activeScreen={current.screen} isBroker={isBrokerUser} />
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
      </View>
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
