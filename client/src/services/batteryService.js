/**
 * Service to handle the Web Battery API
 * Returns { level: number, isCharging: boolean } or null if not supported
 */
export const getBatteryStatus = async () => {
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      return {
        level: battery.level, // 0.0 to 1.0
        isCharging: battery.charging
      };
    }
    return null;
  } catch (err) {
    console.error('Battery API Error:', err);
    return null;
  }
};
