import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (standard modern phone design draft: 375 x 812)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scale horizontal dimensions (margin, padding, width)
 */
export const scale = (size) => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
};

/**
 * Scale vertical dimensions (height, marginTop, marginBottom)
 */
export const verticalScale = (size) => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT / BASE_HEIGHT) * size);
};

/**
 * Moderate scaling for padding/font-sizes with custom factor
 */
export const moderateScale = (size, factor = 0.5) => {
  return PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor);
};

/**
 * Width percentage helper (e.g. wp(50) = 50% of screen width)
 */
export const wp = (percentage) => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

/**
 * Height percentage helper (e.g. hp(20) = 20% of screen height)
 */
export const hp = (percentage) => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

/**
 * Font size scaling clamped to avoid excessive overflow or tiny text
 */
export const fontSize = (size) => {
  const scaled = moderateScale(size, 0.4);
  return Math.min(Math.max(scaled, size * 0.85), size * 1.35);
};

export const isSmallDevice = SCREEN_WIDTH < 360;
export const isTablet = SCREEN_WIDTH >= 600;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
