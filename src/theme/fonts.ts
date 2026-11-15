import { useFonts } from 'expo-font';
// Per-weight imports: the package barrel would bundle all 18 TTFs (~6 MB) into the web export.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_600SemiBold });
  // On font load error, render with the system fallback rather than blocking forever.
  return loaded || error != null;
}
