import { ChevronDown, MapPin, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { OptionList } from '@/components/ui/OptionList';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatHa } from '@/lib/geo';
import { radius, spacing } from '@/theme/tokens';
import type { Property } from '@/types/database';

type FarmSelectorProps = {
  farms: Property[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddFarm: () => void;
};

function farmSubtitle(farm: Property): string {
  const place = [farm.city, farm.state].filter(Boolean).join('/');
  const area = farm.boundary && farm.area_ha != null ? formatHa(Number(farm.area_ha)) : null;
  return [place, area].filter(Boolean).join(' · ');
}

export function FarmSelector({ farms, selectedId, onSelect, onAddFarm }: FarmSelectorProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = farms.find((f) => f.id === selectedId) ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        trigger: {
          minHeight: 56,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        triggerPressed: { backgroundColor: colors.background },
        triggerText: { flex: 1 },
      }),
    [colors],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fazenda selecionada: ${selected?.name ?? 'nenhuma'}. Trocar fazenda`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
      >
        <MapPin size={20} color={colors.textMuted} />
        <View style={styles.triggerText}>
          <Text variant="caption" tone="muted">
            Fazenda
          </Text>
          <Text variant="body" weight="semibold" numberOfLines={1}>
            {selected?.name ?? ''}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.textMuted} />
      </Pressable>

      <Modal open={open} title="Escolher fazenda" onClose={() => setOpen(false)}>
        <OptionList
          options={farms.map((farm) => ({ value: farm.id, label: farm.name, subtitle: farmSubtitle(farm) }))}
          value={selectedId}
          rowMinHeight={56}
          accessibilityLabel="Fazendas"
          onChange={(id) => {
            onSelect(id);
            setOpen(false);
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          onPress={() => {
            setOpen(false);
            onAddFarm();
          }}
        >
          Adicionar fazenda
        </Button>
      </Modal>
    </>
  );
}
