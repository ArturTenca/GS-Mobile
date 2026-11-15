import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SEVERITY_META, STATUS_META } from '@/components/alerts/alertMeta';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatRelative } from '@/lib/formatTime';
import { radius, spacing } from '@/theme/tokens';
import type { AlertSeverity, AlertStatus } from '@/types/database';

type AlertRowProps = {
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
  areaName: string | null;
  triggeredAt: string;
  now: number;
  isLast: boolean;
  onPress: () => void;
};

export function AlertRow({ title, severity, status, areaName, triggeredAt, now, isLast, onPress }: AlertRowProps) {
  const { colors } = useTheme();
  const sev = SEVERITY_META[severity];
  const st = STATUS_META[status];
  const SevIcon = sev.icon;
  const subtitle = `${areaName || 'Propriedade'} · ${formatRelative(triggeredAt, now)}`;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          minHeight: 72,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.border,
        },
        lead: {
          width: 40,
          height: 40,
          borderRadius: radius.pill,
          backgroundColor: colors[sev.circleBg],
          alignItems: 'center',
          justifyContent: 'center',
        },
        body: { flex: 1, gap: spacing.xs },
        badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.xs },
      }),
    [colors, isLast, sev],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sev.label}: ${title}. ${subtitle}. ${st.label}. Abrir detalhes`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: colors.background } : null]}
    >
      <View style={styles.lead} importantForAccessibility="no" accessibilityElementsHidden>
        <SevIcon size={20} color={colors[sev.circleFg]} />
      </View>
      <View style={styles.body}>
        <Text variant="body" weight="semibold" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="label" tone="muted" numberOfLines={1}>
          {subtitle}
        </Text>
        <View style={styles.badges}>
          <Badge variant={sev.badge} icon={sev.icon}>
            {sev.label}
          </Badge>
          <Badge variant={st.badge} icon={st.icon}>
            {st.label}
          </Badge>
        </View>
      </View>
      <ChevronRight size={20} color={colors.textMuted} />
    </Pressable>
  );
}
