import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export type TabKey = 'dashboard' | 'pos' | 'sales' | 'stock' | 'expenses';

interface Props {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  cartCount?: number;
}

export const TabBar: React.FC<Props> = ({ activeTab, onSelectTab, cartCount = 0 }) => {
  const { user } = useAuth();

  // Tab permissions based on role
  const userRole = (user?.role || '').toLowerCase();
  const isInventoryOnly = userRole.includes('inventory');
  const isCashierOnly = userRole.includes('cashier');

  const tabs: {
    key: TabKey;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge?: number;
    hidden?: boolean;
  }[] = [
    {
      key: 'dashboard',
      label: 'Home',
      icon: activeTab === 'dashboard' ? 'grid' : 'grid-outline',
    },
    {
      key: 'pos',
      label: 'POS Sale',
      icon: activeTab === 'pos' ? 'cart' : 'cart-outline',
      badge: cartCount > 0 ? cartCount : undefined,
      hidden: isInventoryOnly,
    },
    {
      key: 'sales',
      label: 'Daily Sales',
      icon: activeTab === 'sales' ? 'receipt' : 'receipt-outline',
      hidden: isInventoryOnly,
    },
    {
      key: 'stock',
      label: 'Inventory',
      icon: activeTab === 'stock' ? 'layers' : 'layers-outline',
    },
    {
      key: 'expenses',
      label: 'Expenses',
      icon: activeTab === 'expenses' ? 'wallet' : 'wallet-outline',
      hidden: isCashierOnly || isInventoryOnly,
    },
  ];

  return (
    <View style={styles.container}>
      {tabs
        .filter((t) => !t.hidden)
        .map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => onSelectTab(tab.key)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={tab.icon}
                  size={22}
                  color={isActive ? '#047857' : '#9ca3af'}
                />
                {tab.badge !== undefined && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    position: 'relative',
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#047857',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -12,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});

