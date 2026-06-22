export const useRightHandedSystem = false;

export function myRunRenderLoop(engine, framePerSecond, frameFunc) {
  const getFps = typeof framePerSecond === "function" ? framePerSecond : () => framePerSecond;
  engine.maxFPS = getFps();
  engine.runRenderLoop(() => {
    engine.maxFPS = getFps();
    frameFunc();
  });
}
