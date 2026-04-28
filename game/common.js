export const useRightHandedSystem = false;

export function runRenderLoop(engine, frameInterval, frameFunc) {
  let accumulation = 0;
  let lastTick = performance.now();
  const getInterval = typeof frameInterval === "function" ? frameInterval : () => frameInterval;
  engine.runRenderLoop(() => {
    const now = performance.now();
    const interval = getInterval();
    accumulation += now - lastTick;
    lastTick = now;
    if (accumulation < interval) return;
    accumulation -= interval;
    if (accumulation > interval) accumulation = 0;
    frameFunc(now);
  });
}
