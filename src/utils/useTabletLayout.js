import { useWindowDimensions } from "react-native";

const TABLET_BREAKPOINT = 768;
const MAX_CONTENT_WIDTH = 620;
// Base design was built for a ~390px wide phone.
const BASE_WIDTH = 390;

/**
 * Returns tablet-layout helpers:
 *  - isTablet:      true when screen is >= 768px wide
 *  - contentWidth:  the width to use for the centered content container
 *  - screenWidth:   raw screen width
 *  - sp(n):         scale a spacing/font value proportionally (capped on tablets)
 *  - contentStyle:  ready-made style object to apply to the inner content wrapper
 */
export function useTabletLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const contentWidth = isTablet ? Math.min(width, MAX_CONTENT_WIDTH) : width;

  // Scale factor: on tablets we allow up to ~1.15× larger, on phones it is 1:1.
  const scale = isTablet
    ? Math.min(contentWidth / BASE_WIDTH, 1.15)
    : 1;

  /** Scale a spacing or font-size value. */
  const sp = (n) => Math.round(n * scale);

  /**
   * Wrap the ScrollView's inner content in a View with this style to
   * centre it and cap its width on tablets.
   */
  const contentStyle = isTablet
    ? {
        width: contentWidth,
        alignSelf: "center",
      }
    : {};

  return { isTablet, contentWidth, screenWidth: width, sp, contentStyle };
}
