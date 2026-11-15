import { ChevronRight, ListChecks } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_META, SEVERITY_META, STATUS_META } from '@/components/alerts/alertMeta';
import { Badge } from '@/components/ui/Badge';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatRelative } from '@/lib/formatTime';
import { radius, spacing } from '@/theme/tokens';
import type { AlertCategory, AlertSeverity, AlertStatus } from '@/types/database';

type AlertRowProps = {
  title: string;
  severity: AlertSeverity;
  status: AlertStatus;
  areaName: string | null;
  triggeredAt: string;
  now: number;
  isLast: boolean;
  onPress: () => void;
  /** 'compact' (default) is the Início look; 'full' is the Alertas list row. */
  variant?: 'compact' | 'full';
  category?: AlertCategory;
  description?: string;
  recommendation?: string | null;
  /** Fallback area label (e.g. sensor_offline rows without an area). */
  sensorName?: string | null;
};

export function AlertRow({
  title,
  severity,
  status,
  areaName,
  triggeredAt,
  now,
  isLast,
  onPress,
  variant = 'compact',
  category,
  description,
  recommendation,
  sensorName,
}: AlertRowProps) {
  const { colors } = useTheme();
  const sev = SEVERITY_META[severity];
  const st = STATUS_META[status];
  const SevIcon = sev.icon;
  const isFull = variant === 'full';
  const placeLabel = areaName || (isFull ? sensorName : null) || 'Propriedade';
  const relative = formatRelative(triggeredAt, now);
  const subtitle = `${placeLabel} · ${relative}`;
  const categoryLabel = category ? CATEGORY_META[category].label : null;
  const meta = [categoryLabel, placeLabel, relative].filter(Boolean).join(' · ');

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
        recommendation: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
        recommendationText: { flex: 1 },
      }),
    [colors, isLast, sev],
  );

  if (!isFull) {
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

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sev.label}, ${st.label.toLowerCase()}: ${title}. ${meta}. Abrir detalhes`}
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
        {description ? (
          <Text variant="label" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {recommendation ? (
          <View style={styles.recommendation}>
            <ListChecks size={16} color={colors.primaryText} />
            <Text variant="label" tone="muted" numberOfLines={2} style={styles.recommendationText}>
              {`O que fazer: ${recommendation}`}
            </Text>
          </View>
        ) : null}
        <Text variant="label" tone="muted" numberOfLines={1}>
          {meta}
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
