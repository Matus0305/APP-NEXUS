// src/utils/haptics.js

export const triggerHaptic = (type = 'light') => {
  // Verifica si el teléfono soporta vibración
  if (!navigator.vibrate) return;

  switch (type) {
    case 'light':
      // Un toque súper sutil (como el teclado de un iPhone)
      navigator.vibrate(10); 
      break;
    case 'medium':
      // Para botones de guardar o acciones importantes
      navigator.vibrate(20); 
      break;
    case 'heavy':
      // Para alertas, errores o eliminar cosas (Doble vibración)
      navigator.vibrate([30, 50, 30]); 
      break;
    default:
      navigator.vibrate(10);
  }
};