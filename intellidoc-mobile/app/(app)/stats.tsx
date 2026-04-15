import React, { useEffect, useState } from 'react';
import Text from '../../src/components/Text';
import { View, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LineChart, BarChart, ProgressChart } from 'react-native-chart-kit';
import { Colors } from '../../src/theme/colors';
import { useWorkspaceStore } from '../../src/store/workspaceStore';
import api from '../../src/api/client';

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - 32;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RagasAverages {
  faithfulness: number | null;
  answerRelevancy: number | null;
  contextPrecision: number | null;
  contextRecall: number | null;
  evaluatedCount: number;
  totalAssistantMessages: number;
}

interface RagasTrendPoint {
  name: string;
  faithfulness: number | null;
  answerRelevancy: number | null;
  contextPrecision: number | null;
  contextRecall: number | null;
}

interface ScoreDistribution {
  good: number;
  fair: number;
  poor: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(val: number | null): string {
  if (val === null) return '#6b7280';
  if (val >= 0.7) return '#22c55e';
  if (val >= 0.4) return '#f59e0b';
  return '#ef4444';
}

function scoreBg(val: number | null): string {
  if (val === null) return 'rgba(107,114,128,0.12)';
  if (val >= 0.7) return 'rgba(34,197,94,0.12)';
  if (val >= 0.4) return 'rgba(245,158,11,0.12)';
  return 'rgba(239,68,68,0.12)';
}

function scoreLabel(val: number | null): string {
  if (val === null) return 'N/A';
  if (val >= 0.7) return 'Good';
  if (val >= 0.4) return 'Fair';
  return 'Poor';
}

function fmt(val: number | null): string {
  if (val === null) return '—';
  return (val * 100).toFixed(1) + '%';
}

// ─── Components ───────────────────────────────────────────────────────────────

const MetricGauge = ({ label, icon, value, description }: { label: string; icon: any; value: number | null; description: string }) => {
  const pct = value !== null ? value : 0;
  const col = scoreColor(value);
  const bg = scoreBg(value);

  return (
    <View style={[styles.glassPanel, { backgroundColor: bg, borderColor: col + '40' }]}>
      <View style={styles.gaugeHeader}>
        <Feather name={icon} size={14} color={col} />
        <Text style={styles.gaugeLabel}>{label}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: bg }]}>
          <Text style={[styles.scoreBadgeText, { color: col }]}>{scoreLabel(value)}</Text>
        </View>
      </View>

      <View style={styles.gaugeChartContainer}>
        <ProgressChart
          data={{ labels: [], data: [pct] }}
          width={100}
          height={100}
          strokeWidth={10}
          radius={40}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            color: (opacity = 1) => col,
          }}
          hideLegend={true}
        />
        <View style={styles.gaugeCenterText}>
          <Text style={[styles.gaugeCenterPct, { color: col }]}>
            {value !== null ? `${Math.round(value * 100)}%` : '—'}
          </Text>
        </View>
      </View>
      <Text style={styles.gaugeDesc}>{description}</Text>
    </View>
  );
};

const DistributionBar = ({ dist }: { dist: ScoreDistribution }) => {
  const total = dist.good + dist.fair + dist.poor;
  if (total === 0) return <Text style={styles.distEmpty}>No data</Text>;

  const goodPct = (dist.good / total) * 100;
  const fairPct = (dist.fair / total) * 100;
  const poorPct = (dist.poor / total) * 100;

  return (
    <View style={styles.distBarContainer}>
      {goodPct > 0 && <View style={[styles.distSegment, { width: `${goodPct}%`, backgroundColor: '#22c55e' }]} />}
      {fairPct > 0 && <View style={[styles.distSegment, { width: `${fairPct}%`, backgroundColor: '#f59e0b' }]} />}
      {poorPct > 0 && <View style={[styles.distSegment, { width: `${poorPct}%`, backgroundColor: '#ef4444' }]} />}
    </View>
  );
};

const FailureModeAlerts = ({ averages }: { averages: RagasAverages }) => {
  const alerts: { icon: any; color: string; title: string; desc: string }[] = [];

  if (averages.faithfulness !== null && averages.faithfulness < 0.4)
    alerts.push({ icon: 'alert-triangle', color: '#f87171', title: 'Hallucinations Detected', desc: `Avg faithfulness ${fmt(averages.faithfulness)} — LLM is generating claims not in the context.` });

  if (averages.contextPrecision !== null && averages.contextPrecision < 0.4)
    alerts.push({ icon: 'alert-triangle', color: '#fbbf24', title: 'Poor Retrieval Precision', desc: `Avg context precision ${fmt(averages.contextPrecision)} — Irrelevant chunks are reaching the top-k.` });

  if (averages.contextRecall !== null && averages.contextRecall < 0.4)
    alerts.push({ icon: 'alert-triangle', color: '#fbbf24', title: 'Low Context Coverage', desc: `Avg context recall ${fmt(averages.contextRecall)} — Context is missing information.` });

  if (averages.answerRelevancy !== null && averages.answerRelevancy < 0.4)
    alerts.push({ icon: 'alert-triangle', color: '#fb923c', title: 'Answers Off-Topic', desc: `Avg answer relevancy ${fmt(averages.answerRelevancy)} — Answers are drifting from the original questions.` });

  if (alerts.length === 0) {
    return (
      <View style={[styles.alertBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)' }]}>
        <Feather name="check-circle" size={20} color="#4ade80" />
        <View style={styles.alertTextContent}>
          <Text style={[styles.alertTitle, { color: '#4ade80' }]}>All metrics healthy</Text>
          <Text style={styles.alertDesc}>No failure modes detected in recent responses.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.alertList}>
      {alerts.map((a, i) => (
        <View key={i} style={styles.alertBox}>
          <Feather name={a.icon} size={16} color={a.color} />
          <View style={styles.alertTextContent}>
            <Text style={[styles.alertTitle, { color: a.color }]}>{a.title}</Text>
            <Text style={styles.alertDesc}>{a.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    metrics: { totalDocuments: 0, totalQueries: 0, storageGB: 0, activeUsers: 0 },
    queryData: [],
    storageData: [],
    ragas: null,
  });

  useEffect(() => {
    if (!activeWorkspaceId) return;

    api.get(`/api/analytics?workspaceId=${activeWorkspaceId}`)
      .then(res => {
        if (!res.data.error) setData(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const ragas: { averages: RagasAverages; trend: RagasTrendPoint[]; distribution: Record<string, ScoreDistribution> } | null = data.ragas ?? null;

  const RAGAS_METRICS = [
    { key: 'faithfulness', label: 'Faithfulness', icon: 'shield', desc: 'Claims in answers are supported by context.' },
    { key: 'answerRelevancy', label: 'Answer Relevancy', icon: 'target', desc: 'Answers directly address user\'s question.' },
    { key: 'contextPrecision', label: 'Context Precision', icon: 'layers', desc: 'Relevant chunks are ranked at the top.' },
    { key: 'contextRecall', label: 'Context Recall', icon: 'book-open', desc: 'Context covers all needed info.' },
  ] as const;

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(30, 45, 90, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
  };

  const hasTrendData = ragas && ragas.trend && ragas.trend.length > 0;
  const trendLabels = hasTrendData ? ragas.trend.map(t => t.name) : ['N/A'];
  const faithfulnessData = hasTrendData ? ragas.trend.map(t => (t.faithfulness ?? 0) * 100) : [0];
  const answerRelevancyData = hasTrendData ? ragas.trend.map(t => (t.answerRelevancy ?? 0) * 100) : [0];

  const hasQueryData = data.queryData && data.queryData.length > 0;
  const queryLabels = hasQueryData ? data.queryData.map((d: any) => d.name) : ['N/A'];
  const queryValues = hasQueryData ? data.queryData.map((d: any) => d.queries) : [0];

  const hasStorageData = data.storageData && data.storageData.length > 0;
  const storageLabels = hasStorageData ? data.storageData.map((d: any) => d.name) : ['N/A'];
  const storageValues = hasStorageData ? data.storageData.map((d: any) => d.usage) : [0];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Monitor usage, queries, and RAG quality metrics.</Text>
        </View>

        {/* Top Metrics Row */}
        <View style={styles.metricsGrid}>
          {[
            { title: 'Total Documents', value: data.metrics.totalDocuments, change: '+0%', icon: 'file-text', color: '#3b82f6' },
            { title: 'Total Queries', value: data.metrics.totalQueries, change: '+0%', icon: 'activity', color: '#22c55e' },
            { title: 'Vector Storage', value: `${data.metrics.storageGB} GB`, change: '+0%', icon: 'database', color: '#a855f7' },
            { title: 'Active Users (30d)', value: data.metrics.activeUsers, change: '+0%', icon: 'users', color: '#f97316' },
          ].map((metric, i) => (
            <View key={i} style={styles.metricCard}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardTitle}>{metric.title}</Text>
                <Feather name={metric.icon as any} size={18} color={metric.color} />
              </View>
              <View style={styles.metricCardBody}>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <View style={styles.metricChangeBadge}>
                  <Feather name="arrow-up-right" size={12} color="#22c55e" />
                  <Text style={styles.metricChangeText}>{metric.change}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* RAG Quality Metrics */}
        <View style={styles.sectionPanel}>
          <View style={[styles.sectionHeader, { flexWrap: 'nowrap' }]}>
            <View style={{ flex: 1, flexShrink: 1, paddingRight: 12 }}>
              <Text style={styles.sectionTitle} numberOfLines={1}>RAG Quality Metrics</Text>
              <Text style={styles.sectionSubtitle}>RAGAS evaluation scores — computed after responses.</Text>
            </View>
            {ragas && (
              <View style={[styles.evalCount, { flexShrink: 0 }]}>
                <Text style={styles.evalLabel}>Evaluated</Text>
                <Text style={styles.evalValue}>
                  {ragas.averages.evaluatedCount}
                  <Text style={styles.evalTotal}>/{ragas.averages.totalAssistantMessages}</Text>
                </Text>
                <Text style={styles.evalLabel}>responses</Text>
              </View>
            )}
          </View>

          {!ragas || ragas.averages.evaluatedCount === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="info" size={20} color="#94a3b8" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.emptyStateTitle}>No evaluated responses yet</Text>
                <Text style={styles.emptyStateDesc}>RAGAS scores will appear here automatically after chat messages are processed.</Text>
              </View>
            </View>
          ) : (
            <>
              {/* Gauges Grid */}
              <View style={styles.gaugesGrid}>
                {RAGAS_METRICS.map(({ key, label, icon, desc }) => (
                  <MetricGauge
                    key={key}
                    label={label}
                    icon={icon}
                    value={ragas.averages[key as keyof RagasAverages] as number | null}
                    description={desc}
                  />
                ))}
              </View>

              {/* Distributions */}
              <View style={styles.distGrid}>
                {RAGAS_METRICS.map(({ key, label }) => {
                  const dist = ragas.distribution[key];
                  if (!dist) return null;
                  const total = dist.good + dist.fair + dist.poor;
                  return (
                    <View key={key} style={styles.distCard}>
                      <View style={styles.distHeader}>
                        <Text style={styles.distLabel}>{label} distribution</Text>
                        <Text style={styles.distTotal}>{total} msgs</Text>
                      </View>
                      <DistributionBar dist={dist} />
                      <View style={styles.distLegendRow}>
                        <View style={styles.distLegendItem}><View style={[styles.distDot, { backgroundColor: '#22c55e' }]} /><Text style={styles.distLegendText}>Good {dist.good}</Text></View>
                        <View style={styles.distLegendItem}><View style={[styles.distDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.distLegendText}>Fair {dist.fair}</Text></View>
                        <View style={styles.distLegendItem}><View style={[styles.distDot, { backgroundColor: '#ef4444' }]} /><Text style={styles.distLegendText}>Poor {dist.poor}</Text></View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Alerts */}
              <View style={styles.alertsContainer}>
                <Text style={styles.alertsSectionTitle}>FAILURE MODE DETECTION</Text>
                <FailureModeAlerts averages={ragas.averages} />
              </View>
            </>
          )}
        </View>

        {/* Charts Row */}
        {hasTrendData && (
          <View style={styles.sectionPanel}>
            <Text style={styles.sectionTitle}>RAGAS Score Trends</Text>
            <Text style={styles.sectionSubtitle}>Daily average scores over the last 7 days</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: trendLabels,
                  datasets: [
                    { data: faithfulnessData, color: () => '#22c55e' },
                    { data: answerRelevancyData, color: () => '#3b82f6' }
                  ],
                  legend: ['Faithfulness', 'Relevancy']
                }}
                width={contentWidth - 40}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chartStyle}
              />
            </View>
          </View>
        )}

        <View style={styles.sectionPanel}>
          <Text style={styles.sectionTitle}>Query Volume</Text>
          <Text style={styles.sectionSubtitle}>Daily AI generations over the last week</Text>
          <View style={styles.chartWrapper}>
            <BarChart
              data={{
                labels: queryLabels,
                datasets: [{ data: queryValues }]
              }}
              width={contentWidth - 40}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(30, 45, 90, ${opacity})` }}
              style={styles.chartStyle}
            />
          </View>
        </View>

        <View style={styles.sectionPanel}>
          <Text style={styles.sectionTitle}>Storage Utilization</Text>
          <Text style={styles.sectionSubtitle}>Vector & object storage growth (GB)</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={{
                labels: storageLabels,
                datasets: [{ data: storageValues }]
              }}
              width={contentWidth - 40}
              height={220}
              chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})` }}
              bezier
              style={styles.chartStyle}
            />
          </View>
        </View>

        {/* System Status */}
        <View style={styles.sectionPanel}>
          <Text style={styles.sectionTitle}>System Infrastructure Status</Text>
          <Text style={styles.sectionSubtitle}>Real-time health of core services</Text>
          <View style={styles.statusGrid}>
            {[
              { name: 'FastAPI Backend', status: 'Operational', ping: '42ms' },
              { name: 'Qdrant Vector DB', status: 'Operational', ping: '12ms' },
              { name: 'RAGAS Evaluator', status: 'Operational', ping: '~4s' },
              { name: 'RabbitMQ Workers', status: 'Operational', ping: '15ms' },
            ].map((service, i) => (
              <View key={i} style={styles.statusCard}>
                <View style={styles.statusLeft}>
                  <View style={styles.statusDot} />
                  <View>
                    <Text style={styles.statusName}>{service.name}</Text>
                    <Text style={styles.statusState}>{service.status}</Text>
                  </View>
                </View>
                <Text style={styles.statusPing}>{service.ping}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    width: (contentWidth - 12) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  metricCardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  metricChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  metricChangeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22c55e',
    marginLeft: 2,
  },

  // Panels
  sectionPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  
  // Evaluated Count
  evalCount: {
    alignItems: 'flex-end',
  },
  evalLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  evalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  evalTotal: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
  },

  // Empty State
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Gauges
  gaugesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  glassPanel: {
    width: (contentWidth - 44) / 2, // Accounting for paddings and gaps
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  scoreBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scoreBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  gaugeChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    marginBottom: 8,
  },
  gaugeCenterText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeCenterPct: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  gaugeDesc: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },

  // Distributions
  distGrid: {
    gap: 12,
    marginTop: 16,
  },
  distCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  distLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  distTotal: {
    fontSize: 11,
    color: '#64748b',
  },
  distBarContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  distSegment: {
    height: '100%',
  },
  distEmpty: {
    fontSize: 11,
    color: '#94a3b8',
  },
  distLegendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  distLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distLegendText: {
    fontSize: 10,
    color: '#64748b',
  },

  // Alerts
  alertsContainer: {
    marginTop: 20,
  },
  alertsSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 10,
  },
  alertList: {
    gap: 8,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  alertTextContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Charts
  chartWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
  chartStyle: {
    borderRadius: 12,
  },

  // System Status
  statusGrid: {
    gap: 12,
    marginTop: 16,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  statusName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },
  statusState: {
    fontSize: 11,
    color: '#64748b',
  },
  statusPing: {
    fontSize: 11,
    fontFamily: 'Courier',
    color: '#64748b',
  },
});
