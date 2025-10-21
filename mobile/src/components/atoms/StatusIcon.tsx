import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StatusIconProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export default function StatusIcon({ status }: StatusIconProps) {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  // Spinning animation for "sending" status
  useEffect(() => {
    if (status === 'sending') {
      // Start fade in
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      // Start spinning animation
      const spinAnimation = Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();

      return () => {
        spinAnimation.stop();
      };
    } else {
      // Fade in for other statuses
      Animated.timing(fadeValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [status]);

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate: spin }], opacity: fadeValue },
            ]}
          >
            <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
          </Animated.View>
        );
      case 'sent':
        return (
          <Animated.View style={[styles.iconContainer, { opacity: fadeValue }]}>
            <MaterialCommunityIcons name="check" size={14} color="#999" />
          </Animated.View>
        );
      case 'delivered':
        return (
          <Animated.View style={[styles.iconContainer, { opacity: fadeValue }]}>
            <MaterialCommunityIcons name="check-all" size={14} color="#999" />
          </Animated.View>
        );
      case 'read':
        return (
          <Animated.View style={[styles.iconContainer, { opacity: fadeValue }]}>
            <MaterialCommunityIcons name="check-all" size={14} color="#4A90E2" />
          </Animated.View>
        );
      case 'failed':
        return (
          <Animated.View style={[styles.iconContainer, { opacity: fadeValue }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#f44336" />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return renderIcon();
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

