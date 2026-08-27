import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase, Complaint, ComplaintStatus } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { theme } from '@/lib/theme';
import { LoadingState, ErrorState, StatusBadge, CategoryBadge } from '@/components/ui';
import {
  ChevronLeft,
  MapPin,
  Calendar,
  User as UserIcon,
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignName, setAssignName] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchComplaint = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      setError('Failed to load complaint.');
      return;
    }
    if (!data) {
      setError('Complaint not found.');
      return;
    }
    setComplaint(data as Complaint);
    setAssignName((data as Complaint).assigned_to || '');
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchComplaint().finally(() => setLoading(false));
    }, [fetchComplaint])
  );

  async function updateStatus(status: ComplaintStatus) {
    if (!complaint) return;
    setUpdating(true);
    const { error } = await supabase
      .from('complaints')
      .update({ status })
      .eq('id', complaint.id);

    if (error) {
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } else {
      setComplaint({ ...complaint, status });
    }
    setUpdating(false);
  }

  async function handleAssign() {
    if (!complaint) return;
    setUpdating(true);
    const { error } = await supabase
      .from('complaints')
      .update({ assigned_to: assignName.trim() || null })
      .eq('id', complaint.id);

    if (error) {
      Alert.alert('Error', 'Failed to assign complaint.');
    } else {
      setComplaint({ ...complaint, assigned_to: assignName.trim() || null });
      setShowAssignModal(false);
    }
    setUpdating(false);
  }

  async function handleDelete() {
    if (!complaint) return;
    Alert.alert('Delete Complaint', 'Are you sure you want to delete this complaint?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          if (complaint.image_path) {
            await supabase.storage.from('complaints').remove([complaint.image_path]);
          }
          const { error } = await supabase.from('complaints').delete().eq('id', complaint.id);
          if (error) {
            Alert.alert('Error', 'Failed to delete complaint.');
            setUpdating(false);
          } else {
            router.back();
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingState message="Loading complaint..." />;
  if (error) return <ErrorState message={error} />;
  if (!complaint) return <ErrorState message="Complaint not found" />;

  const timeline = [
    {
      status: 'reported' as ComplaintStatus,
      label: 'Reported',
      icon: <AlertCircle size={16} color="#dc2626" strokeWidth={2.5} />,
      color: '#dc2626',
      done: true,
    },
    {
      status: 'in_progress' as ComplaintStatus,
      label: 'In Progress',
      icon: <Clock size={16} color="#d97706" strokeWidth={2.5} />,
      color: '#d97706',
      done: ['in_progress', 'resolved'].includes(complaint.status),
    },
    {
      status: 'resolved' as ComplaintStatus,
      label: 'Resolved',
      icon: <CheckCircle size={16} color="#16a34a" strokeWidth={2.5} />,
      color: '#16a34a',
      done: complaint.status === 'resolved',
    },
  ];

  const statusOrder: ComplaintStatus[] = ['reported', 'in_progress', 'resolved'];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Complaint Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 24 }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CategoryBadge category={complaint.category} />
            <StatusBadge status={complaint.status} />
          </View>

          <Text style={styles.complaintTitle}>{complaint.title}</Text>

          {complaint.image_url && (
            <Image source={{ uri: complaint.image_url }} style={styles.complaintImage} />
          )}

          {complaint.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{complaint.description}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <MapPin size={18} color={theme.colors.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>{complaint.location}</Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={18} color={theme.colors.textSecondary} strokeWidth={2} />
            <Text style={styles.infoText}>
              {new Date(complaint.created_at).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {complaint.assigned_to && (
            <View style={styles.infoRow}>
              <Wrench size={18} color={theme.colors.textSecondary} strokeWidth={2} />
              <Text style={styles.infoText}>Assigned to: {complaint.assigned_to}</Text>
            </View>
          )}
        </View>

        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Status Timeline</Text>
          <View style={styles.timeline}>
            {timeline.map((step, idx) => (
              <View key={step.status} style={styles.timelineStep}>
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      { backgroundColor: step.done ? step.color : theme.colors.neutral[200] },
                    ]}
                  >
                    {step.done && step.icon}
                  </View>
                  {idx < timeline.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        {
                          backgroundColor: timeline[idx + 1].done
                            ? timeline[idx + 1].color
                            : theme.colors.neutral[200],
                        },
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    { color: step.done ? theme.colors.textPrimary : theme.colors.textTertiary },
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {isAdmin && (
          <View style={styles.adminCard}>
            <Text style={styles.adminTitle}>Admin Actions</Text>

            <Text style={styles.adminLabel}>Change Status</Text>
            <View style={styles.statusButtons}>
              {statusOrder.map((s) => {
                const config = {
                  reported: { label: 'Reported', color: '#dc2626', bg: '#fef2f2' },
                  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
                  resolved: { label: 'Resolved', color: '#16a34a', bg: '#f0fdf4' },
                };
                const c = config[s];
                const isActive = complaint.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusButton,
                      { backgroundColor: c.bg, borderColor: c.color },
                      isActive && { borderWidth: 2 },
                    ]}
                    onPress={() => updateStatus(s)}
                    disabled={updating}
                  >
                    <View style={[styles.statusDot, { backgroundColor: c.color }]} />
                    <Text style={[styles.statusButtonText, { color: c.color }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.adminLabel}>Assign To</Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => {
                setAssignName(complaint.assigned_to || '');
                setShowAssignModal(true);
              }}
            >
              <Wrench size={18} color={theme.colors.primary[600]} strokeWidth={2} />
              <Text style={styles.assignButtonText}>
                {complaint.assigned_to ? `Assigned: ${complaint.assigned_to}` : 'Assign to staff'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={updating}>
              <Trash2 size={18} color={theme.colors.error} strokeWidth={2} />
              <Text style={styles.deleteButtonText}>Delete Complaint</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={showAssignModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign to Maintenance Staff</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Raj (Electrician)"
              placeholderTextColor={theme.colors.textTertiary}
              value={assignName}
              onChangeText={setAssignName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleAssign}>
                <Text style={styles.modalConfirmText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  complaintTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
    lineHeight: 28,
  },
  complaintImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },
  descriptionBox: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  timelineCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 16,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  timeline: {
    gap: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  timelineLabel: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    flex: 1,
    paddingBottom: 20,
  },
  adminCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 16,
  },
  adminTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  adminLabel: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    marginTop: 8,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusButtonText: {
    fontSize: 13,
    fontFamily: theme.fonts.semiBold,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.primary[200],
    backgroundColor: theme.colors.primary[50],
    marginBottom: 12,
  },
  assignButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary[700],
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.error,
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
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[600],
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontFamily: theme.fonts.semiBold,
    color: theme.colors.white,
  },
});
