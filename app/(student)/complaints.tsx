import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase, Complaint, ComplaintStatus } from '@/lib/supabase';
import { theme } from '@/lib/theme';
import { LoadingState, EmptyState, StatusBadge, CategoryBadge } from '@/components/ui';
import { FileText, Plus, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FilterType = 'all' | ComplaintStatus;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reported', label: 'Reported' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

export default function MyComplaintsScreen() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchComplaints = useCallback(async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

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

  const filteredComplaints =
    filter === 'all' ? complaints : complaints.filter((c) => c.status === filter);

  if (loading) return <LoadingState message="Loading your complaints..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Reports</Text>
        <Text style={styles.subtitle}>{complaints.length} total complaints</Text>
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<FileText size={32} color={theme.colors.primary[400]} strokeWidth={2} />}
            title={complaints.length === 0 ? 'No complaints yet' : 'No complaints in this category'}
            subtitle={
              complaints.length === 0
                ? 'Report a campus problem and track its progress here.'
                : 'Try a different filter to see your other complaints.'
            }
            action={
              complaints.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => router.push('/report')}
                >
                  <Plus size={18} color={theme.colors.white} strokeWidth={2.5} />
                  <Text style={styles.emptyActionText}>Report a Problem</Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.complaintCard}
            onPress={() => router.push(`/complaint/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <CategoryBadge category={item.category} />
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.complaintTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.cardBottom}>
              <Text style={styles.complaintLocation} numberOfLines={1}>
                {item.location}
              </Text>
              <Text style={styles.complaintDate}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <ChevronRight
              size={18}
              color={theme.colors.textTertiary}
              strokeWidth={2}
              style={styles.chevron}
            />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary[600],
    borderColor: theme.colors.primary[600],
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.neutral[700],
  },
  filterChipTextActive: {
    color: theme.colors.white,
  },
  complaintCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  complaintTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complaintLocation: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  complaintDate: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textTertiary,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
