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
import { Sale } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const SALE_CATEGORIES = [
  'All',
  'Retail / Walk-in',
  'Morning Shift Sales',
  'Evening Shift Sales',
  'Wholesale / Cafe Delivery',
  'Hotel & Restaurant Bulk',
  'Route Distribution',
];

export const SalesHistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');

  // Edit / Details Modal State
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const roleStr = (user?.role || '').toLowerCase();
  const canEdit = roleStr.includes('manager') || roleStr.includes('admin');
  const canVerifyFinance = roleStr.includes('manager') || roleStr.includes('admin') || roleStr.includes('finance');
  const [isVerifyingFinance, setIsVerifyingFinance] = useState<boolean>(false);

  const handleToggleFinanceVerify = async () => {
    if (!selectedSale) return;
    try {
      setIsVerifyingFinance(true);
      const res = await api.toggleFinanceVerify(selectedSale.id);
      setSelectedSale({
        ...selectedSale,
        is_finance_verified: res.is_finance_verified,
        finance_verified_at: res.finance_verified_at,
        finance_verified_by_name: res.finance_verified_by_name,
      });
      setSales((prev) =>
        prev.map((s) =>
          s.id === selectedSale.id
            ? {
                ...s,
                is_finance_verified: res.is_finance_verified,
                finance_verified_at: res.finance_verified_at,
                finance_verified_by_name: res.finance_verified_by_name,
              }
            : s
        )
      );
      Alert.alert(
        res.is_finance_verified ? 'Payment Verified' : 'Verification Revoked',
        res.is_finance_verified
          ? 'Payment has been successfully verified by Finance.'
          : 'Payment verification has been revoked.'
      );
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Failed to update verification');
    } finally {
      setIsVerifyingFinance(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchSales = async () => {
    try {
      setLoading(true);
      const data = await api.getSales({
        search: searchQuery.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        date: dateFilter === 'today' ? todayStr : undefined,
      });
      setSales(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load sales receipts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedCategory, dateFilter]);

  // Debounced or on-submit search
  const handleSearchSubmit = () => {
    fetchSales();
  };

  const handleOpenSale = (sale: Sale) => {
    setSelectedSale(sale);
    setIsEditing(false);
    setEditCustomerName(sale.customer_name || '');
    setEditCustomerPhone(sale.customer_phone || '');
    setEditCategory(sale.sale_category || 'Retail / Walk-in');
    let pm = (sale.payment_method || 'CASH').toUpperCase();
    if (pm === 'CBE' || pm === 'BANK') pm = 'BANK_TRANSFER';
    setEditPaymentMethod(pm);
    setEditNotes(sale.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!selectedSale) return;
    try {
      setIsSavingEdit(true);
      const res = await api.updateSale(selectedSale.id, {
        customer_name: editCustomerName.trim() || undefined,
        customer_phone: editCustomerPhone.trim() || undefined,
        sale_category: editCategory,
        payment_method: editPaymentMethod,
        notes: editNotes.trim() || undefined,
      });

      Alert.alert('Receipt Updated', 'The sale record and cash ledger have been updated successfully.');
      setSelectedSale(res.sale);
      setIsEditing(false);
      fetchSales();
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update receipt');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const totalFilteredAmount = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);

  return (
    <View style={styles.container}>
      {/* Top Search & Filter Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search receipt #, customer, phone..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  fetchSales();
                }}
              >
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearchSubmit}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter & Categories Scroll */}
        <View style={styles.filterRow}>
          <View style={styles.dateToggle}>
            <TouchableOpacity
              style={[
                styles.dateToggleBtn,
                dateFilter === 'today' && styles.dateToggleBtnActive,
              ]}
              onPress={() => setDateFilter('today')}
            >
              <Text
                style={[
                  styles.dateToggleText,
                  dateFilter === 'today' && styles.dateToggleTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateToggleBtn,
                dateFilter === 'all' && styles.dateToggleBtnActive,
              ]}
              onPress={() => setDateFilter('all')}
            >
              <Text
                style={[
                  styles.dateToggleText,
                  dateFilter === 'all' && styles.dateToggleTextActive,
                ]}
              >
                All Dates
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.summaryStrip}>
          <Text style={styles.summaryCount}>
            {sales.length} Receipts {dateFilter === 'today' ? '(Today)' : ''}
          </Text>
          <Text style={styles.summaryTotal}>
            Total: {totalFilteredAmount.toLocaleString()} ETB
          </Text>
        </View>
      </View>

      {/* Sales List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Loading sales receipts...</Text>
        </View>
      ) : sales.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No sales recorded for this selection</Text>
        </View>
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSales();
              }}
              colors={['#047857']}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.saleCard}
              onPress={() => handleOpenSale(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.receiptNum}>
                    {(item as any).sale_code || item.receipt_number || `SL-${item.id}`}
                  </Text>
                  <Text style={styles.saleDate}>
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    • {item.cashier_name}
                  </Text>
                </View>
                <View style={styles.amountCol}>
                  <Text style={styles.saleAmount}>
                    {Number(item.total_amount).toLocaleString()} ETB
                  </Text>
                  <View style={styles.payBadge}>
                    <Text style={styles.payBadgeText}>{item.payment_method.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {item.items_summary ? (
                <Text style={styles.cardItemsSummary} numberOfLines={1}>
                  🥛 {item.items_summary}
                </Text>
              ) : null}

              <View style={styles.cardBottom}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>👤 {item.cashier_name || 'Staff'}</Text>
                </View>
                {item.customer_name ? (
                  <Text style={styles.customerText} numberOfLines={1}>
                    Cust: {item.customer_name}
                  </Text>
                ) : (
                  <Text style={styles.customerWalkIn}>Walk-in</Text>
                )}
                {item.is_finance_verified ? (
                  <View style={styles.financeVerifiedBadge}>
                    <Ionicons name="checkmark-circle" size={11} color="#047857" />
                    <Text style={styles.financeVerifiedText}>Verified</Text>
                  </View>
                ) : (
                  <View style={styles.financePendingBadge}>
                    <Ionicons name="time-outline" size={11} color="#b45309" />
                    <Text style={styles.financePendingText}>Pending</Text>
                  </View>
                )}
                {canEdit && (
                  <View style={styles.editHint}>
                    <Ionicons name="pencil" size={12} color="#047857" />
                    <Text style={styles.editHintText}>Edit</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Sale Details / Manager Edit Modal */}
      <Modal visible={!!selectedSale} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Sale Receipt' : 'Receipt Details'}
              </Text>
              <Text style={styles.modalCode}>
                {(selectedSale as any)?.sale_code || selectedSale?.receipt_number || `SL-${selectedSale?.id}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedSale(null)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {selectedSale && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* If in Edit Mode */}
              {isEditing ? (
                <View style={styles.editSection}>
                  <View style={styles.managerNotice}>
                    <Ionicons name="shield-checkmark" size={18} color="#047857" />
                    <Text style={styles.managerNoticeText}>
                      Manager Override: You are editing an already processed sale. Changes will update the Cash Ledger.
                    </Text>
                  </View>

                  <Text style={styles.fieldLabel}>Daily Sales Category</Text>
                  <View style={styles.categoryPicker}>
                    {SALE_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          editCategory === cat && styles.categoryOptionActive,
                        ]}
                        onPress={() => setEditCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            editCategory === cat && styles.categoryOptionTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Payment Method</Text>
                  <View style={styles.payOptions}>
                    {[
                      { id: 'CASH', label: 'Cash' },
                      { id: 'TELEBIRR', label: 'Telebirr' },
                      { id: 'BANK_TRANSFER', label: 'CBE Bank' },
                      { id: 'CREDIT', label: 'Credit' },
                    ].map((m) => {
                      const isSel = (editPaymentMethod || '').toUpperCase() === m.id ||
                        (m.id === 'BANK_TRANSFER' && (editPaymentMethod || '').toUpperCase() === 'CBE');
                      return (
                        <TouchableOpacity
                          key={m.id}
                          style={[
                            styles.payOption,
                            isSel && styles.payOptionActive,
                          ]}
                          onPress={() => setEditPaymentMethod(m.id)}
                        >
                          <Text
                            style={[
                              styles.payOptionText,
                              isSel && styles.payOptionTextActive,
                            ]}
                          >
                            {m.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>Customer Name</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editCustomerName}
                    onChangeText={setEditCustomerName}
                    placeholder="Customer Name"
                  />

                  <Text style={styles.fieldLabel}>Customer Phone</Text>
                  <TextInput
                    style={styles.inputField}
                    value={editCustomerPhone}
                    onChangeText={setEditCustomerPhone}
                    placeholder="Customer Phone"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.fieldLabel}>Notes / Reason for correction</Text>
                  <TextInput
                    style={[styles.inputField, { height: 60 }]}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Notes or correction details"
                    multiline
                  />

                  <View style={styles.editButtonsRow}>
                    <TouchableOpacity
                      style={styles.cancelEditBtn}
                      onPress={() => setIsEditing(false)}
                      disabled={isSavingEdit}
                    >
                      <Text style={styles.cancelEditText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveEditBtn}
                      onPress={handleSaveEdit}
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.saveEditText}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* View Details Mode */
                <View style={styles.viewSection}>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Sale Category</Text>
                      <Text style={styles.infoValueHighlight}>{selectedSale.sale_category}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Payment Method</Text>
                      <Text style={styles.infoValue}>
                        {selectedSale.payment_method.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Cashier</Text>
                      <Text style={styles.infoValue}>{selectedSale.cashier_name}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date & Time</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedSale.created_at).toLocaleString()}
                      </Text>
                    </View>
                    {selectedSale.customer_name && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Customer</Text>
                        <Text style={styles.infoValue}>
                          {selectedSale.customer_name}{' '}
                          {selectedSale.customer_phone ? `(${selectedSale.customer_phone})` : ''}
                        </Text>
                      </View>
                    )}
                    {selectedSale.notes && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Notes</Text>
                        <Text style={styles.infoValue}>{selectedSale.notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Sold Items Table */}
                  <Text style={styles.sectionHeader}>Purchased Dairy Products</Text>
                  <View style={styles.itemsTable}>
                    {selectedSale.items?.map((item, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{item.product_name}</Text>
                          <Text style={styles.itemSub}>
                            {item.quantity} {item.unit || 'units'} × {item.unit_price} ETB
                          </Text>
                        </View>
                        <Text style={styles.itemSubtotal}>
                          {(item.subtotal || item.quantity * item.unit_price).toLocaleString()} ETB
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Grand Total */}
                  <View style={styles.grandTotalBox}>
                    <Text style={styles.grandTotalLabel}>Total Amount Paid</Text>
                    <Text style={styles.grandTotalValue}>
                      {Number(selectedSale.total_amount).toLocaleString()} ETB
                    </Text>
                  </View>

                  {/* Finance Authorization Card */}
                  <View
                    style={[
                      styles.financeCard,
                      selectedSale.is_finance_verified
                        ? styles.financeCardVerified
                        : styles.financeCardPending,
                    ]}
                  >
                    <View style={styles.financeCardHeader}>
                      <Ionicons
                        name={selectedSale.is_finance_verified ? 'shield-checkmark' : 'time-outline'}
                        size={20}
                        color={selectedSale.is_finance_verified ? '#047857' : '#b45309'}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text
                          style={[
                            styles.financeCardTitle,
                            { color: selectedSale.is_finance_verified ? '#047857' : '#b45309' },
                          ]}
                        >
                          {selectedSale.is_finance_verified
                            ? 'Finance Verified'
                            : 'Pending Finance Authorization'}
                        </Text>
                        <Text style={styles.financeCardSub}>
                          {selectedSale.is_finance_verified
                            ? `Authorized by ${selectedSale.finance_verified_by_name || 'Finance'}`
                            : 'Finance has not yet authorized payment receipt.'}
                        </Text>
                      </View>
                    </View>

                    {canVerifyFinance && (
                      <TouchableOpacity
                        style={[
                          styles.financeActionBtn,
                          selectedSale.is_finance_verified
                            ? styles.financeRevokeBtn
                            : styles.financeVerifyBtn,
                        ]}
                        onPress={handleToggleFinanceVerify}
                        disabled={isVerifyingFinance}
                      >
                        {isVerifyingFinance ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text
                            style={[
                              styles.financeActionBtnText,
                              selectedSale.is_finance_verified ? { color: '#991b1b' } : undefined,
                            ]}
                          >
                            {selectedSale.is_finance_verified
                              ? 'Revoke Verification'
                              : 'Verify Cash Received'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Manager Edit Button */}
                  {canEdit && (
                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={() => setIsEditing(true)}
                    >
                      <Ionicons name="create-outline" size={18} color="#ffffff" />
                      <Text style={styles.editActionBtnText}>Edit Sale (Manager Role)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
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
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    borderRadius: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  searchBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  dateToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  dateToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  dateToggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dateToggleTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  catChipActive: {
    backgroundColor: '#047857',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  catChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  summaryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  summaryTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
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
    padding: 12,
    paddingBottom: 40,
    gap: 10,
  },
  saleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  receiptNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  saleDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#047857',
  },
  payBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  payBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
  },
  customerText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    marginLeft: 8,
  },
  customerWalkIn: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
    marginLeft: 8,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editHintText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  viewSection: {
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  itemsTable: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  itemSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  grandTotalBox: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#065f46',
  },
  editActionBtn: {
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  editActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Edit Section
  editSection: {
    paddingBottom: 40,
  },
  managerNotice: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  managerNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065f46',
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryOptionActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  categoryOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  categoryOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  payOptions: {
    flexDirection: 'row',
    gap: 6,
  },
  payOption: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    alignItems: 'center',
  },
  payOptionActive: {
    backgroundColor: '#047857',
  },
  payOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  payOptionTextActive: {
    color: '#ffffff',
  },
  inputField: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelEditBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  saveEditBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#047857',
  },
  saveEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardItemsSummary: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  financeVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 3,
  },
  financeVerifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  financePendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 3,
  },
  financePendingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
  },
  financeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  financeCardVerified: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  financeCardPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  financeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  financeCardTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  financeCardSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  financeActionBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeVerifyBtn: {
    backgroundColor: '#047857',
  },
  financeRevokeBtn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  financeActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});

