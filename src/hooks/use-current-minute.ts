import { useEffect, useState } from 'react';

import { appNow, hasFixedE2EClock } from '@/services/app-clock';

export function useCurrentMinute(): Date {
  const [now, setNow] = useState(appNow);

  useEffect(() => {
    if (hasFixedE2EClock()) return;

    let timeout: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      const milliseconds = Date.now();
      const untilNextMinute = 60_000 - (milliseconds % 60_000) + 25;
      timeout = setTimeout(() => {
        setNow(appNow());
        scheduleRefresh();
      }, untilNextMinute);
    };
    scheduleRefresh();
    return () => clearTimeout(timeout);
  }, []);

  return now;
}
