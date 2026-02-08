import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function ProtectedRoute({ children, fallback }: Readonly<ProtectedRouteProps>) {
  const { user, isLoading, isConfigured } = useAuth();

  // Dev mode only: bypass auth when Supabase not configured
  if (__DEV__ && !isConfigured) return <>{children}</>;

  // Show loading while checking auth state
  if (isLoading) {
    return (
      fallback ?? (
        <View style={styles.loading} accessible accessibilityLabel="Loading" accessibilityRole="progressbar">
          <ActivityIndicator size="large" />
        </View>
      )
    );
  }

  // Redirect to login if not authenticated
  if (!user) return <Redirect href="/auth/login" />;

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
