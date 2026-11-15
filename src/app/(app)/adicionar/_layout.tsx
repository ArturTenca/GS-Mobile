import { Stack } from 'expo-router';

import { useTheme } from '@/features/theme/ThemeProvider';

export default function AdicionarLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
