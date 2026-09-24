import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  useWindowDimensions,
} from 'react-native';

const BTN_SIZE = 54;

const AIBotFloatingButton = ({
  onPress,
  bottom = 85,
  right = 16,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const initialX = screenWidth - BTN_SIZE - right;
  const initialY = screenHeight - BTN_SIZE - bottom;

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const currentPos = useRef({ x: initialX, y: initialY });
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2000),
        Animated.timing(pulseAnim, {
          toValue: 1.28,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.92,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.14,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnim]);

  useEffect(() => {
    const listenerId = pan.addListener((value) => {
      currentPos.current = value;
    });
    return () => {
      pan.removeListener(listenerId);
    };
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(scale, {
          toValue: 1.15,
          friction: 5,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        Animated.spring(scale, {
          toValue: 1.0,
          friction: 5,
          useNativeDriver: false,
        }).start();

        const distMoved = Math.sqrt(
          gestureState.dx * gestureState.dx + gestureState.dy * gestureState.dy
        );

        // If clicked/tapped with minimal movement
        if (distMoved < 7) {
          if (onPress) onPress();
          return;
        }

        // Draggable boundary clamping & edge snapping
        const minX = 14;
        const maxX = screenWidth - BTN_SIZE - 14;
        const minY = Platform.OS === 'ios' ? 70 : 45;
        const maxY = screenHeight - BTN_SIZE - (Platform.OS === 'ios' ? 95 : 75);

        const currentY = currentPos.current.y;
        const clampedY = Math.min(Math.max(currentY, minY), maxY);

        // Snap to nearest edge (left or right) for premium chat-head feel
        const snapX = currentPos.current.x < screenWidth / 2 ? minX : maxX;

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          friction: 6,
          tension: 45,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        pan.flattenOffset();
        Animated.spring(scale, {
          toValue: 1.0,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.buttonBody}>
        <Image
          source={require('../../images/bot_img.png')}
          style={styles.botImage}
          resizeMode="contain"
        />
        <Animated.View style={[styles.askBadge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.askBadgeText}>Ask !</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

export default AIBotFloatingButton;

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
    elevation: 12,
  },
  buttonBody: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  botImage: {
    width: 52,
    height: 52,
  },
  askBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#2327D8',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  askBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
