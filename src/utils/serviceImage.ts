export function resolveServiceImage(_image_key?: string) {
  switch (_image_key) {
    case 'grua.png':
      return require('../../assets/grua.png');
    case 'wheel-flat.png':
      return require('../../assets/wheel-flat.png');
    case 'without-gasoline.png':
      return require('../../assets/without-gasoline.png');
    case 'electric-damage.png':
      return require('../../assets/electric-damage.png');
    case 'engine-dmaged.png':
      return require('../../assets/engine-dmaged.png');
    case 'not-idea-error.png':
      return require('../../assets/not-idea-error.png');
    default:
      return require('../../assets/icon.png'); // Usar el ícono de la app como fallback
  }
};