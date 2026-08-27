import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { LoadingState } from '@/components/ui';
import { theme } from '@/lib/theme';

export default function IndexScreen() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace('/(auth)');
    } else if (profile?.role === 'admin') {
      router.replace('/(admin)');
    } else {
      router.replace('/(student)');
    }
  }, [session, profile, loading]);

  return (
    <View style={styles.container}>
      <LoadingState message="Loading CampusFix..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
