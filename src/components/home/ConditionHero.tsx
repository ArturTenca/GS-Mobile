import CircleCheck from 'lucide-react-native/icons/circle-check';
import Clock from 'lucide-react-native/icons/clock';
import OctagonAlert from 'lucide-react-native/icons/octagon-alert';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Status } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { formatUpdatedAgo } from '@/lib/formatTime';
import { radius, spacing, type Colors } from '@/theme/tokens';

type HeroMeta = {
  word: string;
  Icon: LucideIcon;
  bg: keyof Colors;
  border: keyof Colors;
  iconColor: keyof Colors;
  wordColor: keyof Colors;
};

const META: Record<Status, HeroMeta> = {
  normal: {
    word: 'Normal',
    Icon: CircleCheck,
    bg: 'successSoft',
    border: 'success',
    iconColor: 'success',
    wordColor: 'successText',
  },
  atencao: {
    word: 'Atenção',
    Icon: TriangleAlert,
    bg: 'warningSoft',
    border: 'warning',
    iconColor: 'warningText',
    wordColor: 'warningText',
  },
  critico: {
    word: 'Crítico',
    Icon: OctagonAlert,
    bg: 'errorSoft',
    border: 'error',
    iconColor: 'error',
    wordColor: 'error',
  },
};

type ConditionHeroProps = {
  status: Status;
  line: string;
  action: string;
  extraLabel: string | null;
  lastReadingAt: string | null;
  now: number;
  primaryKind: 'alert' | 'reading' | 'offline' | null;
  sensorCount: number;
  onViewAlert: () => void;
  onViewMonitoring: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export function ConditionHero({
  status,
  line,
  action,
  extraLabel,
  lastReadingAt,
  now,
  primaryKind,
  sensorCount,
  onViewAlert,
  onViewMonitoring,
  onRefresh,
  refreshing,
}: ConditionHeroProps) {
  const { colors } = useTheme();
  const meta = META[status];
  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: {
          borderRadius: radius.cardLg,
          padding: spacing.xl,
          borderWidth: 2,
          backgroundColor: colors[meta.bg],
          borderColor: colors[meta.border],
        },
        content: { gap: spacing.xs },
        statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
        circle: {
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        word: { color: colors[meta.wordColor], flexShrink: 1 },
        reason: { marginTop: spacing.md },
        extra: { marginTop: spacing.sm },
        button: { marginTop: spacing.lg, alignItems: 'flex-start' },
        divider: { height: 1, backgroundColor: colors.border, marginTop: spacing.lg },
        footer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginTop: spacing.md,
        },
        updated: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
      }),
    [colors, meta],
  );

  const showAction = status !== 'normal' && primaryKind !== null && sensorCount > 0;
  const a11y = `Condição da propriedade: ${meta.word}. ${line} ${action}${extraLabel ? ` ${extraLabel}` : ''}`;
  const Icon = meta.Icon;

  return (
    <View style={styles.box}>
      <View style={styles.content} accessible accessibilityLabel={a11y} accessibilityLiveRegion="polite">
        <Text variant="label" weight="semibold">
          Condição da propriedade
        </Text>
        <View style={styles.statusRow}>
          <View style={styles.circle}>
            <Icon size={32} color={colors[meta.iconColor]} />
          </View>
          <Text variant="display" weight="semibold" style={styles.word}>
            {meta.word}
          </Text>
        </View>
        <Text variant="body" weight="semibold" style={styles.reason}>
          {line}
        </Text>
        <Text variant="body">{action}</Text>
        {extraLabel ? (
          <Text variant="label" weight="semibold" style={styles.extra}>
            {extraLabel}
          </Text>
        ) : null}
      </View>
      {showAction ? (
        <View style={styles.button}>
          <Button
            variant="secondary"
            size="sm"
            onPress={primaryKind === 'alert' ? onViewAlert : onViewMonitoring}
          >
            {primaryKind === 'alert' ? 'Ver alerta' : 'Ver monitoramento'}
          </Button>
        </View>
      ) : null}
      <View style={styles.divider} />
      <View style={styles.footer}>
        <View style={styles.updated}>
          <Clock size={16} color={colors.textMuted} />
          <Text variant="label" tone="muted" numeric style={{ flexShrink: 1 }}>
            {formatUpdatedAgo(lastReadingAt, now)}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="sm"
          icon={RefreshCw}
          loading={refreshing}
          loadingLabel="Atualizando…"
          accessibilityLabel="Atualizar dados da propriedade"
          onPress={onRefresh}
        >
          Atualizar
        </Button>
      </View>
    </View>
  );
}
