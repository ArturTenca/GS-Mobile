import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Activity, Bell, House, Plus, User, type LucideIcon } from 'lucide-react-native';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/features/theme/ThemeProvider';
import { pendingAlertsLabel } from '@/lib/formatNumber';
import { radius, spacing } from '@/theme/tokens';

const TAB_ICONS: Record<string, LucideIcon> = {
  index: House,
  monitoramento: Activity,
  alertas: Bell,
  perfil: User,
};

const TAB_NAMES: Record<string, string> = {
  index: 'Início',
  monitoramento: 'Monitoramento',
  alertas: 'Alertas',
  perfil: 'Perfil',
};

// Visible labels; switch monitoramento to 'Monitorar' if it clips at 360px (A3).
// accessibilityLabel always uses the full TAB_NAMES entry.
export const TAB_VISIBLE_LABELS: Record<string, string> = {
  index: 'Início',
  monitoramento: 'Monitoramento',
  alertas: 'Alertas',
  perfil: 'Perfil',
};

export function TabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm + insets.bottom,
          overflow: 'visible',
        },
        item: {
          flex: 1,
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
        },
        pill: {
          width: 56,
          height: 32,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
        },
        badge: {
          position: 'absolute',
          top: -4,
          right: 4,
          height: 20,
          minWidth: 20,
          paddingHorizontal: 4,
          borderRadius: radius.pill,
          backgroundColor: colors.errorFill,
          borderWidth: 2,
          borderColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: { letterSpacing: -0.2 },
        addCircle: {
          width: 56,
          height: 56,
          borderRadius: radius.pill,
          borderWidth: 4,
          borderColor: colors.card,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY: -16 }],
          ...Platform.select({
            web: { boxShadow: `0px 4px 8px ${colors.text}33` } as object,
            default: {
              shadowColor: colors.text,
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            },
          }),
        },
        addCaption: { marginTop: -12 },
      }),
    [colors, insets.bottom],
  );

  // Map with the original index first, filter second, so isFocused stays correct.
  const items = state.routes.map((route, index) => ({ route, index })).filter(({ route }) => TAB_ICONS[route.name]);

  const renderTab = (route: (typeof state.routes)[number], index: number) => {
    const Icon = TAB_ICONS[route.name];
    const isFocused = state.index === index;
    const badge = descriptors[route.key]?.options.tabBarBadge;
    const badgeText = typeof badge === 'number' ? (badge > 0 ? String(badge) : null) : typeof badge === 'string' && badge ? badge : null;
    const badgeCount = typeof badge === 'number' ? badge : badgeText ? 10 : 0;

    const onPress = () => {
      const event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigateToTab(route.key);
      }
    };

    const fg = isFocused ? colors.primaryText : colors.textMuted;
    const baseName = TAB_NAMES[route.name] ?? route.name;
    const name = route.name === 'alertas' && badgeCount > 0 ? `${baseName}, ${pendingAlertsLabel(badgeCount)}` : baseName;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        accessibilityLabel={name}
        onPress={onPress}
        style={styles.item}
      >
        {({ pressed }) => (
          <>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: isFocused ? colors.primarySoft : pressed ? colors.primarySoft : 'transparent',
                  opacity: !isFocused && pressed ? 0.6 : 1,
                },
              ]}
            >
              <Icon size={24} color={fg} strokeWidth={isFocused ? 2.5 : 2} />
              {badgeText ? (
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.badge}>
                  <Text variant="caption" weight="semibold" numeric maxFontSizeMultiplier={1.2} style={{ color: colors.onPrimary }}>
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              variant="caption"
              weight={isFocused ? 'semibold' : 'regular'}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              adjustsFontSizeToFit={Platform.OS !== 'web'}
              minimumFontScale={0.85}
              style={[styles.label, { color: fg }]}
            >
              {TAB_VISIBLE_LABELS[route.name] ?? name}
            </Text>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <View accessibilityRole="tablist" accessibilityLabel="Navegação principal" style={styles.bar}>
      {items.slice(0, 2).map(({ route, index }) => renderTab(route, index))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Adicionar"
        accessibilityHint="Cadastrar uma fazenda ou um sensor"
        hitSlop={{ top: 16 }}
        onPress={() => router.push('/adicionar')}
        style={styles.item}
      >
        {({ pressed }) => (
          <>
            <View style={[styles.addCircle, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]}>
              <Plus size={32} color={colors.onPrimary} strokeWidth={2.5} />
            </View>
            <Text variant="caption" numberOfLines={1} maxFontSizeMultiplier={1.2} style={[styles.addCaption, { color: colors.textMuted }]}>
              Adicionar
            </Text>
          </>
        )}
      </Pressable>
      {items.slice(2).map(({ route, index }) => renderTab(route, index))}
    </View>
  );
}
