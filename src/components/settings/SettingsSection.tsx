import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { spacing } from '@/theme/tokens';

type SettingsSectionProps = {
  title: string;
  /** Content rendered below the card (e.g. a footnote). */
  footer?: ReactNode;
  children: ReactNode;
};

/** Section title + unpadded card; rows draw their own 1px dividers. */
export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  return (
    <View>
      <View style={{ marginBottom: spacing.sm - spacing.lg }}>
        <SectionHeader title={title} />
      </View>
      <Card padded={false}>{children}</Card>
      {footer ? <View style={{ marginTop: spacing.sm }}>{footer}</View> : null}
    </View>
  );
}
