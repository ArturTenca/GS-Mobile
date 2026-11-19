import { clearScreenCache } from '@/lib/screenCache';
import { useSelectedFarmStore } from '@/stores/selectedFarm';

/** Remove o estado persistido por usuário (fazenda selecionada) ao encerrar a sessão. */
export function clearUserScopedState(userId: string | null): void {
  if (userId) useSelectedFarmStore.getState().clear(userId);
  clearScreenCache(userId);
}
