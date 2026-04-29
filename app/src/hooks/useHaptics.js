// src/hooks/useHaptics.js
export const useHaptics = () => {
  const triggerHaptic = (duration = 15) => {
    // Verificamos si el celular soporta vibración
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(duration);
    }
  };

  return { triggerHaptic };
};