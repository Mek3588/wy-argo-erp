import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EXPENSE_CATEGORIES = [
  'Feed & Fodder',
  'Packaging & Bottles',
  'Transport & Fuel',
  'Utilities & Cold Room',
  'Equipment Maintenance',
  'Veterinary & Medicine',
  'Labor & Daily Wages',
  'Miscellaneous',
];

export const ExpensesScreen: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Add Expense Modal
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('Feed & Fodder');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paidTo, setPaidTo] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch expenses');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreateExpense = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter expense description.');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Required', 'Please enter a valid amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createExpense({
        category,
        title: title.trim(),
        amount: amt,
        payment_method: paymentMethod,
        paid_to: paidTo.trim() || undefined,
        receipt_number: receiptNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Expense Recorded', `${amt.toLocaleString()} ETB recorded to operational expenses.`);
      setModalVisible(false);
      setTitle('');
      setAmount('');
      setPaidTo('');
      setReceiptNumber('');
      setNotes('');
      fetchExpenses();
    } catch (err: any) {
      Alert.alert('Failed', err.message || 'Could not record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total Operational Expenses</Text>
          <Text style={styles.summaryValue}>
            {totalExpenseAmount.toLocaleString()} ETB
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addBtnText}>Record Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Expenses List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Loading expense records...</Text>
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="wallet-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No expenses recorded yet</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchExpenses();
              }}
              colors={['#047857']}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.expenseCard}>
              <View style={styles.expenseCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseCategory}>{item.category}</Text>
                  <Text style={styles.expenseTitle}>{item.title}</Text>
                  <Text style={styles.expenseSub}>
                    By {item.recorded_by_name} •{' '}
                    {new Date(item.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.amountCol}>
                  <Text style={styles.expenseAmount}>
                    -{Number(item.amount).toLocaleString()} ETB
                  </Text>
                  <View style={styles.payBadge}>
                    <Text style={styles.payBadgeText}>{item.payment_method.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {item.paid_to && (
                <View style={styles.paidToRow}>
                  <Ionicons name="business-outline" size={12} color="#64748b" />
                  <Text style={styles.paidToText}>Paid to: {item.paid_to}</Text>
                  {item.receipt_number && (
                    <Text style={styles.receiptRefText}>Ref: {item.receipt_number}</Text>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* Record Expense Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Record Operational Expense</Text>
                <Text style={styles.modalSubtitle}>Deducts from Dairy Cash Flow ledger</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Category Picker */}
              <Text style={styles.inputLabel}>Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.catChip,
                      category === c && styles.catChipActive,
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        category === c && styles.catChipTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={styles.inputLabel}>Title / Description *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 5 Bales of Hay & Dairy Meal"
                value={title}
                onChangeText={setTitle}
              />

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount in ETB *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 1500"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Payment Method */}
              <Text style={styles.inputLabel}>Paid From *</Text>
              <View style={styles.payMethodsRow}>
                {['cash', 'telebirr', 'cbe', 'other'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.payChip,
                      paymentMethod === m && styles.payChipActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <Text
                      style={[
                        styles.payChipText,
                        paymentMethod === m && styles.payChipTextActive,
                      ]}
                    >
                      {m.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Vendor / Paid To */}
              <Text style={styles.inputLabel}>Vendor / Paid To</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Oromia Animal Feed Union"
                value={paidTo}
                onChangeText={setPaidTo}
              />

              {/* Receipt Reference */}
              <Text style={styles.inputLabel}>Paper Receipt / Voucher #</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. VCH-0045"
                value={receiptNumber}
                onChangeText={setReceiptNumber}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                placeholder="Additional notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              {/* Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleCreateExpense}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Expense</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    backgroundColor: '#ffffff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryBox: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#dc2626',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#94a3b8',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 10,
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  expenseCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
    textTransform: 'uppercase',
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  expenseSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc2626',
  },
  payBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  payBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  paidToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paidToText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  receiptRefText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  catChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  payMethodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  payChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  payChipActive: {
    backgroundColor: '#dc2626',
  },
  payChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  payChipTextActive: {
    color: '#ffffff',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: '#dc2626',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

