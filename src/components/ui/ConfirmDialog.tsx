import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Notice } from '@/components/ui/Notice';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  loading = false,
  loadingLabel,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} dismissable={!loading}>
      <View style={{ gap: spacing.md }}>
        <Text variant="label" tone="muted">
          {message}
        </Text>
        {error ? <Notice variant="error">{error}</Notice> : null}
        <Button
          variant={tone === 'danger' ? 'danger' : 'primary'}
          fullWidth
          loading={loading}
          loadingLabel={loadingLabel}
          disabled={loading}
          onPress={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" fullWidth disabled={loading} onPress={onCancel}>
          {cancelLabel}
        </Button>
      </View>
    </Modal>
  );
}
