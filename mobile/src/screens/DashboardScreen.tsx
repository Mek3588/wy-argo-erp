import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DashboardStats, CashFlowSummary } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TabKey } from '../components/TabBar';

interface Props {
  onNavigateTab: (tab: TabKey) => void;
}

export const DashboardScreen: React.FC<Props> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, cashflowData] = await Promise.all([
        api.getDashboardStats(),
        api.getCashFlowSummary().catch(() => null),
      ]);
      setStats(statsData);
      setCashflow(cashflowData);
    } catch (err: any) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          colors={['#047857']}
        />
      }
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeTextCol}>
          <Text style={styles.welcomeSub}>Bani Milk Dairy Management</Text>
          <Text style={styles.welcomeTitle}>
            Welcome, {(user?.full_name || user?.name || user?.username || 'Staff').split(' ')[0]}
          </Text>
          <Text style={styles.welcomeRole}>
            Role: {(user?.role || 'Staff').toUpperCase()} • Daily Operations
          </Text>
        </View>
        <View style={styles.welcomeIconWrap}>
          <Ionicons name="sunny" size={32} color="#f59e0b" />
        </View>
      </View>

      {/* Quick Action Shortcuts */}
      <View style={styles.shortcutsRow}>
        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: '#ecfdf5' }]}
          onPress={() => onNavigateTab('pos')}
          activeOpacity={0.7}
        >
          <Ionicons name="cart" size={20} color="#047857" />
          <Text style={[styles.shortcutText, { color: '#047857' }]}>New Sale</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: '#eff6ff' }]}
          onPress={() => onNavigateTab('sales')}
          activeOpacity={0.7}
        >
          <Ionicons name="receipt" size={20} color="#2563eb" />
          <Text style={[styles.shortcutText, { color: '#2563eb' }]}>Daily Sales</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutBtn, { backgroundColor: '#fef3c7' }]}
          onPress={() => onNavigateTab('stock')}
          activeOpacity={0.7}
        >
          <Ionicons name="layers" size={20} color="#b45309" />
          <Text style={[styles.shortcutText, { color: '#b45309' }]}>Inventory</Text>
        </TouchableOpacity>

        {!((user?.role || '').toLowerCase().includes('cashier')) && (
          <TouchableOpacity
            style={[styles.shortcutBtn, { backgroundColor: '#f5f3ff' }]}
            onPress={() => onNavigateTab('expenses')}
            activeOpacity={0.7}
          >
            <Ionicons name="wallet" size={20} color="#7c3aed" />
            <Text style={[styles.shortcutText, { color: '#7c3aed' }]}>Expenses</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Updating dairy statistics...</Text>
        </View>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <View style={styles.metricsGrid}>
            {/* Today's Sales */}
            <View style={[styles.metricCard, { borderLeftColor: '#047857' }]}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricTitle}>Today's Sales</Text>
                <Ionicons name="trending-up" size={18} color="#047857" />
              </View>
              <Text style={styles.metricBig}>
                {(stats?.salesToday?.total ?? stats?.today_sales ?? 0).toLocaleString()} ETB
              </Text>
              <Text style={styles.metricSub}>
                {(stats?.salesToday?.count ?? stats?.today_transactions ?? 0)} completed transactions
              </Text>
            </View>

            {/* Monthly Revenue */}
            <View style={[styles.metricCard, { borderLeftColor: '#2563eb' }]}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricTitle}>Monthly Revenue</Text>
                <Ionicons name="calendar-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.metricBig}>
                {(stats?.salesThisMonth?.total ?? stats?.monthly_revenue ?? 0).toLocaleString()} ETB
              </Text>
              <Text style={styles.metricSub}>
                {(stats?.salesThisMonth?.count ?? 0)} monthly sales recorded
              </Text>
            </View>
          </View>

          {/* Cash Flow Balances Card */}
          <View style={styles.cashCard}>
            <View style={styles.cashCardHeader}>
              <View style={styles.cashTitleRow}>
                <Ionicons name="cash-outline" size={18} color="#065f46" />
                <Text style={styles.cashCardTitle}>Active Cash Flow Reserves</Text>
              </View>
              <Text style={styles.netCash}>
                {(cashflow?.summary?.net_balance ?? stats?.cashTotals?.net_cash ?? cashflow?.balance ?? 0).toLocaleString()} ETB
              </Text>
            </View>

            <View style={styles.cashBreakdown}>
              <View style={styles.cashCol}>
                <Text style={styles.cashColLabel}>Cash</Text>
                <Text style={styles.cashColValue}>
                  {(cashflow?.by_method?.find((m: any) => m.payment_method === 'CASH')?.balance ?? cashflow?.cash_in_hand ?? 0).toLocaleString()} ETB
                </Text>
              </View>
              <View style={styles.cashDivider} />
              <View style={styles.cashCol}>
                <Text style={styles.cashColLabel}>Telebirr</Text>
                <Text style={styles.cashColValue}>
                  {(cashflow?.by_method?.find((m: any) => m.payment_method === 'TELEBIRR')?.balance ?? cashflow?.telebirr_balance ?? 0).toLocaleString()} ETB
                </Text>
              </View>
              <View style={styles.cashDivider} />
              <View style={styles.cashCol}>
                <Text style={styles.cashColLabel}>E-Birr</Text>
                <Text style={styles.cashColValue}>
                  {(cashflow?.by_method?.find((m: any) => m.payment_method === 'EBIRR')?.balance ?? 0).toLocaleString()} ETB
                </Text>
              </View>
              <View style={styles.cashDivider} />
              <View style={styles.cashCol}>
                <Text style={styles.cashColLabel}>CBE Bank</Text>
                <Text style={styles.cashColValue}>
                  {(cashflow?.by_method?.find((m: any) => m.payment_method === 'BANK_TRANSFER')?.balance ?? cashflow?.bank_balance ?? 0).toLocaleString()} ETB
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Sales List */}
          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <Text style={styles.recentSectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => onNavigateTab('sales')}>
                <Text style={styles.viewAllText}>View All &gt;</Text>
              </TouchableOpacity>
            </View>

            {(() => {
              const salesList = stats?.recentSales ?? stats?.recent_sales ?? [];
              if (salesList.length === 0) {
                return (
                  <Text style={styles.noSalesText}>No transactions recorded yet today.</Text>
                );
              }
              return salesList.slice(0, 5).map((sale: any) => {
                const code = sale.sale_code || sale.receipt_number || `SL-${sale.id}`;
                const cashier = sale.cashier_name || 'Staff';
                const timeStr = sale.created_at
                  ? new Date(sale.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const customer =
                  sale.customer_name && sale.customer_name !== 'Walk-in Customer'
                    ? ` • ${sale.customer_name}`
                    : '';
                const method = (sale.payment_method || 'CASH').toUpperCase();

                return (
                  <View key={sale.id} style={styles.recentSaleRow}>
                    <View style={styles.recentSaleLeft}>
                      <View style={styles.saleIcon}>
                        <Ionicons name="receipt-outline" size={16} color="#047857" />
                      </View>
                      <View>
                        <Text style={styles.receiptCode}>{code}</Text>
                        <Text style={styles.receiptCategory}>
                          {cashier} • {method}{customer} {timeStr ? `(${timeStr})` : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.receiptAmount}>
                      {Number(sale.total_amount).toLocaleString()} ETB
                    </Text>
                  </View>
                );
              });
            })()}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: '#047857',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeTextCol: {
    flex: 1,
  },
  welcomeSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a7f3d0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  welcomeRole: {
    fontSize: 11,
    color: '#d1fae5',
    marginTop: 4,
  },
  welcomeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  shortcutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  shortcutText: {
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metricBig: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  metricSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  cashCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  cashCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cashTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  netCash: {
    fontSize: 15,
    fontWeight: '900',
    color: '#065f46',
  },
  cashBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
  },
  cashCol: {
    flex: 1,
    alignItems: 'center',
  },
  cashDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  cashColLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  cashColValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  recentSection: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  recentSaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  recentSaleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  receiptCategory: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  receiptAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  noSalesText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

