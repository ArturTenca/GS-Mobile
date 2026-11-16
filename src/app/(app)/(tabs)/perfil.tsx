import Constants from 'expo-constants';
import { router } from 'expo-router';
import Cloud from 'lucide-react-native/icons/cloud';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import MapIcon from 'lucide-react-native/icons/map';
import Plus from 'lucide-react-native/icons/plus';
import Tag from 'lucide-react-native/icons/tag';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { NotificationsSection } from '@/components/profile/NotificationsSection';
import { SecuritySection } from '@/components/profile/SecuritySection';
import { ThresholdsSection } from '@/components/profile/ThresholdsSection';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { DemoBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { validateFullName } from '@/features/profile/validateName';
import type { ThemePreference } from '@/features/theme/resolveTheme';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useProducer } from '@/hooks/useProducer';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useUpdateProducerName } from '@/hooks/useUpdateProducerName';
import { initials } from '@/lib/format';
import { queryClient } from '@/lib/queryClient';
import { usePreferencesStore, type TempUnit } from '@/stores/preferences';
import { spacing } from '@/theme/tokens';
import type { Property } from '@/types/database';

// Fixed https targets only; never built from user data (T-02.2-15).
const OPEN_METEO_URL = 'https://open-meteo.com/';
const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

const THEME_TABS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Sistema' },
  { id: 'light', label: 'Claro' },
  { id: 'dark', label: 'Escuro' },
];

const UNIT_TABS: { id: TempUnit; label: string }[] = [
  { id: 'c', label: '°C' },
  { id: 'f', label: '°F' },
];

function farmLabel(farm: Property): string {
  const place = [farm.city, farm.state].filter(Boolean).join('/');
  return place ? `${farm.name} · ${place}` : farm.name;
}

async function openExternal(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // Silent by design (UI-SPEC S2).
  }
}

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const query = useProducer();
  const producer = query.data;
  const nameMutation = useUpdateProducerName();
  const { farms, farm, select } = useSelectedFarm();

  const tempUnit = usePreferencesStore((s) => s.tempUnit);
  const setTempUnit = usePreferencesStore((s) => s.setTempUnit);

  // null = untouched (mirror the saved name).
  const [draft, setDraft] = useState<string | null>(null);
  const [savedOverride, setSavedOverride] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const savedName = savedOverride ?? producer?.fullName ?? '';
  const nameValue = draft ?? savedName;
  const validation = validateFullName(nameValue);
  const nameError = draft !== null ? validation.error : null;
  const canSaveName = draft !== null && validation.error === null && validation.value !== savedName;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sections: { gap: spacing.xl },
        accountBox: { padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
        identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
        avatar: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.primarySoft,
        },
        name: { flex: 1 },
        saveRow: { alignItems: 'flex-start' },
        box: { padding: spacing.lg, gap: spacing.md },
        boxGroup: { gap: spacing.xs },
        demoBox: { padding: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
        logout: { marginTop: spacing.xl },
      }),
    [colors],
  );

  function handleNameChange(text: string) {
    setDraft(text);
    if (nameSaved) setNameSaved(false);
    if (nameMutation.errorMessage) nameMutation.reset();
  }

  async function handleSaveName() {
    if (!canSaveName) return;
    const value = validation.value;
    const ok = await nameMutation.save(value);
    if (ok) {
      setSavedOverride(value);
      setDraft(value);
      setNameSaved(true);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
    } finally {
      setSigningOut(false);
      setConfirmOpen(false);
    }
  }

  const version = Constants.expoConfig?.version ?? '—';

  return (
    <>
      <ScreenHeader title="Perfil" />
      <ScreenContainer>
        <View style={styles.sections}>
          {/* 1. Conta — only this section waits on the network. */}
          <SettingsSection title="Conta">
            {query.isLoading ? (
              <LoadingState message="Carregando perfil…" />
            ) : query.isError || !producer ? (
              <ErrorState onRetry={() => void query.refetch()} retrying={query.isFetching} />
            ) : (
              <>
                <View style={styles.accountBox}>
                  <View style={styles.identity}>
                    <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no">
                      <Text variant="body" weight="semibold" style={{ color: colors.primaryText }}>
                        {initials(savedName)}
                      </Text>
                    </View>
                    <Text variant="body" weight="semibold" style={styles.name}>
                      {savedName}
                    </Text>
                  </View>
                  <Input
                    label="Nome"
                    value={nameValue}
                    onChangeText={handleNameChange}
                    autoCapitalize="words"
                    autoComplete="name"
                    returnKeyType="done"
                    maxLength={160}
                    error={nameError}
                    onSubmitEditing={() => void handleSaveName()}
                  />
                  {canSaveName ? (
                    <View style={styles.saveRow}>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={nameMutation.isSaving}
                        loadingLabel="Salvando…"
                        onPress={() => void handleSaveName()}
                      >
                        Salvar nome
                      </Button>
                    </View>
                  ) : null}
                  {nameMutation.errorMessage ? (
                    <Notice variant="error">
                      Não foi possível salvar o nome. Verifique sua internet e tente de novo.
                    </Notice>
                  ) : null}
                  {nameSaved ? <Notice variant="success">Nome atualizado.</Notice> : null}
                </View>
                <SettingsRow
                  icon={Mail}
                  label="E-mail"
                  value={user?.email ?? '—'}
                  valueSelectable
                  description="Usado para entrar. Não pode ser alterado aqui."
                  isLast
                />
              </>
            )}
          </SettingsSection>

          {/* 2. Aparência */}
          <SettingsSection title="Aparência">
            <View style={styles.box}>
              <View style={styles.boxGroup}>
                <Text variant="body">Tema</Text>
                <Text variant="label" tone="muted">
                  Escolha como o app aparece.
                </Text>
              </View>
              <Tabs
                semantics="radio"
                accessibilityLabel="Tema"
                tabs={THEME_TABS}
                active={preference}
                onChange={(id) => setPreference(id as ThemePreference)}
              />
            </View>
          </SettingsSection>

          {/* 3. Fazenda */}
          <SettingsSection title="Fazenda">
            <View style={styles.box}>
              {farms.length === 0 ? (
                <Text variant="label" tone="muted">
                  Nenhuma fazenda cadastrada.
                </Text>
              ) : (
                <View style={styles.boxGroup}>
                  <Select
                    label="Fazenda padrão"
                    options={farms.map((f) => ({ value: f.id, label: farmLabel(f) }))}
                    value={farm?.id ?? ''}
                    onChange={select}
                  />
                  <Text variant="label" tone="muted">
                    É a fazenda que abre no Início.
                  </Text>
                </View>
              )}
              <View style={styles.saveRow}>
                <Button variant="ghost" icon={Plus} onPress={() => router.push('/adicionar/fazenda' as never)}>
                  Adicionar fazenda
                </Button>
              </View>
            </View>
          </SettingsSection>

          {/* 3b. Limites dos sensores */}
          <ThresholdsSection />

          {/* 4. Notificações */}
          <NotificationsSection />

          {/* 5. Unidades */}
          <SettingsSection title="Unidades">
            <View style={styles.box}>
              <Text variant="body">Temperatura</Text>
              <Tabs
                semantics="radio"
                accessibilityLabel="Temperatura"
                tabs={UNIT_TABS}
                active={tempUnit}
                onChange={(id) => setTempUnit(id as TempUnit)}
              />
            </View>
          </SettingsSection>

          {/* 6. Dados */}
          <SettingsSection title="Dados">
            <View style={styles.demoBox}>
              <DemoBadge />
              <Text variant="label" tone="muted">
                Os sensores e as leituras do app são simulados até um sensor de verdade enviar dados.
              </Text>
              <Text variant="label" tone="muted">
                A previsão do tempo no Início é real e vem do Open-Meteo.
              </Text>
            </View>
          </SettingsSection>
          <SecuritySection />

          {/* 7. Sobre — map credits follow the OSM + Esri tiles actually in use. */}
          <SettingsSection title="Sobre">
            <SettingsRow icon={Tag} label="Versão" value={version} />
            <SettingsRow
              icon={Cloud}
              label="Previsão do tempo"
              value="Open-Meteo.com"
              trailing="external"
              onPress={() => void openExternal(OPEN_METEO_URL)}
            />
            <SettingsRow
              icon={MapIcon}
              label="Mapas"
              value="© OpenStreetMap, Esri"
              trailing="external"
              onPress={() => void openExternal(OSM_COPYRIGHT_URL)}
              isLast
            />
          </SettingsSection>

          {/* 8. Sair */}
          <View style={styles.logout}>
            <Button variant="secondary" tone="danger" fullWidth icon={LogOut} onPress={() => setConfirmOpen(true)}>
              Sair da conta
            </Button>
          </View>
        </View>
      </ScreenContainer>

      <ConfirmDialog
        open={confirmOpen}
        tone="danger"
        title="Sair da conta?"
        message="Você vai precisar entrar de novo com e-mail e senha."
        confirmLabel="Sair da conta"
        loading={signingOut}
        loadingLabel="Saindo…"
        cancelLabel="Continuar conectado"
        onConfirm={() => void handleSignOut()}
        onCancel={() => (signingOut ? undefined : setConfirmOpen(false))}
      />
    </>
  );
}
