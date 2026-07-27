import React, { useState, useEffect } from 'react';
import { StyleSheet, View, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from './src/services/api';

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
  BrokerProfile,
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
const BrokerProfileScreen = BrokerProfile as any;

function App() {
  const [navigationStack, setNavigationStack] = useState([
    { screen: 'Login', data: {} as any },
  ]);
  const [isInitializing, setIsInitializing] = useState(true);

  // Auto-login logic
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await getUserProfile(token);
          if (response && response.success) {
            const userData = response.data;
            const roleStr = (userData?.role || (userData?.roles && userData.roles[0]) || '').toString().toLowerCase();
            const initialScreen = roleStr.includes('broker') ? 'BrokerDashboard' : 'Dashboard';
            setNavigationStack([{ screen: initialScreen, data: { user: userData } }]);
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
    const roleStr = (current?.data?.role || userData?.role || (userData?.roles && userData.roles[0]) || '').toString().toLowerCase();
    const homeScreen = roleStr.includes('broker') ? 'BrokerDashboard' : 'Dashboard';

    if (screen === 'Dashboard' || screen === 'BrokerDashboard') {
      setNavigationStack([{ screen: homeScreen, data: { user: userData } }]);
    } else {
      setNavigationStack([
        { screen: homeScreen, data: { user: userData } },
        { screen, data: { user: userData } }
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
          // Update the current screen's data with the new user profile
          setNavigationStack(prev => {
            const newStack = [...prev];
            const lastIdx = newStack.length - 1;
            newStack[lastIdx] = {
              ...newStack[lastIdx],
              data: { ...newStack[lastIdx].data, user: response.data }
            };
            return newStack;
          });
          return response.data;
        }
      }
    } catch (error) {
      console.error('Failed to refresh profile', error);
    }
  };

  const renderScreen = () => {
    const { screen, data } = current || { screen: 'Login', data: {} as any };
    const onNavigate = async (target: string, targetData = {} as any, options = { replace: false, refresh: false }) => {
      let finalData = targetData;

      // If refresh is requested, fetch latest profile before navigating
      if (options.refresh) {
        const freshUser = await refreshUserProfile();
        if (freshUser) {
          finalData = { ...targetData, user: freshUser };
        }
      }

      let finalTarget = target;
      const checkUser = finalData?.user || current?.data?.user;
      const checkRole = (finalData?.role || checkUser?.role || (checkUser?.roles && checkUser.roles[0]) || '').toString().toLowerCase();

      if (finalTarget === 'Dashboard' && checkRole.includes('broker')) {
        finalTarget = 'BrokerDashboard';
      }

      if ((finalTarget === 'AddCompany' || finalTarget === 'BrokerAddCompany') && checkRole.includes('broker')) {
        finalTarget = 'BrokerAddCompany';
      }

      if ((finalTarget === 'Profile' || finalTarget === 'BrokerProfile') && checkRole.includes('broker')) {
        finalTarget = 'BrokerProfile';
      }

      if (finalTarget === 'pop') {
        const popped = popScreen();
        if (!popped) {
          replaceScreen(checkRole.includes('broker') ? 'BrokerDashboard' : 'Dashboard', finalData);
        }
        return;
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
        return <DashboardScreen onNavigate={onNavigate} routeData={data} />;
      case 'AddCompany':
        return <AddCompanyScreen onNavigate={onNavigate} routeData={data} />;
      case 'CompanyDetails':
        return (
          <CompanyDetailsScreen onNavigate={onNavigate} routeData={data} />
        );
      case 'DealsList':
        return <DealsListScreen onNavigate={onNavigate} routeData={data} />;
      case 'CreateDeal':
        return <CreateDealScreen onNavigate={onNavigate} routeData={data} />;
      case 'DealDetails':
        return <DealDetailsScreen onNavigate={onNavigate} routeData={data} />;
      case 'DealChat':
        return <DealChatScreen onNavigate={onNavigate} routeData={data} />;
      case 'ChatList':
        return <ChatListScreen onNavigate={onNavigate} routeData={data} />;
      case 'Profile':
        return <ProfileScreen onNavigate={onNavigate} routeData={data} />;
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
      case 'BrokerProfile':
        return <BrokerProfileScreen onNavigate={onNavigate} routeData={data} />;
      default:
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
    }
  };

  const showFooter = current ? ['Dashboard', 'BrokerDashboard', 'DealsList', 'ChatList', 'Profile'].includes(current.screen) : false;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {renderScreen()}
        {showFooter && current && (
          <Footer onNavigate={navigateTab} activeScreen={current.screen} />
        )}
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
