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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, Sale } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash', icon: 'cash-outline', color: '#10b981' },
  { id: 'TELEBIRR', label: 'Telebirr', icon: 'phone-portrait-outline', color: '#0ea5e9' },
  { id: 'BANK_TRANSFER', label: 'CBE Bank', icon: 'card-outline', color: '#8b5cf6' },
  { id: 'CREDIT', label: 'Credit', icon: 'wallet-outline', color: '#f59e0b' },
];

const getProductPrice = (p?: Product | null): number => {
  if (!p) return 0;
  return Number(p.unit_price ?? p.selling_price ?? 0);
};

const getProductMinStock = (p?: Product | null): number => {
  if (!p) return 0;
  return Number(p.min_stock_level ?? p.min_threshold ?? 0);
};

export const POSScreen: React.FC<{ onCartCountChange?: (count: number) => void }> = ({
  onCartCountChange,
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [cart, setCart] = useState<Record<number, CartItem>>({});

  // Quick Custom Quantity & Flexible Price Modal
  const [bulkQtyModalVisible, setBulkQtyModalVisible] = useState<boolean>(false);
  const [bulkQtyProduct, setBulkQtyProduct] = useState<Product | null>(null);
  const [bulkQtyInput, setBulkQtyInput] = useState<string>('');
  const [bulkPriceInput, setBulkPriceInput] = useState<string>('');

  // Checkout Sheet State
  const [checkoutVisible, setCheckoutVisible] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [showCustomerFields, setShowCustomerFields] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Receipt State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const totalCartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = Object.values(cart).reduce(
    (sum, item) => sum + item.quantity * (item.unit_price ?? getProductPrice(item.product)),
    0
  );

  useEffect(() => {
    onCartCountChange?.(totalCartCount);
  }, [totalCartCount]);

  // Fast Cart Operations
  const addToCart = (product: Product, qtyToAdd = 1) => {
    if (product.current_stock <= 0) {
      Alert.alert('Out of Stock', `${product.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev[product.id];
      const currentQty = existing?.quantity || 0;
      const targetQty = currentQty + qtyToAdd;

      if (targetQty > product.current_stock) {
        Alert.alert(
          'Stock Limit Reached',
          `Only ${product.current_stock} ${product.unit} available in current physical stock.`
        );
        return prev;
      }

      return {
        ...prev,
        [product.id]: {
          product,
          quantity: targetQty,
          unit_price: existing?.unit_price ?? getProductPrice(product),
        },
      };
    });
  };

  const updateCartQty = (productId: number, delta: number) => {
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      const newQty = Math.round((item.quantity + delta) * 100) / 100;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      if (newQty > item.product.current_stock) {
        Alert.alert(
          'Stock Limit Reached',
          `Cannot exceed physical inventory (${item.product.current_stock} ${item.product.unit}).`
        );
        return prev;
      }
      return {
        ...prev,
        [productId]: {
          ...item,
          quantity: newQty,
        },
      };
    });
  };

  const setExplicitQtyAndPrice = (productId: number, exactQty: number, exactPrice?: number) => {
    if (exactQty <= 0) {
      setCart((prev) => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    if (exactQty > prod.current_stock) {
      Alert.alert(
        'Stock Exceeded',
        `Physical stock has ${prod.current_stock} ${prod.unit}. Setting to max available.`
      );
      exactQty = prod.current_stock;
    }

    setCart((prev) => ({
      ...prev,
      [productId]: {
        product: prod,
        quantity: exactQty,
        unit_price:
          exactPrice !== undefined
            ? exactPrice
            : prev[productId]?.unit_price ?? getProductPrice(prod),
      },
    }));
  };

  const updateCartItemPrice = (productId: number, priceStr: string) => {
    const numPrice = parseFloat(priceStr);
    setCart((prev) => {
      const item = prev[productId];
      if (!item) return prev;
      return {
        ...prev,
        [productId]: {
          ...item,
          unit_price: isNaN(numPrice) || numPrice < 0 ? 0 : numPrice,
        },
      };
    });
  };

  const handleClearCart = () => {
    if (totalCartCount === 0) return;
    Alert.alert('Clear Cart?', 'Are you sure you want to remove all items from the current order?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => setCart({}) },
    ]);
  };

  // Open Bulk Quantity & Flexible Price Dialog
  const openBulkQtyModal = (product: Product) => {
    setBulkQtyProduct(product);
    const existing = cart[product.id];
    const existingQty = existing?.quantity || 1;
    const existingPrice = existing?.unit_price ?? getProductPrice(product);
    setBulkQtyInput(existingQty.toString());
    setBulkPriceInput(existingPrice.toString());
    setBulkQtyModalVisible(true);
  };

  const handleBulkQtyConfirm = () => {
    if (!bulkQtyProduct) return;
    const qty = parseFloat(bulkQtyInput);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid positive number.');
      return;
    }
    const price = parseFloat(bulkPriceInput);
    if (isNaN(price) || price < 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price (or 0).');
      return;
    }
    setExplicitQtyAndPrice(bulkQtyProduct.id, qty, price);
    setBulkQtyModalVisible(false);
  };

  // Checkout Submission
  const handleCheckoutSubmit = async () => {
    const items = Object.values(cart).map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
      unit_price: Number(item.unit_price) || getProductPrice(item.product),
    }));

    if (items.length === 0) {
      Alert.alert('Cart is Empty', 'Please tap a dairy product to add it to the sale.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.createSale({
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
        sale_category: 'Daily Sales', // Automatically recorded, no manual shift selection required
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
        items,
      });

      // Clear & show success receipt
      setCart({});
      setCheckoutVisible(false);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setCashTendered('');
      setCompletedSale(res.sale);

      // Refresh stock levels
      fetchProducts();
    } catch (err: any) {
      Alert.alert('Sale Recording Failed', err.message || 'Could not record sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cash change calculation
  const cashNum = parseFloat(cashTendered);
  const changeToGive = !isNaN(cashNum) && cashNum >= totalCartAmount ? cashNum - totalCartAmount : null;

  // Filter products
  const categoriesList = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const workerName = user?.full_name || user?.name || 'Staff';

  return (
    <View style={styles.container}>
      {/* 1. Worker Identity Strip */}
      <View style={styles.workerStrip}>
        <View style={styles.workerLeft}>
          <View style={styles.workerDot} />
          <Text style={styles.workerTitle}>
            Staff Terminal: <Text style={styles.workerNameHighlight}>{workerName}</Text>
          </Text>
        </View>
        <Text style={styles.roleTag}>{(user?.role || 'Staff').toUpperCase()}</Text>
      </View>

      {/* 2. Search & Category Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search milk, yogurt, butter, SKU..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Product Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Dairy Catalog Grid */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#047857" />
          <Text style={styles.loadingMessage}>Loading dairy items...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="nutrition-outline" size={54} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Dairy Products Found</Text>
          <Text style={styles.emptySub}>Try searching another product name or category</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => {
            const inCartQty = cart[item.id]?.quantity || 0;
            const isOutOfStock = item.current_stock <= 0;
            const minStock = getProductMinStock(item);
            const isLowStock = item.current_stock <= minStock && !isOutOfStock;
            const price = getProductPrice(item);

            return (
              <View
                style={[
                  styles.itemCard,
                  isOutOfStock && styles.itemCardOut,
                  inCartQty > 0 && styles.itemCardActive,
                ]}
              >
                {/* Top Badge Row */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardCategory}>{item.category}</Text>
                  {inCartQty > 0 ? (
                    <View style={styles.activeCartPill}>
                      <Text style={styles.activeCartPillText}>{inCartQty} in cart</Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.stockDot,
                        {
                          backgroundColor: isOutOfStock
                            ? '#ef4444'
                            : isLowStock
                            ? '#f59e0b'
                            : '#10b981',
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Product Name */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>

                {/* Price & Unit & Flexible Price indicator */}
                <TouchableOpacity
                  style={styles.priceContainer}
                  onPress={() => (inCartQty > 0 ? openBulkQtyModal(item) : addToCart(item, 1))}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={styles.cardPrice}>
                      {inCartQty > 0 && cart[item.id]?.unit_price !== undefined
                        ? cart[item.id].unit_price.toLocaleString()
                        : price.toLocaleString()}
                    </Text>
                    <Text style={styles.cardUnit}> ETB/{item.unit}</Text>
                  </View>
                  {inCartQty > 0 && cart[item.id]?.unit_price !== price && (
                    <View style={styles.customPriceBadge}>
                      <Text style={styles.customPriceBadgeText}>Custom Price</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Stock on Hand */}
                <Text
                  style={[
                    styles.cardStock,
                    isOutOfStock
                      ? styles.stockOutText
                      : isLowStock
                      ? styles.stockLowText
                      : styles.stockGoodText,
                  ]}
                >
                  {isOutOfStock
                    ? '⛔ Out of Stock'
                    : isLowStock
                    ? `⚠️ ${item.current_stock} ${item.unit} left`
                    : `✓ ${item.current_stock} ${item.unit} available`}
                </Text>

                {/* Action Steppers */}
                {isOutOfStock ? (
                  <View style={styles.soldOutBtn}>
                    <Text style={styles.soldOutText}>Unavailable</Text>
                  </View>
                ) : inCartQty === 0 ? (
                  <TouchableOpacity
                    style={styles.addInitialBtn}
                    onPress={() => addToCart(item, 1)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color="#ffffff" />
                    <Text style={styles.addInitialText}>Add to Sale</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.stepperContainer}>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity
                        style={styles.stepBtnMinus}
                        onPress={() => updateCartQty(item.id, -1)}
                      >
                        <Ionicons name="remove" size={18} color="#dc2626" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.stepQtyBox}
                        onPress={() => openBulkQtyModal(item)}
                      >
                        <Text style={styles.stepQtyText}>{inCartQty}</Text>
                        <Text style={styles.stepQtyHint}>{item.unit}</Text>
                        <Ionicons name="create-outline" size={11} color="#047857" style={{ marginTop: 1 }} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.stepBtnPlus}
                        onPress={() => updateCartQty(item.id, 1)}
                      >
                        <Ionicons name="add" size={18} color="#047857" />
                      </TouchableOpacity>
                    </View>

                    {/* Quick +5 Bulk Add Button */}
                    <TouchableOpacity
                      style={styles.quickBulkAddBtn}
                      onPress={() => addToCart(item, 5)}
                    >
                      <Text style={styles.quickBulkAddText}>+5 {item.unit}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* 4. Prominent Persistent Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <View style={styles.floatingCheckoutBar}>
          <TouchableOpacity
            style={styles.clearCartIconBtn}
            onPress={handleClearCart}
          >
            <Ionicons name="trash-outline" size={20} color="#f87171" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartInfoArea}
            onPress={() => setCheckoutVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cartCountPillBig}>
              <Text style={styles.cartCountTextBig}>{totalCartCount}</Text>
            </View>
            <View>
              <Text style={styles.cartBarLabel}>
                Seller: {workerName.split(' ')[0]}
              </Text>
              <Text style={styles.cartBarTotal}>
                {totalCartAmount.toLocaleString()} ETB
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mainChargeBtn}
            onPress={() => setCheckoutVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.mainChargeBtnText}>Charge</Text>
            <Ionicons name="arrow-forward" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* 5. Custom Quantity & Flexible Price Modal */}
      <Modal visible={bulkQtyModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={styles.bulkQtyCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.bulkQtyTitle}>
                {bulkQtyProduct?.name}
              </Text>
              <TouchableOpacity onPress={() => setBulkQtyModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.bulkQtySub}>
              Available stock: {bulkQtyProduct?.current_stock} {bulkQtyProduct?.unit} • Catalog: {getProductPrice(bulkQtyProduct)} ETB/{bulkQtyProduct?.unit}
            </Text>

            {/* Quantity Input */}
            <Text style={styles.bulkInputLabel}>Quantity ({bulkQtyProduct?.unit}):</Text>
            <TextInput
              style={styles.bulkQtyInput}
              value={bulkQtyInput}
              onChangeText={setBulkQtyInput}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              placeholder="1"
            />

            {/* Quick Preset Buttons for Qty */}
            <View style={styles.bulkPresetsRow}>
              {[1, 5, 10, 20, 50].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.bulkPresetBtn}
                  onPress={() => setBulkQtyInput(preset.toString())}
                >
                  <Text style={styles.bulkPresetBtnText}>+{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Flexible Selling Price */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Text style={styles.bulkInputLabel}>Flexible Price (ETB/{bulkQtyProduct?.unit}):</Text>
              <TouchableOpacity
                onPress={() => setBulkPriceInput(String(getProductPrice(bulkQtyProduct)))}
                style={styles.resetPriceBtn}
              >
                <Text style={styles.resetPriceBtnText}>Reset ({getProductPrice(bulkQtyProduct)})</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.bulkPriceInput}
              value={bulkPriceInput}
              onChangeText={setBulkPriceInput}
              keyboardType="decimal-pad"
              selectTextOnFocus
              placeholder="0"
            />

            {/* Estimated Total Calculation Preview */}
            <View style={styles.calcPreviewBox}>
              <Text style={styles.calcPreviewLabel}>Item Total:</Text>
              <Text style={styles.calcPreviewValue}>
                {(
                  (parseFloat(bulkQtyInput) || 0) * (parseFloat(bulkPriceInput) || 0)
                ).toLocaleString()}{' '}
                ETB
              </Text>
            </View>

            <View style={styles.bulkModalActions}>
              <TouchableOpacity
                style={styles.bulkCancelBtn}
                onPress={() => setBulkQtyModalVisible(false)}
              >
                <Text style={styles.bulkCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bulkConfirmBtn}
                onPress={handleBulkQtyConfirm}
              >
                <Text style={styles.bulkConfirmBtnText}>Apply & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 6. Comprehensive User-Friendly Checkout Sheet */}
      <Modal visible={checkoutVisible} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Review & Confirm Sale</Text>
              <Text style={styles.sheetSubtitle}>
                Cashier: {workerName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setCheckoutVisible(false)}
              style={styles.sheetCloseBtn}
            >
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {/* Items Summary Table with Flexible Price */}
            <Text style={styles.sheetSectionHeading}>
              Selected Dairy Items ({totalCartCount})
            </Text>
            <View style={styles.sheetItemList}>
              {Object.values(cart).map((item) => {
                const itemPrice = item.unit_price ?? getProductPrice(item.product);
                const subtotal = item.quantity * itemPrice;
                const isCustomPrice = itemPrice !== getProductPrice(item.product);
                return (
                  <View key={item.product.id} style={styles.sheetItemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.sheetItemName}>{item.product.name}</Text>
                      <View style={styles.sheetPriceRow}>
                        <Text style={styles.sheetPriceLabel}>Price:</Text>
                        <TextInput
                          style={styles.sheetPriceInlineInput}
                          value={String(item.unit_price)}
                          onChangeText={(val) => updateCartItemPrice(item.product.id, val)}
                          keyboardType="decimal-pad"
                          selectTextOnFocus
                        />
                        <Text style={styles.sheetPriceUnit}>ETB/{item.product.unit}</Text>
                        {isCustomPrice && (
                          <View style={styles.sheetCustomPriceChip}>
                            <Text style={styles.sheetCustomPriceChipText}>Custom</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.sheetItemSubtotal}>
                        {subtotal.toLocaleString()} ETB
                      </Text>

                      <View style={styles.sheetMiniStepper}>
                        <TouchableOpacity
                          style={styles.sheetMiniBtn}
                          onPress={() => updateCartQty(item.product.id, -1)}
                        >
                          <Ionicons name="remove" size={14} color="#334155" />
                        </TouchableOpacity>
                        <Text style={styles.sheetMiniQty}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.sheetMiniBtn}
                          onPress={() => updateCartQty(item.product.id, 1)}
                        >
                          <Ionicons name="add" size={14} color="#334155" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Total Highlight Box */}
            <View style={styles.grandTotalBanner}>
              <View>
                <Text style={styles.grandTotalLabel}>TOTAL AMOUNT DUE</Text>
                <Text style={styles.grandTotalValue}>
                  {totalCartAmount.toLocaleString()} ETB
                </Text>
              </View>
              <Ionicons name="checkmark-done-circle" size={36} color="#047857" />
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.sheetSectionHeading}>Payment Method *</Text>
            <View style={styles.paymentMethodGrid}>
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <TouchableOpacity
                    key={method.id}
                    style={[
                      styles.paymentMethodCard,
                      isSelected && styles.paymentMethodCardActive,
                    ]}
                    onPress={() => setPaymentMethod(method.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={22}
                      color={isSelected ? '#047857' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.paymentMethodLabel,
                        isSelected && styles.paymentMethodLabelActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.paymentActiveIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Cash Tendered & Change Calculator (Highly convenient for cashier) */}
            {(paymentMethod === 'CASH' || paymentMethod === 'cash') && (
              <View style={styles.cashCalculatorBox}>
                <Text style={styles.calcTitle}>💵 Cash Tendered & Change Calculator</Text>
                <View style={styles.calcInputRow}>
                  <TextInput
                    style={styles.calcInput}
                    placeholder="Enter cash received (e.g., 500, 1000)"
                    value={cashTendered}
                    onChangeText={setCashTendered}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.calcExactBtn}
                    onPress={() => setCashTendered(totalCartAmount.toString())}
                  >
                    <Text style={styles.calcExactBtnText}>Exact Cash</Text>
                  </TouchableOpacity>
                </View>

                {/* Change result */}
                {changeToGive !== null && (
                  <View style={styles.changeResultBox}>
                    <Text style={styles.changeResultLabel}>Change to Return to Customer:</Text>
                    <Text style={styles.changeResultAmount}>
                      {changeToGive.toLocaleString()} ETB
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Optional Customer Information */}
            <TouchableOpacity
              style={styles.toggleCustomerBtn}
              onPress={() => setShowCustomerFields(!showCustomerFields)}
            >
              <Ionicons
                name={showCustomerFields ? 'chevron-down' : 'chevron-forward'}
                size={16}
                color="#047857"
              />
              <Text style={styles.toggleCustomerText}>
                {showCustomerFields
                  ? 'Hide Customer Details'
                  : '+ Add Customer / Delivery Info (Optional)'}
              </Text>
            </TouchableOpacity>

            {showCustomerFields && (
              <View style={styles.customerFieldsGroup}>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="Customer Name (e.g., Ato Girma, Bole Cafe)"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
                <TextInput
                  style={styles.sheetInput}
                  placeholder="Customer Phone (e.g., 0911223344)"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.sheetInput, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Order notes, delivery destination..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            )}
          </ScrollView>

          {/* Complete Button Footer */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.completeSaleBtn}
              onPress={handleCheckoutSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                  <Text style={styles.completeSaleBtnText}>
                    Confirm & Record Sale ({totalCartAmount.toLocaleString()} ETB)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 7. Official Receipt Modal */}
      <Modal visible={!!completedSale} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptSuccessIcon}>
              <Ionicons name="checkmark" size={36} color="#ffffff" />
            </View>
            <Text style={styles.receiptSuccessHeading}>Sale Successfully Recorded!</Text>
            <Text style={styles.receiptCompany}>Bani Milk Dairy Management</Text>

            {completedSale && (
              <View style={styles.receiptDetailsCard}>
                <View style={styles.receiptDataRow}>
                  <Text style={styles.receiptDataLabel}>Receipt Number</Text>
                  <Text style={styles.receiptDataCode}>
                    {completedSale.receipt_number || (completedSale as any).sale_code}
                  </Text>
                </View>
                <View style={styles.receiptDataRow}>
                  <Text style={styles.receiptDataLabel}>Recorded by</Text>
                  <Text style={styles.receiptDataVal}>{workerName}</Text>
                </View>
                <View style={styles.receiptDataRow}>
                  <Text style={styles.receiptDataLabel}>Payment Method</Text>
                  <Text style={styles.receiptDataVal}>
                    {completedSale.payment_method.toUpperCase()}
                  </Text>
                </View>
                {completedSale.customer_name && completedSale.customer_name !== 'Walk-in Customer' && (
                  <View style={styles.receiptDataRow}>
                    <Text style={styles.receiptDataLabel}>Customer</Text>
                    <Text style={styles.receiptDataVal}>{completedSale.customer_name}</Text>
                  </View>
                )}
                <View style={[styles.receiptDataRow, styles.receiptTotalLine]}>
                  <Text style={styles.receiptTotalLineLabel}>Amount Collected</Text>
                  <Text style={styles.receiptTotalLineAmount}>
                    {Number(completedSale.total_amount).toLocaleString()} ETB
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.nextCustomerBtn}
              onPress={() => setCompletedSale(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.nextCustomerBtnText}>Serve Next Customer</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
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
  // Worker Identity Strip
  workerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  workerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  workerTitle: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  workerNameHighlight: {
    fontWeight: '800',
    color: '#0f172a',
  },
  roleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#ecfdf5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  // Search & Categories
  searchSection: {
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  clearSearchBtn: {
    padding: 2,
  },
  categoryScroll: {
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  // Center Box
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMessage: {
    marginTop: 10,
    fontSize: 14,
    color: '#64748b',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  // Grid
  gridContent: {
    padding: 12,
    paddingBottom: 110,
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  itemCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'space-between',
  },
  itemCardActive: {
    borderColor: '#047857',
    backgroundColor: '#f0fdf4',
  },
  itemCardOut: {
    opacity: 0.55,
    backgroundColor: '#f8fafc',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  activeCartPill: {
    backgroundColor: '#047857',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeCartPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    minHeight: 38,
    lineHeight: 19,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#047857',
  },
  cardUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 3,
  },
  cardStock: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 10,
  },
  stockGoodText: {
    color: '#059669',
  },
  stockLowText: {
    color: '#d97706',
  },
  stockOutText: {
    color: '#dc2626',
  },
  soldOutBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  soldOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  addInitialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  addInitialText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepperContainer: {
    gap: 6,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#047857',
    padding: 2,
  },
  stepBtnMinus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQtyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQtyText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  stepQtyHint: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  stepBtnPlus: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBulkAddBtn: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  quickBulkAddText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  // Floating Bottom Bar
  floatingCheckoutBar: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  clearCartIconBtn: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    marginRight: 6,
  },
  cartInfoArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartCountPillBig: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountTextBig: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  cartBarLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  cartBarTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ffffff',
  },
  mainChargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 6,
  },
  mainChargeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  // Bulk Qty Card
  bulkQtyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
  },
  bulkQtyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  bulkQtySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  bulkQtyInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#047857',
    borderRadius: 14,
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  bulkPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  bulkPresetBtn: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bulkPresetBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  bulkInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  bulkPriceInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#0284c7',
    borderRadius: 14,
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  resetPriceBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  resetPriceBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  calcPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  calcPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  calcPreviewValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  customPriceBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: '#fde68a',
  },
  customPriceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#b45309',
  },
  sheetPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  sheetPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sheetPriceInlineInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    minWidth: 54,
    textAlign: 'center',
  },
  sheetPriceUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  sheetCustomPriceChip: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#fde68a',
  },
  sheetCustomPriceChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#b45309',
  },
  bulkModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  bulkCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  bulkCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  bulkConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#047857',
  },
  bulkConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  // Sheet
  sheetContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0f172a',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  sheetScroll: {
    flex: 1,
    padding: 18,
  },
  sheetSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  sheetItemList: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  sheetItemCalc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  sheetItemSubtotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
    marginRight: 10,
  },
  sheetMiniStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  sheetMiniBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetMiniQty: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 6,
  },
  grandTotalBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#a7f3d0',
    marginTop: 16,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065f46',
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#065f46',
    marginTop: 2,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 4,
    position: 'relative',
  },
  paymentMethodCardActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#047857',
  },
  paymentMethodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  paymentMethodLabelActive: {
    color: '#047857',
    fontWeight: '800',
  },
  paymentActiveIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#047857',
  },
  // Cash Calculator
  cashCalculatorBox: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 14,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 8,
  },
  calcInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calcInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  calcExactBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  calcExactBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  changeResultBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  changeResultLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  changeResultAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#166534',
  },
  toggleCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
  },
  toggleCustomerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  customerFieldsGroup: {
    gap: 10,
    marginBottom: 20,
  },
  sheetInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  sheetFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  completeSaleBtn: {
    backgroundColor: '#047857',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  completeSaleBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  // Receipt
  receiptContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  receiptSuccessIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  receiptSuccessHeading: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  receiptCompany: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  receiptDetailsCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 20,
  },
  receiptDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptDataLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  receiptDataCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
  },
  receiptDataVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  receiptTotalLine: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 4,
  },
  receiptTotalLineLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  receiptTotalLineAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: '#047857',
  },
  nextCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#047857',
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    gap: 8,
  },
  nextCustomerBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
