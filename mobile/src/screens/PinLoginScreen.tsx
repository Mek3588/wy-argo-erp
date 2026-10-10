import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { StaffMember } from '../types';
import { ServerSettingsModal } from '../components/ServerSettingsModal';

const PIN_LENGTH = 6;

const getStaffDisplayName = (staff?: StaffMember | null): string => {
  if (!staff) return 'Staff';
  return staff.full_name || staff.name || staff.username || 'Staff';
};

const getStaffFirstName = (staff?: StaffMember | null): string => {
  const name = getStaffDisplayName(staff);
  return name.split(' ')[0] || 'Staff';
};

export const PinLoginScreen: React.FC = () => {
  const { staffList, refreshStaffList, loginWithPin, isLoading, isConnected } = useAuth();
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    refreshStaffList();
  }, []);

  // When staffList loads, preselect cashier or first staff member
  useEffect(() => {
    if (staffList.length > 0 && !selectedStaff) {
      const defaultStaff =
        staffList.find((s) => (s.role || '').toLowerCase().includes('cashier')) ||
        staffList[0];
      setSelectedStaff(defaultStaff);
    }
  }, [staffList]);

  // Handle number press
  const handleDigitPress = (digit: string) => {
    if (submitting || pin.length >= PIN_LENGTH) return;
    setErrorMessage(null);
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      submitPin(newPin);
    }
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage(null);
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const submitPin = async (completedPin: string) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await loginWithPin(completedPin, selectedStaff?.id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid 6-digit PIN. Please try again.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoFill = (staff: StaffMember, demoPin: string) => {
    setSelectedStaff(staff);
    setPin(demoPin);
    setErrorMessage(null);
    submitPin(demoPin);
  };

  const getRoleBadge = (role: string = '') => {
    const r = role.toLowerCase();
    if (r.includes('admin')) return { label: 'Admin', color: '#dc2626' };
    if (r.includes('manager')) return { label: 'Manager', color: '#d97706' };
    if (r.includes('cashier')) return { label: 'Cashier', color: '#2563eb' };
    if (r.includes('inventory')) return { label: 'Inventory', color: '#7c3aed' };
    return { label: role || 'Staff', color: '#4b5563' };
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.logoBadge}>
            <Ionicons name="nutrition" size={24} color="#047857" />
            <Text style={styles.logoTitle}>WY Argo Dairy</Text>
          </View>
          <TouchableOpacity
            style={styles.serverPill}
            onPress={() => setShowSettings(true)}
          >
            <View
              style={[
                styles.serverDot,
                { backgroundColor: isConnected ? '#18c78d' : '#ef4444' },
              ]}
            />
            <Text style={styles.serverPillText}>{isConnected ? 'Connected' : 'Offline'}</Text>
            <Ionicons name="settings-outline" size={14} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Staff Profile Selection */}
        <View style={styles.staffSection}>
          <Text style={styles.sectionHeading}>Select Staff Terminal Profile:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.staffScroll}
          >
            {staffList.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id;
              const badge = getRoleBadge(staff.role);
              const displayName = getStaffDisplayName(staff);
              return (
                <TouchableOpacity
                  key={staff.id}
                  style={[styles.staffCard, isSelected && styles.staffCardSelected]}
                  onPress={() => {
                    setSelectedStaff(staff);
                    setPin('');
                    setErrorMessage(null);
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.avatarCircle,
                      isSelected && styles.avatarCircleSelected,
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={18}
                      color={isSelected ? '#ffffff' : '#047857'}
                    />
                  </View>
                  <Text
                    style={[styles.staffName, isSelected && styles.staffNameSelected]}
                    numberOfLines={1}
                  >
                    {displayName}
                  </Text>
                  <Text style={[styles.staffRole, { color: badge.color }]}>
                    {badge.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* PIN Prompt & Visual Indicator */}
        <View style={styles.pinDisplaySection}>
          <Text style={styles.pinPromptText}>
            Enter 6-Digit PIN for {getStaffDisplayName(selectedStaff)}
          </Text>

          {/* 6 Dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: PIN_LENGTH }).map((_, index) => {
              const isFilled = index < pin.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    isFilled && styles.pinDotFilled,
                    errorMessage && styles.pinDotError,
                  ]}
                />
              );
            })}
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {submitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#047857" size="small" />
              <Text style={styles.loadingText}>Verifying PIN...</Text>
            </View>
          )}
        </View>

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['C', '0', '⌫'],
          ].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((btn) => {
                if (btn === 'C') {
                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[styles.keyBtn, styles.actionKeyBtn]}
                      onPress={handleClear}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionKeyText}>Clear</Text>
                    </TouchableOpacity>
                  );
                }
                if (btn === '⌫') {
                  return (
                    <TouchableOpacity
                      key={btn}
                      style={[styles.keyBtn, styles.actionKeyBtn]}
                      onPress={handleBackspace}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="backspace-outline" size={24} color="#374151" />
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={btn}
                    style={styles.keyBtn}
                    onPress={() => handleDigitPress(btn)}
                    activeOpacity={0.7}
                    disabled={submitting}
                  >
                    <Text style={styles.numberKeyText}>{btn}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Demo Fast Pins Bar */}
        <View style={styles.demoBar}>
          <Text style={styles.demoTitle}>Quick Demo Logins (Tap to Test):</Text>
          <View style={styles.demoButtonsRow}>
            {staffList.slice(0, 4).map((s) => {
              const roleKey = (s.role || '').toLowerCase();
              const demoPins: Record<string, string> = {
                admin: '111111',
                manager: '222222',
                cashier: '333333',
                sales_cashier: '333333',
                inventory: '444444',
                inventory_clerk: '444444',
              };
              const pinVal =
                demoPins[roleKey] ||
                (roleKey.includes('admin')
                  ? '111111'
                  : roleKey.includes('manager')
                  ? '222222'
                  : roleKey.includes('cashier')
                  ? '333333'
                  : '444444');
              const firstName = getStaffFirstName(s);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={styles.demoChip}
                  onPress={() => handleQuickDemoFill(s, pinVal)}
                >
                  <Text style={styles.demoChipText}>
                    {firstName} ({pinVal})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <ServerSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065f46',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  staffSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  staffScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  staffCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    width: 105,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  staffCardSelected: {
    borderColor: '#047857',
    backgroundColor: '#ecfdf5',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatarCircleSelected: {
    backgroundColor: '#047857',
  },
  staffName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  staffNameSelected: {
    color: '#065f46',
    fontWeight: '700',
  },
  staffRole: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  pinDisplaySection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  pinPromptText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94a3b8',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  pinDotError: {
    borderColor: '#ef4444',
    backgroundColor: '#fecaca',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  loadingText: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '600',
  },
  keypad: {
    gap: 12,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    marginVertical: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyBtn: {
    flex: 1,
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionKeyBtn: {
    backgroundColor: '#f1f5f9',
  },
  numberKeyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionKeyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  demoBar: {
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 12,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  demoChip: {
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  demoChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
});
