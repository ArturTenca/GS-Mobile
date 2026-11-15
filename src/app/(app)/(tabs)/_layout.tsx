import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/layout/TabBar';
import { useTheme } from '@/features/theme/ThemeProvider';
import { badgeLabel, usePendingAlertCount } from '@/hooks/usePendingAlertCount';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';

export const unstable_settings = { anchor: 'index' };

export default function TabsLayout() {
  const { colors } = useTheme();
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
