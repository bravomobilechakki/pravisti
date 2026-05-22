import React, { useState, useEffect } from 'react';
import { StyleSheet, View, BackHandler, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProfile } from './src/services/api';

import Login from './src/components/login/login';
import Signup from './src/components/login/Signup';
import Dashboard from './src/components/dashboard/dashboard';
import AddCompany from './src/components/dashboard/addCompany';
import CompanyDetails from './src/components/dashboard/CompanyDetails';
import DealsList from './src/components/sauda/DealsList';
import CreateDeal from './src/components/sauda/CreateDeal';
import DealDetails from './src/components/sauda/DealDetails';
import DealChat from './src/components/sauda/DealChat';
import ChatList from './src/components/sauda/ChatList';
import Profile from './src/components/profile/profile';
import MyCompanies from './src/components/profile/MyCompanies';
import ContactPicker from './src/components/sauda/ContactPicker';
import Footer from './src/components/footer/footer';
import ChooseIndustry from './src/components/login/ChooseIndustry';
import CategoryPage from './src/components/dashboard/CategoryPage';
import AddProductPage from './src/components/dashboard/AddProductPage';

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
            // Restore user session to Dashboard automatically
            setNavigationStack([{ screen: 'Dashboard', data: { user: response.data } }]);
          } else {
            // Token invalid or expired
            await AsyncStorage.removeItem('userToken');
          }
        }
      } catch (error) {
        console.error('Failed to restore session automatically', error);
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
    const onNavigate = async (target: string, targetData = {}, options = { replace: false, refresh: false }) => {
      if (target === 'pop') {
        const popped = popScreen();
        if (!popped) {
          replaceScreen('Dashboard');
        }
        return;
      }

      let finalData = targetData;

      // If refresh is requested, fetch latest profile before navigating
      if (options.refresh) {
        const freshUser = await refreshUserProfile();
        if (freshUser) {
          finalData = { ...targetData, user: freshUser };
        }
      }

      if (options.replace || target === 'Dashboard' || target === 'Login') {
        replaceScreen(target, finalData);
      } else {
        pushScreen(target, finalData);
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
      default:
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
    }
  };

  const showFooter = current ? ['Dashboard', 'DealsList', 'ChatList', 'Profile'].includes(current.screen) : false;

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {renderScreen()}
        {showFooter && current && (
          <Footer onNavigate={pushScreen} activeScreen={current.screen} />
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
