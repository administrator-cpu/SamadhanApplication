import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Adjust if your asset lives elsewhere.
const ICON = require('../../assets/icon.png');

const LOADING_STATES = [
  'Initializing secure engine...',
  'Establishing connection...',
  'Authenticating credentials...',
  'Preparing your workspace...',
];

const WORDMARK = 'SAMADHAN';
const WORDMARK_WIDTH = 232; // measured cap width at 33px / 0.1em tracking

const C = {
  ground: '#FFFFFF',
  orange: '#F5701E',
  orangeDeep: '#E6452B',
  wordmark: '#F26722',
  tagline: '#6F6A66',
  status: '#3D2B20',
};

export default function InitializingScreen() {
  const insets = useSafeAreaInsets();
  const [loadingStep, setLoadingStep] = useState(0);

  const iconScale = useRef(new Animated.Value(0.62)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconLift = useRef(new Animated.Value(18)).current;

  const wipe = useRef(new Animated.Value(0)).current;
  const rules = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;

  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const statusPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const textInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STATES.length - 1 ? prev + 1 : prev));
    }, 2200);

    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 6.5,
        tension: 78,
        useNativeDriver: true,
      }),
      Animated.spring(iconLift, {
        toValue: 0,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(340),
        Animated.timing(wipe, {
          toValue: 1,
          duration: 520,
          easing: Easing.bezier(0.65, 0, 0.25, 1),
          useNativeDriver: false, // animating width
        }),
      ]),
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(rules, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(820),
        Animated.timing(tagline, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Signal rings — the icon's own arcs, radiating while auth resolves.
    const loopRipple = (value, delay) => {
      const run = () => {
        value.setValue(0);
        Animated.timing(value, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(run);
      };
      const t = setTimeout(run, delay);
      return () => clearTimeout(t);
    };

    const stopA = loopRipple(ripple1, 260);
    const stopB = loopRipple(ripple2, 1060);
    const stopC = loopRipple(ripple3, 1860);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(statusPulse, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      clearInterval(textInterval);
      stopA();
      stopB();
      stopC();
      pulse.stop();
    };
  }, []);

  const ringStyle = (value) => ({
    transform: [
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.85] }) },
    ],
    opacity: value.interpolate({
      inputRange: [0, 0.18, 1],
      outputRange: [0, 0.5, 0],
    }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <StatusBar style="dark" />

      <View style={{ paddingTop: insets.top + 40 }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {/* Warm bloom behind the mark */}
        <Animated.View
          style={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: 999,
            backgroundColor: 'rgba(245,112,30,0.10)',
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [
              { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            ],
          }}
        />

        {/* Signal rings */}
        {[ripple1, ripple2, ripple3].map((value, i) => (
          <Animated.View
            key={`ring-${i}`}
            style={[
              {
                position: 'absolute',
                width: 168,
                height: 168,
                borderRadius: 999,
                borderWidth: 1.5,
                borderColor: C.orange,
              },
              ringStyle(value),
            ]}
          />
        ))}

        {/* The mark */}
        <Animated.View
          style={{
            opacity: iconOpacity,
            transform: [{ scale: iconScale }, { translateY: iconLift }],
          }}
        >
          <Image source={ICON} style={{ width: 108, height: 108 }} className='rounded-lg' resizeMode="contain" />
        </Animated.View>

        <Animated.View
          style={{
            overflow: 'hidden',
            marginTop: 6,
            width: wipe.interpolate({ inputRange: [0, 1], outputRange: [0, WORDMARK_WIDTH] }),
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              width: WORDMARK_WIDTH,
              fontSize: 31,
              lineHeight: 40,
              letterSpacing: 3,
              fontWeight: '800',
              color: C.wordmark,
            }}
            className='text-center'
          >
            {WORDMARK}
          </Text>
        </Animated.View>

        {/* Tagline with drawing rules */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
          <Animated.View
            style={{
              width: 26,
              height: 2,
              borderRadius: 999,
              backgroundColor: C.orange,
              transform: [{ scaleX: rules }],
            }}
          />
          <Animated.Text
            style={{
              marginHorizontal: 12,
              fontSize: 9.5,
              letterSpacing: 1.8,
              fontWeight: '600',
              textTransform: 'uppercase',
              color: C.tagline,
              opacity: tagline,
              transform: [
                { translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) },
              ],
            }}
          >
            AI powered support solution
          </Animated.Text>
          <Animated.View
            style={{
              width: 26,
              height: 2,
              borderRadius: 999,
              backgroundColor: C.orangeDeep,
              transform: [{ scaleX: rules }],
            }}
          />
        </View>
      </View>

      {/* Status line */}
      <View
        style={{
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 32,
          alignItems: 'center',
          width: '100%',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Animated.View
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              backgroundColor: C.orange,
              marginRight: 10,
              opacity: statusPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            }}
          />
          <Text
            style={{
              fontSize: 10.5,
              letterSpacing: 1.6,
              fontWeight: '600',
              textTransform: 'uppercase',
              color: C.status,
            }}
          >
            {LOADING_STATES[loadingStep]}
          </Text>
        </View>
      </View>
    </View>
  );
}
