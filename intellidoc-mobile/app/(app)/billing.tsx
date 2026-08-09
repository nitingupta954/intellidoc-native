import React, { useEffect, useState } from 'react';
import Text from '../../src/components/Text';
import { View, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../../src/theme/colors';
import api from '../../src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Wallet {
  balance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  isBYOK: boolean;
}

interface PaymentRecord {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  createdAt: string;
}

const CREDIT_PACKS = {
  starter: { id: "starter", credits: 100_000, priceInr: 199 },
  growth: { id: "growth", credits: 500_000, priceInr: 799 },
  scale: { id: "scale", credits: 2_000_000, priceInr: 2499 },
} as const;

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  SUCCESS: { icon: 'check-circle', color: '#34d399', label: 'Success' },
  COMPLETED: { icon: 'check-circle', color: '#34d399', label: 'Success' },
  PENDING: { icon: 'clock', color: '#fbbf24', label: 'Pending' },
  FAILED: { icon: 'x-circle', color: '#f87171', label: 'Failed' },
  REFUNDED: { icon: 'file-text', color: '#60a5fa', label: 'Refunded' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BillingScreen() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletRes, paymentsRes] = await Promise.all([
        api.get('/api/wallet'),
        api.get('/api/payments/history')
      ]);
      setWallet(walletRes.data);
      setPayments(paymentsRes.data.payments || []);
    } catch (e) {
      console.error(e);
      // Fail silently or show minimal error in console for now
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Order ID copied to clipboard', [{ text: 'OK' }]);
  };

  const handlePurchase = (packId: string) => {
    Alert.alert(
      'Payment Setup Required',
      `Native Razorpay integration is required to complete the purchase of the ${packId} pack.`
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const usagePercentage = wallet 
    ? wallet.lifetimeGranted > 0 
      ? Math.min(100, Math.max(0, (wallet.lifetimeSpent / wallet.lifetimeGranted) * 100))
      : 0
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Billing & Plans</Text>
          <Text style={styles.subtitle}>Manage your subscription and view payment history.</Text>
        </View>

        {wallet?.isBYOK ? (
          <View style={styles.byokContainer}>
            <Text style={styles.byokTitle}>BYOK Mode Active</Text>
            <Text style={styles.byokDesc}>
              You are using your own API key. Your requests are not metered and you do not need to purchase AI credits.
            </Text>
          </View>
        ) : (
          <View style={styles.walletSection}>
            <View style={styles.cardsRow}>
              {/* Current Balance Card */}
              <View style={styles.walletCard}>
                <View style={styles.cardHeaderRow}>
                  <Feather name="credit-card" size={16} color={Colors.primary} />
                  <Text style={styles.cardTitle}>Current Balance</Text>
                </View>
                <Text style={styles.cardSubtitle}>Your remaining AI credits</Text>
                <Text style={styles.balanceValue}>
                  {wallet?.balance.toLocaleString() || '0'}
                </Text>
              </View>

              {/* Usage Metrics Card */}
              <View style={styles.walletCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>Usage Metrics</Text>
                </View>
                <Text style={styles.cardSubtitle}>Track your lifetime usage</Text>
                
                <View style={styles.usageContainer}>
                  <View style={styles.usageRow}>
                    <Text style={styles.usageLabel}>Lifetime Usage</Text>
                    <Text style={styles.usageValues}>
                      {wallet?.lifetimeSpent.toLocaleString() || '0'} / {wallet?.lifetimeGranted.toLocaleString() || '0'} Credits
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${usagePercentage}%` }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Refill Credits */}
            <View style={styles.refillSection}>
              <Text style={styles.sectionHeading}>Refill Credits</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packsRow}>
                {Object.values(CREDIT_PACKS).map((pack) => (
                  <View key={pack.id} style={styles.packCard}>
                    <View style={styles.packHeader}>
                      <View style={styles.packTitleRow}>
                        <Feather name="zap" size={14} color={Colors.primary} />
                        <Text style={styles.packTitle}>{pack.id.charAt(0).toUpperCase() + pack.id.slice(1)} Pack</Text>
                      </View>
                      <Text style={styles.packSubtitle}>Instant credit refill</Text>
                    </View>
                    
                    <View style={styles.packBody}>
                      <Text style={styles.packPrice}>₹{pack.priceInr}</Text>
                      <Text style={styles.packCredits}>{pack.credits.toLocaleString()} Credits</Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.buyButton} 
                      onPress={() => handlePurchase(pack.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Payment History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleRow}>
              <Feather name="credit-card" size={18} color={Colors.primary} />
              <Text style={styles.sectionHeading}>Payment History</Text>
            </View>
            <View style={styles.historyCountBadge}>
              <Text style={styles.historyCountText}>{payments.length} transaction{payments.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Feather name="file-text" size={32} color={Colors.textSecondary} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No payments yet.</Text>
              <Text style={styles.emptyDesc}>Refill your AI credits to see transactions here.</Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {payments.map((p, idx) => {
                const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING;
                return (
                  <View key={p.id} style={[styles.historyItem, idx === payments.length - 1 && styles.historyItemLast]}>
                    <View style={styles.historyRowMain}>
                      <View>
                        <Text style={styles.historyDate}>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </Text>
                        <View style={styles.historyPlanBadge}>
                          <Text style={styles.historyPlanText}>{p.plan}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.historyAmount}>₹{(p.amount / 100).toLocaleString('en-IN')}</Text>
                        <View style={styles.statusRow}>
                          <Feather name={cfg.icon} size={12} color={cfg.color} />
                          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.orderIdRow}>
                      <Text style={styles.orderIdText}>{p.razorpayOrderId}</Text>
                      <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(p.razorpayOrderId)}>
                        <Feather name="copy" size={12} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.bgDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.bgDark,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  
  // BYOK State
  byokContainer: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  byokTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  byokDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Wallet Section
  walletSection: {
    marginBottom: 24,
  },
  cardsRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  walletCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },

  // Token Meter
  usageContainer: {
    marginTop: 8,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  usageValues: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
  },

  // Refill Credits
  refillSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  packsRow: {
    gap: 12,
    paddingRight: 16,
  },
  packCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 220,
    padding: 16,
    justifyContent: 'space-between',
  },
  packHeader: {
    marginBottom: 16,
  },
  packTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  packSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  packBody: {
    marginBottom: 20,
  },
  packPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  packCredits: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  buyButton: {
    backgroundColor: Colors.primaryDark,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Payment History
  historySection: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyCountBadge: {
    backgroundColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyCountText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptyHistory: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  emptyDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  historyList: {
    paddingHorizontal: 16,
  },
  historyItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  historyRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  historyPlanBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyPlanText: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.primaryLight,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: Colors.textSecondary,
  },
  copyBtn: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
});
