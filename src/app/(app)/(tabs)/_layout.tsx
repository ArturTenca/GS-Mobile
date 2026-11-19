import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router/js-tabs';
import { useEffect } from 'react';

import { TabBar } from '@/components/layout/TabBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { FARMS_STALE_TIME, fetchFarmsCached } from '@/hooks/useFarms';
import { badgeLabel, usePendingAlertCount } from '@/hooks/usePendingAlertCount';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';

export const unstable_settings = { anchor: 'index' };

export default function TabsLayout() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const userId = useAuth().user?.id ?? null;
  // Start loading farms in parallel with the producer query (same key as useFarms).
  useEffect(() => {
    if (!userId) return;
    void queryClient.prefetchQuery({ queryKey: ['farms', userId], queryFn: () => fetchFarmsCached(userId), staleTime: FARMS_STALE_TIME });
  }, [queryClient, userId]);
  const { farm } = useSelectedFarm();
  const pending = usePendingAlertCount(farm?.id);
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="monitoramento" options={{ title: 'Monitoramento' }} />
      <Tabs.Screen name="alertas" options={{ title: 'Alertas', tabBarBadge: badgeLabel(pending) }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
