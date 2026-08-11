import { useEffect, useState } from 'react';

export function useCurrentMinute(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleRefresh = () => {
      const milliseconds = Date.now();
      const untilNextMinute = 60_000 - (milliseconds % 60_000) + 25;
      timeout = setTimeout(() => {
        setNow(new Date());
        scheduleRefresh();
      }, untilNextMinute);
    };
    scheduleRefresh();
    return () => clearTimeout(timeout);
  }, []);

  return now;
}
