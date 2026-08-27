import { ActivityIndicator, Text, TextStyle, View, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

export function LoadingState({ message }: { message?: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      {message && (
        <Text style={{ marginTop: 12, fontSize: 14, fontFamily: theme.fonts.medium, color: theme.colors.textSecondary }}>
          {message}
        </Text>
      )}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: theme.colors.primary[50],
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
      }}>
        {icon}
      </View>
      <Text style={{ fontSize: 18, fontFamily: theme.fonts.semiBold, color: theme.colors.textPrimary, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle && (
        <Text style={{ fontSize: 14, fontFamily: theme.fonts.regular, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}
      {action && <View style={{ marginTop: 24 }}>{action}</View>}
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#fef2f2',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
      }}>
        <Text style={{ fontSize: 28 }}>!</Text>
      </View>
      <Text style={{ fontSize: 16, fontFamily: theme.fonts.medium, color: theme.colors.error, textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: 'reported' | 'in_progress' | 'resolved' }) {
  const config = {
    reported: { label: 'Reported', color: '#dc2626', bg: '#fef2f2' },
    in_progress: { label: 'In Progress', color: '#d97706', bg: '#fffbeb' },
    resolved: { label: 'Resolved', color: '#16a34a', bg: '#f0fdf4' },
  };
  const c = config[status];
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, backgroundColor: c.bg,
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.color }} />
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.semiBold, color: c.color }}>{c.label}</Text>
    </View>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
      backgroundColor: theme.colors.neutral[100],
    }}>
      <Text style={{ fontSize: 12, fontFamily: theme.fonts.medium, color: theme.colors.neutral[700] }}>
        {category}
      </Text>
    </View>
  );
}
