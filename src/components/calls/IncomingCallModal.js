// src/components/calls/IncomingCallModal.js
import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Phone, PhoneOff, MessageSquare } from 'lucide-react-native';

const C = {
  paper: '#F7F6F3',
  ink: '#151312',
  pill: '#1B1917',
  muted: '#8A8578',
  body: '#4C4741',
  danger: '#C0392B',
  card: '#FFFFFF',
};

/** A soft-edged blob of colour — radial falloff so nothing shows a seam. */
function Blob({ color, opacity = 0.85, w = 190, h = 170 }) {
  const id = useRef(`b${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <Svg width={w} height={h} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={color} stopOpacity={opacity * 0.55} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

function Lobe({ style, color, opacity, t, phase }) {
  const wander = (from, to) => t.interpolate({ inputRange: [0, 1], outputRange: phase ? [to, from] : [from, to] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.lobe,
        style,
        { transform: [{ translateX: wander(-16, 18) }, { translateY: wander(14, -18) }, { scale: wander(1, 1.2) }] },
      ]}
    >
      <Blob color={color} opacity={opacity} />
    </Animated.View>
  );
}

/** The liquid orb: soft colour currents drifting inside a glass shell. */
function Bloom({ breathing }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const slow = useRef(new Animated.Value(0)).current;
  const fast = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pingPong = (v, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      );
    const loops = [pingPong(breathe, 3500), pingPong(slow, 7000), pingPong(fast, 4600)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [breathe, slow, fast]);

  // The shell squashes and tilts like a drop holding its own weight.
  const shellStyle = {
    transform: [
      { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, breathing ? 1.04 : 1.02] }) },
      { rotate: breathe.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '3deg'] }) },
      { scaleX: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
      { scaleY: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
    ],
  };
  const sheenStyle = {
    opacity: fast.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.5] }),
    transform: [
      { translateX: fast.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) },
      { translateY: fast.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) },
      { scale: fast.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) },
    ],
  };
  const poolStyle = {
    opacity: slow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.75] }),
    transform: [{ translateX: slow.interpolate({ inputRange: [0, 1], outputRange: [-12, 14] }) }],
  };

  return (
    <Animated.View style={[styles.bloom, shellStyle]}>
      <Lobe t={slow} style={styles.lobeTL} color="#8BBAFF" opacity={0.8} />
      <Lobe t={fast} style={styles.lobeTR} color="#B294FF" opacity={0.72} />
      <Lobe t={slow} phase style={styles.lobeBR} color="#FFAF6E" opacity={0.74} />
      <Lobe t={fast} phase style={styles.lobeBL} color="#8CE0BC" opacity={0.7} />

      {/* glass body: the paper wash reads through, then the meniscus rides on top */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.38)']}
        locations={[0, 0.36, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
        <Blob color="#FFFFFF" opacity={0.95} w={104} h={62} />
      </Animated.View>
      <Animated.View style={[styles.pool, poolStyle]} pointerEvents="none">
        <Blob color="#FFFFFF" opacity={0.8} w={140} h={44} />
      </Animated.View>
      <View pointerEvents="none" style={styles.bloomRim} />
    </Animated.View>
  );
}

/** Expanding halo rings, only while the far side has not picked up. */
function Halo({ delay, color }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration: 2600, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.halo,
        {
          borderColor: color,
          opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.28] }) }],
        },
      ]}
    />
  );
}

export default function IncomingCallModal({
  callerName,
  subtitle,
  ticketNumber,
  onAccept,
  onReject,
  onMessage,
}) {
  return (
    <Modal animationType="slide" visible statusBarTranslucent>
      <View style={styles.root}>
        <LinearGradient
          colors={['rgba(255,214,180,0.72)', 'rgba(247,246,243,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.85, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(206,205,255,0.6)', 'rgba(247,246,243,0)']}
          start={{ x: 1, y: 0.12 }}
          end={{ x: 0.1, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(247,246,243,0)', 'rgba(196,232,222,0.5)']}
          start={{ x: 0.4, y: 0.5 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.frame}>
          <View style={styles.topRow}>
            <View style={styles.chip}>
              <LinearGradient
                colors={['#8DB4FF', '#C6A2FF', '#FFC48F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.chipMark}
              />
              <Text style={styles.chipText}>Incoming call</Text>
            </View>
            {ticketNumber ? <Text style={styles.ticket}>Ticket #{ticketNumber}</Text> : null}
          </View>

          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {callerName ?? 'Unknown caller'}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>

          <View style={styles.stage}>
            <Halo delay={0} color="rgba(150,140,255,0.35)" />
            <Halo delay={900} color="rgba(255,178,120,0.32)" />
            <Bloom breathing />
          </View>

          {onMessage ? (
            <TouchableOpacity onPress={onMessage} activeOpacity={0.85} style={styles.messageRow}>
              <MessageSquare size={17} color={C.muted} />
              <Text style={styles.messageText}>Reply with a message</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.answerRow}>
            <TouchableOpacity onPress={onReject} activeOpacity={0.85} style={styles.decline}>
              <PhoneOff size={21} color={C.danger} />
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} activeOpacity={0.9} style={styles.answer}>
              <Phone size={22} color="#FFFFFF" />
              <Text style={styles.answerText}>Answer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  frame: { flex: 1, paddingTop: 70, paddingHorizontal: 26, paddingBottom: 40 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 13,
    shadowColor: '#1C365C',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  chipMark: { width: 16, height: 16, borderRadius: 5 },
  chipText: { fontSize: 12.5, fontWeight: '700', color: '#0C1524' },
  ticket: { fontSize: 12.5, fontWeight: '600', color: C.muted },

  identity: { marginTop: 34, alignItems: 'center' },
  name: { fontSize: 27, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  subtitle: { marginTop: 7, fontSize: 14.5, fontWeight: '600', color: C.muted, textAlign: 'center' },

  stage: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 250, height: 250, borderRadius: 999, borderWidth: 1 },
  bloom: {
    width: 232,
    height: 214,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderTopLeftRadius: 116,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 112,
    borderBottomLeftRadius: 104,
    shadowColor: '#7868B4',
    shadowOpacity: 0.2,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 24 },
    elevation: 8,
  },
  lobe: { position: 'absolute' },
  lobeTL: { left: -58, top: -54 },
  lobeTR: { right: -62, top: -48 },
  lobeBR: { right: -54, bottom: -58 },
  lobeBL: { left: -60, bottom: -52 },
  sheen: { position: 'absolute', left: 22, top: 16 },
  pool: { position: 'absolute', left: 46, bottom: 8 },
  bloomRim: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderTopLeftRadius: 116,
    borderTopRightRadius: 100,
    borderBottomRightRadius: 112,
    borderBottomLeftRadius: 104,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#1C365C',
    shadowOpacity: 0.07,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  messageText: { fontSize: 14, fontWeight: '700', color: C.body },

  answerRow: { marginTop: 16, flexDirection: 'row', gap: 12 },
  decline: {
    flex: 1,
    height: 74,
    borderRadius: 26,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#1C365C',
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  declineText: { fontSize: 12.5, fontWeight: '700', color: C.danger },
  answer: {
    flex: 1.35,
    height: 74,
    borderRadius: 26,
    backgroundColor: C.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.pill,
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 7,
  },
  answerText: { fontSize: 15.5, fontWeight: '700', color: '#FFFFFF' },
});
