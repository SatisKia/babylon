export const useRightHandedSystem = false;

export function runRenderLoop(engine, framePerSecond, frameFunc) {
  const getFps = typeof framePerSecond === "function" ? framePerSecond : () => framePerSecond;
  engine.maxFPS = getFps();
  engine.runRenderLoop(() => {
    engine.maxFPS = getFps();
    frameFunc();
  });
}
