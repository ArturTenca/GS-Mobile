import { useRouter } from 'expo-router';
import ShieldCheck from 'lucide-react-native/icons/shield-check';

import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';

export function SecuritySection() {
  const router = useRouter();
  return (
    <SettingsSection title="Segurança e privacidade">
      <SettingsRow
        icon={ShieldCheck}
        label="Risco Cidadão e auditoria"
        description="Veja o nível de risco dos seus dados e rode uma auditoria."
        trailing="chevron"
        onPress={() => router.push('/seguranca' as never)}
        isLast
      />
    </SettingsSection>
  );
}
