import Info from 'lucide-react-native/icons/info';
import OctagonAlert from 'lucide-react-native/icons/octagon-alert';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { StyleSheet, View } from 'react-native';

import { CATEGORY_META, CATEGORY_ORDER } from '@/components/alerts/alertMeta';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Text } from '@/components/ui/Text';
import { hasActiveFilters, resultCountLabel, type AlertStatusFilter } from '@/features/alerts/filter';
import { spacing } from '@/theme/tokens';
import type { AlertCategory, AlertSeverity } from '@/types/database';

const ALL = 'todas';

const STATUS_TABS: { id: AlertStatusFilter; label: string }[] = [
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'resolvidos', label: 'Resolvidos' },
  { id: 'todos', label: 'Todos' },
];

const CATEGORY_OPTIONS = [
  { value: ALL, label: 'Todas as categorias' },
  ...CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_META[c].label })),
];

const SEVERITY_CHIPS: { value: AlertSeverity | null; label: string; icon?: typeof Info }[] = [
  { value: null, label: 'Todas' },
  { value: 'critical', label: 'Crítico', icon: OctagonAlert },
  { value: 'warning', label: 'Atenção', icon: TriangleAlert },
  { value: 'info', label: 'Informativo', icon: Info },
];

type AlertFiltersProps = {
  status: AlertStatusFilter;
  category: AlertCategory | null;
  severity: AlertSeverity | null;
  count: number;
  onStatusChange: (status: AlertStatusFilter) => void;
  onCategoryChange: (category: AlertCategory | null) => void;
  onSeverityChange: (severity: AlertSeverity | null) => void;
  onClear: () => void;
};

export function AlertFilters({
  status,
  category,
  severity,
  count,
  onStatusChange,
  onCategoryChange,
  onSeverityChange,
  onClear,
}: AlertFiltersProps) {
  return (
    <View style={styles.wrap}>
      <Tabs
        semantics="tabs"
        accessibilityLabel="Situação"
        tabs={STATUS_TABS}
        active={status}
        onChange={(id) => onStatusChange(id as AlertStatusFilter)}
      />
      <Select
        label="Categoria"
        options={CATEGORY_OPTIONS}
        value={category ?? ALL}
        onChange={(v) => onCategoryChange(v === ALL ? null : (v as AlertCategory))}
      />
      <View style={styles.group}>
        <Text variant="label" weight="semibold">
          Gravidade
        </Text>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {SEVERITY_CHIPS.map((c) => (
            <Chip
              key={c.label}
              role="radio"
              label={c.label}
              icon={c.icon}
              selected={severity === c.value}
              onPress={() => onSeverityChange(c.value)}
            />
          ))}
        </View>
      </View>
      <View style={styles.resultRow}>
        <Text variant="label" tone="muted" numeric accessibilityLiveRegion="polite">
          {resultCountLabel(count, status)}
        </Text>
        {hasActiveFilters({ category, severity }) ? (
          <Button variant="ghost" size="sm" onPress={onClear}>
            Limpar filtros
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
