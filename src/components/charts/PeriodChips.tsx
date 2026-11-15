import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { PERIOD_KEYS, PERIODS, type PeriodKey } from '@/features/charts/periods';
import { spacing } from '@/theme/tokens';

type PeriodChipsProps = {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
};

/** Single-select 24 horas / 7 dias / 30 dias (D-13). */
export function PeriodChips({ value, onChange }: PeriodChipsProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Período">
      {PERIOD_KEYS.map((key) => (
        <Chip
          key={key}
          label={PERIODS[key].label}
          selected={key === value}
          role="radio"
          onPress={() => {
            if (key !== value) onChange(key);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
