import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { CustomersPage } from './pages/CustomersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { RolesUsersPage } from './pages/RolesUsersPage';
import { LoginPage } from './pages/LoginPage';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Loading Bani Milk ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'sales' && <SalesPage />}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'expenses' && <ExpensesPage />}
          {activeTab === 'cashflow' && <CashFlowPage />}
          {activeTab === 'users' && <RolesUsersPage />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
