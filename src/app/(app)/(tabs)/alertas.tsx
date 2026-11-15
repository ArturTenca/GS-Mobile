import { useRouter } from 'expo-router';
import { Bell, LandPlot } from 'lucide-react-native';

import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useCurrentProperty } from '@/hooks/useCurrentProperty';

export default function AlertasScreen() {
  const router = useRouter();
  const property = useCurrentProperty();

  let body;
  if (property.isLoading) {
    body = <LoadingState message="Carregando alertas…" />;
  } else if (property.isError) {
    body = <ErrorState onRetry={() => void property.refetch()} retrying={property.isFetching} />;
  } else if (!property.data) {
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
  } else {
    body = <EmptyState icon={Bell} title="Alertas em breve" description="Aqui vão aparecer os avisos sobre sua lavoura." />;
  }

  return (
    <>
      <ScreenHeader title="Alertas" />
      <ScreenContainer centered>{body}</ScreenContainer>
    </>
  );
}
