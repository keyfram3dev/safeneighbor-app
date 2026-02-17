const canVibrate = () => 'vibrate' in navigator;

// Light tap - button presses, signal play
export const tapHaptic = () => {
  if (canVibrate()) navigator.vibrate(50);
};

// Medium pulse - recording start/stop
export const pulseHaptic = () => {
  if (canVibrate()) navigator.vibrate(200);
};

// Alert pattern - emergency mode activation
export const alertHaptic = () => {
  if (canVibrate()) navigator.vibrate([200, 100, 200]);
};

// Warning pattern - data purge
export const warningHaptic = () => {
  if (canVibrate()) navigator.vibrate([100, 50, 100, 50, 300]);
};
