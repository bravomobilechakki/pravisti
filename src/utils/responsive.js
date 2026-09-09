import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';

// Base design reference (standard mobile screen: 375 x 812)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Clamp a number between min and max
 */
export const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/**
 * Static fallback values based on initial window dimensions
 */
const { width: INITIAL_WIDTH, height: INITIAL_HEIGHT } = Dimensions.get('window');
export const SCREEN_WIDTH = INITIAL_WIDTH;
export const SCREEN_HEIGHT = INITIAL_HEIGHT;

/**
 * Static Horizontal Scale
 */
export const scale = (size) => {
  const { width } = Dimensions.get('window');
  return PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size);
};

/**
 * Static Vertical Scale
 */
export const verticalScale = (size) => {
  const { height } = Dimensions.get('window');
  return PixelRatio.roundToNearestPixel((height / BASE_HEIGHT) * size);
};

/**
 * Static Moderate Scale (with adjustable dampening factor)
 */
export const moderateScale = (size, factor = 0.5) => {
  const { width } = Dimensions.get('window');
  const scaled = (width / BASE_WIDTH) * size;
  return PixelRatio.roundToNearestPixel(size + (scaled - size) * factor);
};

/**
 * Static Width Percentage (e.g. wp(50) = 50% of screen width)
 */
export const wp = (percentage) => {
  const { width } = Dimensions.get('window');
  return PixelRatio.roundToNearestPixel((width * percentage) / 100);
};

/**
 * Static Height Percentage (e.g. hp(20) = 20% of screen height)
 */
export const hp = (percentage) => {
  const { height } = Dimensions.get('window');
  return PixelRatio.roundToNearestPixel((height * percentage) / 100);
};

/**
 * Safe Font Size scaling clamped to prevent cut-offs on small screens or giant text on large devices
 */
export const fontSize = (size, factor = 0.35) => {
  const { width } = Dimensions.get('window');
  const scaled = size + ((width / BASE_WIDTH) * size - size) * factor;
  // Clamp between 85% and 125% of the base size to maintain typography integrity
  return PixelRatio.roundToNearestPixel(clamp(scaled, size * 0.85, size * 1.25));
};

export const isSmallDevice = INITIAL_WIDTH < 360;
export const isStandardDevice = INITIAL_WIDTH >= 360 && INITIAL_WIDTH < 415;
export const isLargeDevice = INITIAL_WIDTH >= 415 && INITIAL_WIDTH < 600;
export const isTablet = INITIAL_WIDTH >= 600;

/**
 * Modern Dynamic Responsive Hook for components
 * Reacts dynamically to screen rotations, foldables, and split-screen changes
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  const isSmall = width < 360;
  const isStandard = width >= 360 && width < 415;
  const isLarge = width >= 415 && width < 600;
  const isTab = width >= 600;
  const isLandscape = width > height;

  const dynScale = (size) => PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size);
  const dynVerticalScale = (size) => PixelRatio.roundToNearestPixel((height / BASE_HEIGHT) * size);
  const dynModerateScale = (size, factor = 0.5) => {
    const scaled = (width / BASE_WIDTH) * size;
    return PixelRatio.roundToNearestPixel(size + (scaled - size) * factor);
  };
  const dynWp = (pct) => PixelRatio.roundToNearestPixel((width * pct) / 100);
  const dynHp = (pct) => PixelRatio.roundToNearestPixel((height * pct) / 100);
  const dynFontSize = (size, factor = 0.35) => {
    const scaled = size + ((width / BASE_WIDTH) * size - size) * factor;
    return PixelRatio.roundToNearestPixel(clamp(scaled, size * 0.85, size * 1.25));
  };

  return {
    width,
    height,
    isSmallDevice: isSmall,
    isStandardDevice: isStandard,
    isLargeDevice: isLarge,
    isTablet: isTab,
    isLandscape,
    scale: dynScale,
    verticalScale: dynVerticalScale,
    moderateScale: dynModerateScale,
    wp: dynWp,
    hp: dynHp,
    fontSize: dynFontSize,
  };
};

export default {
  scale,
  verticalScale,
  moderateScale,
  wp,
  hp,
  fontSize,
  clamp,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  isSmallDevice,
  isStandardDevice,
  isLargeDevice,
  isTablet,
  useResponsive,
};
