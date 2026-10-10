import React, { useState } from 'react';
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
import { ServerSettingsModal } from '../components/ServerSettingsModal';

const PIN_LENGTH = 6;

export const PinLoginScreen: React.FC = () => {
  const { loginWithPin, isConnected } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

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
      await loginWithPin(completedPin);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid 6-digit PIN. Please try again.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
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

        {/* PIN Prompt & Visual Indicator */}
        <View style={styles.pinDisplaySection}>
          <View style={styles.lockIconCircle}>
            <Ionicons name="lock-closed" size={28} color="#047857" />
          </View>

          <Text style={styles.mainTitle}>Staff Terminal Sign In</Text>
          <Text style={styles.pinPromptText}>
            Enter your assigned 6-digit staff PIN
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serverDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  serverPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
  },
  pinDisplaySection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  lockIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  pinPromptText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  pinDotFilled: {
    backgroundColor: '#047857',
    borderColor: '#047857',
    transform: [{ scale: 1.15 }],
  },
  pinDotError: {
    borderColor: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    gap: 12,
    marginBottom: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyBtn: {
    flex: 1,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionKeyBtn: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  numberKeyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
  },
  actionKeyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});
