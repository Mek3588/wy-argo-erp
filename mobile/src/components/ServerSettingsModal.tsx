import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const { serverUrl, updateServerUrl, isConnected } = useAuth();
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const presets = [
    { label: 'Host Machine LAN (Device/Wi-Fi)', url: 'http://10.5.2.7:5000/api' },
    { label: 'Localhost (Web / Local)', url: 'http://localhost:5000/api' },
    { label: 'Android Emulator (10.0.2.2)', url: 'http://10.0.2.2:5000/api' },
  ];

  const handleTestAndSave = async (targetUrl?: string) => {
    const urlToUse = targetUrl || urlInput;
    setTesting(true);
    setStatusMessage(null);
    try {
      const ok = await updateServerUrl(urlToUse);
      if (ok) {
        setStatusMessage('Connected successfully to Backend API! ✅');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMessage('⚠️ Could not connect to API at this address. Make sure backend is running.');
      }
    } catch (e: any) {
      setStatusMessage(`Error: ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="server-outline" size={22} color="#047857" />
              <Text style={styles.title}>API Server Connection</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Configure the backend API server URL so the mobile app can sync with your ERP database.
          </Text>

          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? '#10b981' : '#ef4444' },
              ]}
            />
            <Text style={styles.statusText}>
              Current Status: {isConnected ? 'Online & Connected' : 'Disconnected / Unreachable'}
            </Text>
          </View>

          <Text style={styles.label}>Server Base URL</Text>
          <TextInput
            style={styles.input}
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="http://10.5.2.7:5000/api"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.presetLabel}>Quick Presets:</Text>
          <View style={styles.presetsContainer}>
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.url}
                style={[
                  styles.presetChip,
                  urlInput === preset.url && styles.presetChipActive,
                ]}
                onPress={() => {
                  setUrlInput(preset.url);
                  handleTestAndSave(preset.url);
                }}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    urlInput === preset.url && styles.presetChipTextActive,
                  ]}
                >
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {statusMessage && (
            <Text
              style={[
                styles.statusFeedback,
                statusMessage.includes('✅')
                  ? styles.statusSuccess
                  : styles.statusError,
              ]}
            >
              {statusMessage}
            </Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={testing}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => handleTestAndSave()}
              disabled={testing}
            >
              {testing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Connect & Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  presetsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
  },
  presetChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  presetChipText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '500',
  },
  presetChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statusFeedback: {
    fontSize: 13,
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusSuccess: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
  },
  statusError: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#047857',
  },
  saveBtnText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
});

