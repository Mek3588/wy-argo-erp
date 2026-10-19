import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ServerSettingsModal } from './ServerSettingsModal';

export const Header: React.FC = () => {
  const { user, logout, isConnected } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    Alert.alert('Lock Terminal', 'Are you sure you want to log out of the mobile POS?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const getRoleBadgeStyle = (role: string = '') => {
    const r = role.toLowerCase();
    if (r.includes('admin')) return { bg: '#fee2e2', text: '#991b1b', label: 'Admin' };
    if (r.includes('manager')) return { bg: '#fef3c7', text: '#92400e', label: 'Manager' };
    if (r.includes('cashier')) return { bg: '#dbeafe', text: '#1e40af', label: 'Cashier' };
    if (r.includes('inventory')) return { bg: '#ede9fe', text: '#5b21b6', label: 'Inventory' };
    return { bg: '#e5e7eb', text: '#374151', label: 'Staff' };
  };

  const roleInfo = getRoleBadgeStyle(user?.role);
  const displayName = user?.full_name || user?.name || user?.username || 'Staff';

  return (
    <>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={styles.logoIcon}>
            <Ionicons name="nutrition-outline" size={20} color="#047857" />
          </View>
          <View>
            <Text style={styles.brandTitle}>Bani Milk</Text>
            {user && (
              <View style={styles.userRow}>
                <Text style={styles.userName} numberOfLines={1}>
                  {displayName}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                  <Text style={[styles.roleText, { color: roleInfo.text }]}>{roleInfo.label}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.connectionBtn}
            onPress={() => setShowSettings(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? '#10b981' : '#ef4444' },
              ]}
            />
            <Ionicons name="wifi-outline" size={16} color="#4b5563" />
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="lock-closed-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ServerSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: -0.2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    maxWidth: 120,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  logoutBtn: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 8,
  },
});

