export const createThrottle = ({ maxBatchesPerSec }) => {
  let tick = Date.now();
  let used = 0;

  async function wait() {
    const now = Date.now();
    if (now - tick >= 1000) {
      tick = now;
      used = 0;
    }
    used++;
    if (used > maxBatchesPerSec) {
      await new Promise((r) => setTimeout(r, 30));
      return wait();
    }
  }

  return { wait };
};
