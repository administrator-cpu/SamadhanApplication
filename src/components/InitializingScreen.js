import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { BottomInset, TopInset } from './layout/Screen';

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

  // Animated values are stable refs, so the animated styles are built once.
  const anim = useMemo(
    () => ({
      glow: {
        opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
      },
      rings: [ripple1, ripple2, ripple3].map((value) => ({
        transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.85] }) }],
        opacity: value.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.5, 0] }),
      })),
      icon: { opacity: iconOpacity, transform: [{ scale: iconScale }, { translateY: iconLift }] },
      wipe: { width: wipe.interpolate({ inputRange: [0, 1], outputRange: [0, WORDMARK_WIDTH] }) },
      rule: { transform: [{ scaleX: rules }] },
      tagline: {
        opacity: tagline,
        transform: [{ translateY: tagline.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }],
      },
      status: { opacity: statusPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
    }),
    [glow, ripple1, ripple2, ripple3, iconOpacity, iconScale, iconLift, wipe, rules, tagline, statusPulse],
  );

  return (
    <View className="flex-1 bg-[#FFFFFF]">
      <StatusBar style="dark" />

      <TopInset extra={40} />

      <View className="flex-1 items-center justify-center w-full">
        {/* Warm bloom behind the mark */}
        <Animated.View
          className="absolute w-[240px] h-[240px] rounded-[999px] bg-[rgba(245,112,30,0.10)]"
          style={anim.glow}
        />

        {/* Signal rings */}
        {anim.rings.map((ring, i) => (
          <Animated.View
            key={`ring-${i}`}
            className="absolute w-[168px] h-[168px] rounded-[999px] border-[1.5px] border-[#F5701E]"
            style={ring}
          />
        ))}

        {/* The mark */}
        <Animated.View style={anim.icon}>
          <Image source={ICON} className='rounded-lg w-[108px] h-[108px]' resizeMode="contain" />
        </Animated.View>

        <Animated.View className="overflow-hidden mt-[6px]" style={anim.wipe}>
          <Text
            numberOfLines={1}
            className='text-center w-[232px] text-[31px] leading-[40px] tracking-[3px] font-extrabold text-[#F26722]'
          >
            {WORDMARK}
          </Text>
        </Animated.View>

        {/* Tagline with drawing rules */}
        <View className="flex-row items-center mt-[14px]">
          <Animated.View className="w-[26px] h-[2px] rounded-[999px] bg-[#F5701E]" style={anim.rule} />
          <Animated.Text
            className="mx-[12px] text-[9.5px] tracking-[1.8px] font-semibold uppercase text-[#6F6A66]"
            style={anim.tagline}
          >
            AI powered support solution
          </Animated.Text>
          <Animated.View className="w-[26px] h-[2px] rounded-[999px] bg-[#E6452B]" style={anim.rule} />
        </View>
      </View>

      {/* Status line */}
      <BottomInset extra={40} className="px-[32px] items-center w-full">
        <View className="flex-row items-center">
          <Animated.View
            className="w-[7px] h-[7px] rounded-[999px] bg-[#F5701E] mr-[10px]"
            style={anim.status}
          />
          <Text
            className="text-[10.5px] tracking-[1.6px] font-semibold uppercase text-[#3D2B20]"
          >
            {LOADING_STATES[loadingStep]}
          </Text>
        </View>
      </BottomInset>
    </View>
  );
}
