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
import { Product } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const getProductPrice = (p?: Product | null): number => {
  if (!p) return 0;
  return Number(p.unit_price ?? p.selling_price ?? 0);
};

const getProductMinStock = (p?: Product | null): number => {
  if (!p) return 0;
  return Number(p.min_stock_level ?? p.min_threshold ?? 0);
};

export const StockScreen: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Stock-In Modal State
  const [stockInVisible, setStockInVisible] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockInQty, setStockInQty] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [supplier, setSupplier] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenStockIn = (prod?: Product) => {
    if (prod) {
      setSelectedProduct(prod);
      setUnitCost((prod.unit_cost || 0).toString());
    } else if (products.length > 0) {
      setSelectedProduct(products[0]);
      setUnitCost((products[0].unit_cost || 0).toString());
    }
    setStockInQty('');
    setSupplier('Dairy Farm Milking & Production');
    setNotes('');
    setStockInVisible(true);
  };

  const handleStockInSubmit = async () => {
    if (!selectedProduct) {
      Alert.alert('Required', 'Please select a dairy product.');
      return;
    }
    const qty = parseFloat(stockInQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive quantity.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.stockIn({
        product_id: selectedProduct.id,
        quantity: qty,
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', `Added +${qty} ${selectedProduct.unit} to ${selectedProduct.name} stock.`);
      setStockInVisible(false);
      fetchProducts();
    } catch (err: any) {
      Alert.alert('Stock-In Failed', err.message || 'Could not record stock addition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const lowStockCount = products.filter((p) => p.current_stock <= getProductMinStock(p)).length;

  return (
    <View style={styles.container}>
      {/* Top Header Strip */}
      <View style={styles.topArea}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search product inventory..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.quickStockInBtn}
            onPress={() => handleOpenStockIn()}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.quickStockInText}>Stock-In</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.catChip,
                selectedCategory === c && styles.catChipActive,
              ]}
              onPress={() => setSelectedCategory(c)}
            >
              <Text
                style={[
                  styles.catChipText,
                  selectedCategory === c && styles.catChipTextActive,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Low Stock Alert Banner if any */}
        {lowStockCount > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={16} color="#b45309" />
            <Text style={styles.alertBannerText}>
              {lowStockCount} product(s) are below minimum safety threshold!
            </Text>
          </View>
        )}
      </View>

      {/* Product List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingText}>Fetching dairy stock levels...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="cube-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No inventory items found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchProducts();
              }}
              colors={['#047857']}
            />
          }
          renderItem={({ item }) => {
            const isOutOfStock = item.current_stock <= 0;
            const minStock = getProductMinStock(item);
            const isLowStock = item.current_stock <= minStock;

            return (
              <View style={styles.stockCard}>
                <View style={styles.stockCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryLabel}>{item.category}</Text>
                    <Text style={styles.productName}>{item.name}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isOutOfStock
                        ? styles.statusPillOut
                        : isLowStock
                        ? styles.statusPillLow
                        : styles.statusPillGood,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isOutOfStock
                          ? styles.statusPillTextOut
                          : isLowStock
                          ? styles.statusPillTextLow
                          : styles.statusPillTextGood,
                      ]}
                    >
                      {isOutOfStock
                        ? 'Out of Stock'
                        : isLowStock
                        ? 'Low Stock'
                        : 'Available'}
                    </Text>
                  </View>
                </View>

                {/* Stock metrics row */}
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Current Stock</Text>
                    <Text
                      style={[
                        styles.stockValue,
                        isOutOfStock
                          ? styles.stockValueOut
                          : isLowStock
                          ? styles.stockValueLow
                          : styles.stockValueGood,
                      ]}
                    >
                      {item.current_stock} {item.unit}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Selling Price</Text>
                    <Text style={styles.priceValue}>{getProductPrice(item).toLocaleString()} ETB</Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Safety Min</Text>
                    <Text style={styles.minValue}>{minStock} {item.unit}</Text>
                  </View>
                </View>

                {/* Quick Add Stock Action */}
                <TouchableOpacity
                  style={styles.addStockRowBtn}
                  onPress={() => handleOpenStockIn(item)}
                >
                  <Ionicons name="arrow-down-circle-outline" size={16} color="#047857" />
                  <Text style={styles.addStockRowBtnText}>+ Add Fresh Stock</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Stock-In Modal */}
      <Modal visible={stockInVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Quick Dairy Stock-In</Text>
                <Text style={styles.modalSubtitle}>Receive milk, butter, or yogurt batch</Text>
              </View>
              <TouchableOpacity
                onPress={() => setStockInVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Product Selector */}
              <Text style={styles.inputLabel}>Select Dairy Product *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productPickerScroll}
              >
                {products.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.productPickChip,
                        isSelected && styles.productPickChipActive,
                      ]}
                      onPress={() => {
                        setSelectedProduct(p);
                        setUnitCost(p.unit_cost.toString());
                      }}
                    >
                      <Text
                        style={[
                          styles.productPickText,
                          isSelected && styles.productPickTextActive,
                        ]}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Quantity */}
              <Text style={styles.inputLabel}>
                Quantity to Add ({selectedProduct?.unit || 'Units'}) *
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 50"
                value={stockInQty}
                onChangeText={setStockInQty}
                keyboardType="numeric"
              />

              {/* Unit Cost */}
              <Text style={styles.inputLabel}>Unit Cost ETB (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Cost per unit in ETB"
                value={unitCost}
                onChangeText={setUnitCost}
                keyboardType="numeric"
              />

              {/* Supplier / Origin */}
              <Text style={styles.inputLabel}>Supplier / Batch Source</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Morning Farm Milking, Cooperative"
                value={supplier}
                onChangeText={setSupplier}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                placeholder="Batch notes, tank number, fat content..."
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setStockInVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleStockInSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.modalSaveText}>Record Stock-In</Text>
                    </>
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
  topArea: {
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
  searchInputWrap: {
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
  quickStockInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  quickStockInText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    gap: 6,
  },
  alertBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
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
    gap: 12,
  },
  stockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stockCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillGood: {
    backgroundColor: '#ecfdf5',
  },
  statusPillLow: {
    backgroundColor: '#fef3c7',
  },
  statusPillOut: {
    backgroundColor: '#fee2e2',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextGood: {
    color: '#065f46',
  },
  statusPillTextLow: {
    color: '#92400e',
  },
  statusPillTextOut: {
    color: '#991b1b',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 2,
  },
  stockValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  stockValueGood: {
    color: '#047857',
  },
  stockValueLow: {
    color: '#d97706',
  },
  stockValueOut: {
    color: '#dc2626',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  minValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  addStockRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  addStockRowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
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
  productPickerScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  productPickChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productPickChipActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  productPickText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  productPickTextActive: {
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
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#047857',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

