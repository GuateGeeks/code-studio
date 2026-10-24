// Diagnostic F0 workload: native VM targets, native scheduler and real WebGL.
// This is deliberately fixed-size and unavailable as arbitrary user code.
export async function measureScenePerformance({vm, renderer}, payload = {}) {
  if (payload.spriteCount !== 100 || payload.durationMs !== 2000) throw new Error('Only the fixed F0 100-sprite / 2000-ms probe is supported');
  vm.stopAll();
  const hero = vm.runtime.getSpriteTargetByName('hero');
  const original = {x: hero.x, y: hero.y, size: hero.size};
  const draw = renderer.draw;
  const targets = [hero];
  const timestamps = [];
  const drawDurations = [];
  const gl = renderer._gl;
  const graphics = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = graphics ? {vendor: gl.getParameter(graphics.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(graphics.UNMASKED_RENDERER_WEBGL)} : null;
  let started;
  let ended;
  try {
    for (let index = 1; index < 100; index++) {
      const clone = hero.makeClone();
      if (!clone) throw new Error('Native VM refused the 100-sprite workload');
      vm.runtime.addTarget(clone);
      targets.push(clone);
    }
    targets.forEach(target => target.setSize(35));
    renderer.draw = function (...args) {
      const before = performance.now();
      targets.forEach((target, index) => target.setXY(-216 + (index % 10) * 48 + Math.sin(timestamps.length / 5) * 2, -153 + Math.floor(index / 10) * 34, true));
      draw.apply(this, args);
      // Account for completed GPU work rather than queued JS draw calls only.
      gl.finish();
      const after = performance.now();
      timestamps.push(after);
      drawDurations.push(after - before);
    };
    started = performance.now();
    await new Promise(resolve => setTimeout(resolve, payload.durationMs));
    ended = performance.now();
    const intervals = timestamps.slice(1).map((at, index) => at - timestamps[index]);
    const percentile = (values, p) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.ceil(values.length * p) - 1)] ?? null;
    return {
      spriteCount: targets.length, nativeTargetCount: vm.runtime.targets.filter(target => !target.isStage).length,
      frames: timestamps.length, durationMs: ended - started,
      completedDrawsPerSecond: timestamps.length * 1000 / (ended - started),
      frameIntervalMs: {median: percentile(intervals, 0.5), p95: percentile(intervals, 0.95), max: intervals.length ? Math.max(...intervals) : null},
      drawMs: {median: percentile(drawDurations, 0.5), p95: percentile(drawDurations, 0.95), max: drawDurations.length ? Math.max(...drawDurations) : null},
      gpu,
      method: 'Native Scratch VM timer; 1 original + 99 native clones; reposition 100 targets before each scheduled renderer.draw; gl.finish confirms WebGL completion. This is draw throughput, not display compositor FPS or arbitrary-script throughput.'
    };
  } finally {
    renderer.draw = draw;
    vm.stopAll(); // Native stop disposes every clone and its drawable.
    hero.setSize(original.size);
    hero.setXY(original.x, original.y, true);
  }
}
