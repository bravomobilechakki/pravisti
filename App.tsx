import React, { useState, useEffect } from 'react';
import { StyleSheet, View, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Login from './src/components/login/login';
import Dashboard from './src/components/dashboard/dashboard';
import AddCompany from './src/components/dashboard/addCompany';
import CompanyDetails from './src/components/dashboard/CompanyDetails';
import DealsList from './src/components/sauda/DealsList';
import CreateDeal from './src/components/sauda/CreateDeal';
import DealDetails from './src/components/sauda/DealDetails';
import DealChat from './src/components/sauda/DealChat';
import ChatList from './src/components/sauda/ChatList';
import Profile from './src/components/profile/profile';
import ContactPicker from './src/components/sauda/ContactPicker';
import Footer from './src/components/footer/footer';

const LoginScreen = Login as any;
const DashboardScreen = Dashboard as any;
const AddCompanyScreen = AddCompany as any;
const CompanyDetailsScreen = CompanyDetails as any;
const DealsListScreen = DealsList as any;
const CreateDealScreen = CreateDeal as any;
const DealDetailsScreen = DealDetails as any;
const DealChatScreen = DealChat as any;
const ChatListScreen = ChatList as any;
const ProfileScreen = Profile as any;
const ContactPickerScreen = ContactPicker as any;

function App() {
  // Navigation stack to handle back button (history)
  const [navigationStack, setNavigationStack] = useState([
    { screen: 'Login', data: {} },
  ]);

  const current = navigationStack[navigationStack.length - 1];

  const pushScreen = (screen: string, data = {}) => {
    setNavigationStack(prev => [...prev, { screen, data }]);
  };

  const popScreen = () => {
    if (navigationStack.length > 1) {
      setNavigationStack(prev => prev.slice(0, -1));
      return true; // handled
    }
    return false; // let system exit app if on first screen
  };

  useEffect(() => {
    const backAction = () => {
      return popScreen();
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [navigationStack]);

  const renderScreen = () => {
    const { screen, data } = current;
    const onNavigate = pushScreen; // Pass push as navigation function

    switch (screen) {
      case 'Login':
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
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
      case 'ContactPicker':
        return <ContactPickerScreen onNavigate={onNavigate} routeData={data} />;
      default:
        return <LoginScreen onNavigate={onNavigate} routeData={data} />;
    }
  };

  const showFooter = current.screen === 'Dashboard';

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {renderScreen()}
        {showFooter && (
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
