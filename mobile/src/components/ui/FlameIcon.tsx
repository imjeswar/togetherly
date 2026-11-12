import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface FlameIconProps {
  size?: number;
  isLit?: boolean;
  color?: string;
}

export const FlameIcon: React.FC<FlameIconProps> = ({ size = 28, isLit = true, color }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLit) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [isLit]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Defs>
            <LinearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#D9B77E" />
              <Stop offset="50%" stopColor="#E8A0A8" />
              <Stop offset="100%" stopColor="#F97316" />
            </LinearGradient>
            <LinearGradient id="flameGlow" x1="0%" y1="100%" x2="0%" y2="0%">
              <Stop offset="0%" stopColor="#FFF8F5" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#D9B77E" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>
          {/* Flame outer body */}
          <Path
            d="M12 2C9.5 6.5 6 9.5 6 14C6 17.31 8.69 20 12 20C15.31 20 18 17.31 18 14C18 9.5 14.5 6.5 12 2Z"
            fill="url(#flameGrad)"
          />
          {/* Flame inner hot core */}
          <Path
            d="M12 9C10.5 11.5 9 13.5 9 15.5C9 17.15 10.35 18.5 12 18.5C13.65 18.5 15 17.15 15 15.5C15 13.5 13.5 11.5 12 9Z"
            fill="url(#flameGlow)"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

