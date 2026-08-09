import React from 'react';
import Text from '../src/components/Text';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const CORE_FEATURES = [
  {
    id: 1,
    icon: 'search',
    title: 'Semantic Search',
    description: 'Find meaning across millions of tokens, powered by advanced vector embeddings and cross-encoder re-ranking.',
  },
  {
    id: 2,
    icon: 'cpu',
    title: 'Citation-Backed AI',
    description: 'Receive verifiable answers with pinpoint source citations and confidence scores. Powered by Gemini or GPT-4o.',
  },
  {
    id: 3,
    icon: 'users',
    title: 'Team Workspaces',
    description: 'Collaborate seamlessly. Invite members, assign Owner/Admin/Member roles, and share knowledge bases securely.',
  },
];

const LOGOS = ['OpenAI', 'Vercel', 'Stripe', 'Linear', 'Anthropic'];

export default function OnboardingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Subtle background glow effect */}
      <View style={styles.glow} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Feather name="cpu" size={14} color="#3b82f6" />
        </View>
        <Text style={styles.logoText}>IntelliDoc</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Pill Badge */}
        <View style={styles.pillBadge}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>IntelliDoc AI 2.0 is live</Text>
        </View>

        {/* Hero Section */}
        <Text style={styles.headline}>
          The most modern AI-powered document intelligence platform.
        </Text>
        <Text style={styles.subtitle}>
          An enterprise-grade AI document intelligence platform that combines semantic search, citation-backed AI chat, and secure team workspaces to transform how you interact with your data.
        </Text>

        {/* CTAs */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={styles.primaryBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryBtnText}>Sign In</Text>
            <Feather name="arrow-right" size={16} color="#ffffff" style={styles.arrowIcon} />
          </TouchableOpacity>
        </View>

        {/* Trust Logos */}
        <View style={styles.trustSection}>
          <Text style={styles.trustTitle}>TRUSTED BY EXCEPTIONAL TEAMS</Text>
          <View style={styles.logosContainer}>
            {LOGOS.map((logo, i) => (
              <Text key={i} style={styles.logoItem}>{logo}</Text>
            ))}
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          {CORE_FEATURES.map((feat) => (
            <View key={feat.id} style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Feather name={feat.icon as any} size={20} color="#ffffff" />
              </View>
              <Text style={styles.featureTitle}>{feat.title}</Text>
              <Text style={styles.featureDesc}>{feat.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#334155', // Slate-700 to match login/register
  },
  glow: {
    position: 'absolute',
    top: -100,
    left: width / 2 - 150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  logoBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
    marginRight: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
    alignItems: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  ctaContainer: {
    flexDirection: 'column',
    width: '100%',
    gap: 12,
    marginBottom: 48,
  },
  primaryBtn: {
    backgroundColor: '#ffffff',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  trustSection: {
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 32,
    marginBottom: 48,
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 2,
    marginBottom: 20,
  },
  logosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    columnGap: 24,
  },
  logoItem: {
    fontSize: 16,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  featuresSection: {
    width: '100%',
    gap: 16,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  featureDesc: {
    fontSize: 14,
    color: '#cbd5e1',
    lineHeight: 20,
  },
});
