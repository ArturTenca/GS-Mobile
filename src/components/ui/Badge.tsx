import CircleCheck from 'lucide-react-native/icons/circle-check';
import FlaskConical from 'lucide-react-native/icons/flask-conical';
import OctagonAlert from 'lucide-react-native/icons/octagon-alert';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import type { LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

// Demo labeling follows simulated readings: shown wherever a farm has demo sensors (D-16).
export const DEMO_LABEL_SCOPE = 'simulated-readings';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'alert' | 'error';

type BadgeProps = {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  accessibilityLabel?: string;
  children: string;
};

export function Badge({ variant = 'default', icon: Icon, accessibilityLabel, children }: BadgeProps) {
  const { colors } = useTheme();
  const { bg, fg } = useMemo(() => {
    const map: Record<BadgeVariant, { bg: string; fg: string }> = {
      default: { bg: colors.background, fg: colors.text },
      primary: { bg: colors.primarySoft, fg: colors.primaryText },
      success: { bg: colors.successSoft, fg: colors.successText },
      warning: { bg: colors.warningSoft, fg: colors.warningText },
      alert: { bg: colors.alertSoft, fg: colors.alertText },
      error: { bg: colors.errorSoft, fg: colors.error },
    };
    return map[variant];
  }, [colors, variant]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          minHeight: 24,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.pill,
          backgroundColor: bg,
        },
      }),
    [bg],
  );

  return (
    <View style={styles.pill} accessible accessibilityLabel={accessibilityLabel}>
      {Icon ? (
        <View importantForAccessibility="no" accessibilityElementsHidden>
          <Icon size={16} color={fg} />
        </View>
      ) : null}
      <Text variant="caption" weight="semibold" style={{ color: fg }}>
        {children}
      </Text>
    </View>
  );
}

export type Status = 'normal' | 'atencao' | 'critico';

const STATUS_MAP: Record<Status, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  normal: { label: 'Normal', variant: 'success', icon: CircleCheck },
  atencao: { label: 'Atenção', variant: 'warning', icon: TriangleAlert },
  critico: { label: 'Crítico', variant: 'error', icon: OctagonAlert },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_MAP[status];
  return (
    <Badge variant={s.variant} icon={s.icon} accessibilityLabel={`Condição: ${s.label}`}>
      {s.label}
    </Badge>
  );
}

export function DemoBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <View style={size === 'md' ? styles.md : undefined}>
      <Badge variant="primary" icon={FlaskConical}>
        Dados demonstrativos
      </Badge>
    </View>
  );
}

const styles = StyleSheet.create({
  md: { paddingVertical: spacing.xs },
});
