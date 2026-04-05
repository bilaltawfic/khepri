import type { PlanAdaptationRow } from '@khepri/supabase-client';

import { AdaptationCardFromRow } from '@/components/adaptation/AdaptationCardFromRow';

interface AdaptationBannerProps {
  readonly adaptations: readonly PlanAdaptationRow[];
  readonly onAccept: (id: string) => void;
  readonly onReject: (id: string) => void;
}

export function AdaptationBanner({ adaptations, onAccept, onReject }: AdaptationBannerProps) {
  if (adaptations.length === 0) return null;

  return (
    <>
      {adaptations.map((adaptation) => (
        <AdaptationCardFromRow
          key={adaptation.id}
          adaptation={adaptation}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </>
  );
}
