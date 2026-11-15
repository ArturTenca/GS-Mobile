import { useFocusEffect, useRouter } from 'expo-router';
import { CircleCheck, LandPlot, ListFilter } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AlertFilters } from '@/components/alerts/AlertFilters';
import { AlertRow } from '@/components/alerts/AlertRow';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { DemoBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { filterAlerts } from '@/features/alerts/filter';
import { useAlertFilterStore } from '@/features/alerts/useAlertFilterStore';
import { useAlerts } from '@/hooks/useAlerts';
import { useCurrentProperty } from '@/hooks/useCurrentProperty';
import { useNow } from '@/hooks/useNow';
import { spacing } from '@/theme/tokens';

export default function AlertasScreen() {
  const router = useRouter();
  const property = useCurrentProperty();
  const propertyId = property.data?.id ?? null;
  const alertsQuery = useAlerts(propertyId);
  const now = useNow();
  const { status, category, severity, setStatus, setCategory, setSeverity, clearFilters } =
    useAlertFilterStore();
  const [refreshing, setRefreshing] = useState(false);

  const { refetch } = alertsQuery;
  useFocusEffect(
    useCallback(() => {
      if (propertyId) void refetch();
    }, [propertyId, refetch]),
  );

  const all = useMemo(() => alertsQuery.data ?? [], [alertsQuery.data]);
  const visible = useMemo(
    () => filterAlerts(all, { status, category, severity }),
    [all, status, category, severity],
  );
  const hasDemo = all.some((a) => a.isDemo);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([property.refetch(), refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  let body;
  let centered = false;
  if (property.isLoading || (propertyId && alertsQuery.isLoading)) {
    centered = true;
    body = <LoadingState message="Carregando alertas…" />;
  } else if (property.isError) {
    centered = true;
    body = <ErrorState onRetry={() => void property.refetch()} retrying={property.isFetching} />;
  } else if (!property.data) {
    centered = true;
    body = (
      <EmptyState
        icon={LandPlot}
        title="Cadastre sua primeira fazenda"
        description="Os alertas aparecem aqui depois que você cadastrar uma fazenda e os sensores."
        actionVariant="primary"
        actionLabel="Adicionar fazenda"
        onAction={() => router.push('/adicionar/fazenda' as never)}
      />
    );
  } else if (alertsQuery.isError) {
    centered = true;
    body = <ErrorState onRetry={() => void refetch()} retrying={alertsQuery.isFetching} />;
  } else if (all.length === 0) {
    centered = true;
    body = (
      <EmptyState
        icon={CircleCheck}
        title="Nenhum alerta por aqui"
        description="Quando uma leitura passar dos limites ou um sensor parar de enviar dados, o aviso aparece nesta lista."
      />
    );
  } else {
    const filtersActive = category !== null || severity !== null;
    let list;
    if (visible.length > 0) {
      list = (
        <Card padded={false}>
          {visible.map((a, i) => (
            <AlertRow
              key={a.id}
              variant="full"
              title={a.title}
              severity={a.severity}
              status={a.status}
              category={a.category}
              description={a.description}
              recommendation={a.recommendation}
              areaName={a.areaName}
              sensorName={a.sensorName}
              triggeredAt={a.triggeredAt}
              now={now}
              isLast={i === visible.length - 1}
              onPress={() => router.push({ pathname: '/alerta/[id]', params: { id: a.id } })}
            />
          ))}
        </Card>
      );
    } else if (filtersActive) {
      list = (
        <EmptyState
          icon={ListFilter}
          title="Nenhum alerta com esses filtros"
          description="Mude a categoria ou a gravidade para ver outros alertas."
          actionVariant="secondary"
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      );
    } else if (status === 'pendentes') {
      list = (
        <EmptyState
          icon={CircleCheck}
          title="Tudo em ordem"
          description="Nenhum alerta pendente nesta fazenda."
          actionVariant="secondary"
          actionLabel="Ver resolvidos"
          onAction={() => setStatus('resolvidos')}
        />
      );
    } else {
      list = (
        <EmptyState
          icon={CircleCheck}
          title="Nenhum alerta por aqui"
          description="Não há alertas nesta situação."
        />
      );
    }
    body = (
      <>
        {hasDemo ? (
          <View style={styles.demo}>
            <DemoBadge size="sm" />
          </View>
        ) : null}
        <AlertFilters
          status={status}
          category={category}
          severity={severity}
          count={visible.length}
          onStatusChange={setStatus}
          onCategoryChange={setCategory}
          onSeverityChange={setSeverity}
          onClear={clearFilters}
        />
        {list}
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Alertas" />
      <ScreenContainer centered={centered} refreshing={refreshing} onRefresh={() => void handleRefresh()}>
        {body}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  demo: { flexDirection: 'row', marginBottom: -spacing.sm },
});
