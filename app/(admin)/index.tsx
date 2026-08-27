import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase, Complaint, ComplaintStatus, ComplaintCategory, CATEGORIES } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { LoadingState, EmptyState, StatusBadge, CategoryBadge } from '@/components/ui';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  X,
  Search,
  LayoutDashboard,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatusFilter = 'all' | ComplaintStatus;
type CategoryFilter = 'all' | ComplaintCategory;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reported', label: 'Reported' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [search, setSearch] = useState('');

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

  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const stats = {
    total: complaints.length,
    reported: complaints.filter((c) => c.status === 'reported').length,
    inProgress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  if (loading) return <LoadingState message="Loading dashboard..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Dashboard</Text>
          <Text style={styles.userName}>{profile?.name || 'Admin'}</Text>
        </View>
        <View style={styles.headerLogo}>
          <LayoutDashboard size={20} color={theme.colors.white} strokeWidth={2.5} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <DashboardStat
          icon={<FileText size={18} color={theme.colors.primary[600]} strokeWidth={2} />}
          label="Total"
          value={stats.total}
          color={theme.colors.primary[600]}
          bg={theme.colors.primary[50]}
        />
        <DashboardStat
          icon={<AlertCircle size={18} color="#dc2626" strokeWidth={2} />}
          label="Reported"
          value={stats.reported}
          color="#dc2626"
          bg="#fef2f2"
        />
        <DashboardStat
          icon={<Clock size={18} color="#d97706" strokeWidth={2} />}
          label="Active"
          value={stats.inProgress}
          color="#d97706"
          bg="#fffbeb"
        />
        <DashboardStat
          icon={<CheckCircle size={18} color="#16a34a" strokeWidth={2} />}
          label="Resolved"
          value={stats.resolved}
          color="#16a34a"
          bg="#f0fdf4"
        />
      </View>

      <View style={styles.searchContainer}>
        <Search size={18} color={theme.colors.textTertiary} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title or location..."
          placeholderTextColor={theme.colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={18} color={theme.colors.textTertiary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterChip, categoryFilter !== 'all' && styles.filterChipActive]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Filter size={14} color={categoryFilter !== 'all' ? theme.colors.white : theme.colors.neutral[700]} strokeWidth={2} />
            <Text style={[styles.filterChipText, categoryFilter !== 'all' && styles.filterChipTextActive]}>
              {categoryFilter === 'all' ? 'Category' : categoryFilter}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, flexGrow: 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<FileText size={32} color={theme.colors.primary[400]} strokeWidth={2} />}
            title="No complaints found"
            subtitle={
              complaints.length === 0
                ? 'When students report problems, they will appear here for you to manage.'
                : 'Try adjusting your filters or search.'
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
            {item.assigned_to && (
              <View style={styles.assignedRow}>
                <Text style={styles.assignedText}>Assigned: {item.assigned_to}</Text>
              </View>
            )}
            <ChevronRight
              size={18}
              color={theme.colors.textTertiary}
              strokeWidth={2}
              style={styles.chevron}
            />
          </TouchableOpacity>
        )}
      />

      <Modal visible={showCategoryModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Filter by Category</Text>
            <TouchableOpacity
              style={[styles.modalOption, categoryFilter === 'all' && styles.modalOptionActive]}
              onPress={() => { setCategoryFilter('all'); setShowCategoryModal(false); }}
            >
              <Text style={[styles.modalOptionText, categoryFilter === 'all' && styles.modalOptionTextActive]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.modalOption, categoryFilter === cat && styles.modalOptionActive]}
                onPress={() => { setCategoryFilter(cat); setShowCategoryModal(false); }}
              >
                <Text style={[styles.modalOptionText, categoryFilter === cat && styles.modalOptionTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function DashboardStat({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 22,
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  filterRow: {
    paddingLeft: 24,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
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
  assignedRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  assignedText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary[700],
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 8,
    width: '100%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    padding: 16,
    paddingBottom: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalOptionActive: {
    backgroundColor: theme.colors.primary[50],
  },
  modalOptionText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
  },
  modalOptionTextActive: {
    color: theme.colors.primary[700],
    fontFamily: theme.fonts.semiBold,
  },
});
