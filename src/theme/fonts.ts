import { Inter_400Regular, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  // On font load error, render with the system fallback rather than blocking forever.
  return loaded || error != null;
}
