import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Header } from './src/components/Header';
import { TabBar, TabKey } from './src/components/TabBar';
import { PinLoginScreen } from './src/screens/PinLoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { POSScreen } from './src/screens/POSScreen';
import { SalesHistoryScreen } from './src/screens/SalesHistoryScreen';
import { StockScreen } from './src/screens/StockScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { Ionicons } from '@expo/vector-icons';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [cartCount, setCartCount] = useState<number>(0);

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashIconWrap}>
          <Ionicons name="nutrition" size={48} color="#047857" />
        </View>
        <Text style={styles.splashTitle}>Bani Milk ERP</Text>
        <Text style={styles.splashSubtitle}>Loading Dairy Operations Mobile...</Text>
        <ActivityIndicator
          size="large"
          color="#047857"
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  // If not authenticated, render 6-digit PIN login screen
  if (!user) {
    return <PinLoginScreen />;
  }

  // Render current tab screen
  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen onNavigateTab={(tab) => setActiveTab(tab)} />;
      case 'pos':
        return <POSScreen onCartCountChange={setCartCount} />;
      case 'sales':
        return <SalesHistoryScreen />;
      case 'stock':
        return <StockScreen />;
      case 'expenses':
        return <ExpensesScreen />;
      default:
        return <DashboardScreen onNavigateTab={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Header />
      <View style={styles.screenContainer}>{renderScreen()}</View>
      <TabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        cartCount={cartCount}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splashIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#065f46',
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#047857',
    marginTop: 4,
  },
});
