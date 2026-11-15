import X from 'lucide-react-native/icons/x';
import { useMemo, type ReactNode } from 'react';
import { Platform, Modal as RNModal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { radius, spacing, touch } from '@/theme/tokens';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** When false, backdrop, X and back/Escape are ignored (in-flight request). */
  dismissable?: boolean;
};

export function Modal({ open, title, onClose, children, dismissable = true }: ModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
          backgroundColor: colors.overlay,
        },
        panel: {
          width: '100%',
          maxWidth: 400,
          maxHeight: '80%',
          backgroundColor: colors.card,
          borderRadius: radius.cardLg,
          padding: spacing.xl,
          gap: spacing.md,
          elevation: 8,
          shadowColor: colors.text,
          shadowOpacity: 0.15,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
        title: { flex: 1 },
        close: {
          width: touch.min,
          height: touch.min,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: -spacing.sm,
        },
        body: { flexShrink: 1 },
        bodyContent: { gap: spacing.md },
      }),
    [colors],
  );

  const handleClose = () => {
    if (dismissable) onClose();
  };

  return (
    <RNModal transparent animationType="fade" visible={open} onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessible={false}>
        {/* Inner Pressable swallows taps so only the backdrop closes. */}
        <Pressable style={styles.panel} onPress={() => undefined} accessibilityViewIsModal accessible={false}>
          <View style={styles.header}>
            <Text variant="heading" weight="semibold" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={handleClose} style={styles.close}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={Platform.OS === 'web'}
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
