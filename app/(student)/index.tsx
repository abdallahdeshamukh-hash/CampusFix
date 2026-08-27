import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ViewStyle,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase, Complaint, ComplaintStatus } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { LoadingState, EmptyState, StatusBadge, CategoryBadge } from '@/components/ui';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudentHomeScreen() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchComplaints = useCallback(async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching complaints:', error.message);
      return;
    }
    setComplaints((data as Complaint[]) || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchComplaints().finally(() => setLoading(false));
    }, [fetchComplaints])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  }

  const stats = {
    total: complaints.length,
    reported: complaints.filter((c) => c.status === 'reported').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  if (loading) return <LoadingState message="Loading your dashboard..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{profile?.name || 'Student'}</Text>
          </View>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>CF</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => router.push('/report')}
          activeOpacity={0.9}
        >
          <View style={styles.reportButtonContent}>
            <View style={styles.reportButtonIcon}>
              <Plus size={24} color={theme.colors.white} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.reportButtonTitle}>Report a Problem</Text>
              <Text style={styles.reportButtonSubtitle}>Spotted an issue? Report it in under a minute</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon={<FileText size={20} color={theme.colors.primary[600]} strokeWidth={2} />}
              label="Total"
              value={stats.total}
              color={theme.colors.primary[600]}
              bgColor={theme.colors.primary[50]}
            />
            <StatCard
              icon={<AlertCircle size={20} color="#dc2626" strokeWidth={2} />}
              label="Reported"
              value={stats.reported}
              color="#dc2626"
              bgColor="#fef2f2"
            />
            <StatCard
              icon={<Clock size={20} color="#d97706" strokeWidth={2} />}
              label="In Progress"
              value={stats.inProgress}
              color="#d97706"
              bgColor="#fffbeb"
            />
            <StatCard
              icon={<CheckCircle size={20} color="#16a34a" strokeWidth={2} />}
              label="Resolved"
              value={stats.resolved}
              color="#16a34a"
              bgColor="#f0fdf4"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <TouchableOpacity onPress={() => router.push('/(student)/complaints')}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {complaints.length === 0 ? (
            <EmptyState
              icon={<FileText size={32} color={theme.colors.primary[400]} strokeWidth={2} />}
              title="No complaints yet"
              subtitle="When you report a problem, it will appear here for tracking."
              action={
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => router.push('/report')}
                >
                  <Text style={styles.emptyActionText}>Report your first problem</Text>
                </TouchableOpacity>
              }
            />
          ) : (
            <View style={styles.complaintList}>
              {complaints.map((complaint) => (
                <ComplaintCard key={complaint.id} complaint={complaint} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bgColor }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  return (
    <TouchableOpacity
      style={styles.complaintCard}
      onPress={() => router.push(`/complaint/${complaint.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.complaintCardLeft}>
        <View style={styles.complaintCardHeader}>
          <CategoryBadge category={complaint.category} />
          <StatusBadge status={complaint.status} />
        </View>
        <Text style={styles.complaintTitle} numberOfLines={1}>
          {complaint.title}
        </Text>
        <Text style={styles.complaintLocation} numberOfLines={1}>
          {complaint.location}
        </Text>
      </View>
      <ChevronRight size={20} color={theme.colors.textTertiary} strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  marginBottom: 2,
  },
  userName: {
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoText: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    color: theme.colors.white,
  },
  reportButton: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.primary[600],
    shadowColor: theme.colors.primary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  reportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  reportButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
    marginBottom: 2,
  },
  reportButtonSubtitle: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255,255,255,0.85)',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary[600],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  complaintList: {
    gap: 12,
  },
  complaintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  complaintCardLeft: {
    flex: 1,
    marginRight: 8,
  },
  complaintCardHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  complaintTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  complaintLocation: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  emptyAction: {
    backgroundColor: theme.colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
});
