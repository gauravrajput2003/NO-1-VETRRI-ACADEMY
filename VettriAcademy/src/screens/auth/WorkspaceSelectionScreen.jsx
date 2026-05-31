import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Dimensions, Animated, Easing, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const { width: SW, height: SH } = Dimensions.get('window');
const useWebNativeDriver = Platform.OS !== 'web';
const cardShadow = Platform.OS === 'web'
  ? { boxShadow: '0px 6px 12px rgba(17, 24, 39, 0.08)' }
  : {
  shadowColor: '#111827',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    };

// ─── Premium Color Palette ─────────────────────────────────────────────────────
const C = {
  bgLight: '#FDFBF7',
  bgDark: '#EBE0CE',
  textNavy: '#0F1A3A',
  textGold: '#B8860B',
  textSoft: '#5A6072',
  white: '#FFFFFF',
  ink: '#111827',
};

// ─── Workspace Configuration ───────────────────────────────────────────────────
const WORKSPACES = [
  {
    id: 'student',
    title: 'Student',
    description: 'Classes, materials, doubt support and progress tracking',
    tagline: 'Learn, revise and grow',
    icon: 'person-outline', 
    accentColor: '#5A3D77',
    iconBg: '#F3EBF7',
    cardBg: '#FCFAFD',
    borderColor: '#E6D7EE',
  },
  {
    id: 'teacher',
    title: 'Teacher',
    description: 'Live classes, attendance, grades and student guidance',
    tagline: 'Teach, manage and mentor',
    icon: 'git-network-outline', 
    accentColor: '#176C7A',
    iconBg: '#E7F6F8',
    cardBg: '#F4FAFB',
    borderColor: '#D1ECF0',
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Manage school, users, reports and system settings',
    tagline: 'Configure, control and grow',
    icon: 'hardware-chip-outline', 
    accentColor: '#A66A14',
    iconBg: '#FDF3E3',
    cardBg: '#FEFBF6',
    borderColor: '#F5DEB3',
  },
];

// ─── Workspace Card Component ──────────────────────────────────────────────────
function WorkspaceCard({ workspace, index, onSelectWorkspace }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: 1,
      duration: 500,
      delay: 300 + index * 150,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: useWebNativeDriver,
    }).start();
  }, []);

  const cardStyle = {
    opacity: animVal,
    transform: [
      { translateY: animVal.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
      { scale },
    ],
  };

  const onPressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: useWebNativeDriver }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: useWebNativeDriver }).start();

  return (
    <Animated.View style={[st.cardWrapper, cardStyle]}>
      <ParticleWrapper
        particleCount={24}
        size="medium"
        colors={['#FFD700', '#FFA500', '#FFEC8B', '#FFC300', '#FFFFFF']}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => onSelectWorkspace(workspace.id)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          style={[
            st.cardInner, 
            { backgroundColor: workspace.cardBg, borderColor: workspace.borderColor }
          ]}
        >
          <View style={[st.cardIconBox, { backgroundColor: workspace.iconBg, borderColor: workspace.borderColor }]}>
            <Ionicons name={workspace.icon} size={28} color={workspace.accentColor} />
          </View>
          
          <View style={st.cardBody}>
            <Text style={[st.cardTitle, { color: C.textNavy }]}>{workspace.title}</Text>
            <Text style={st.cardDesc}>{workspace.description}</Text>
            <Text style={[st.cardTagline, { color: workspace.accentColor }]}>{workspace.tagline}</Text>
          </View>

          <View style={st.arrowBox}>
             <Ionicons name="arrow-forward" size={20} color={workspace.accentColor} />
          </View>
        </TouchableOpacity>
      </ParticleWrapper>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkspaceSelectionScreen({ onSelectWorkspace }) {
  const contentAnim = useRef(new Animated.Value(0)).current;
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const boyAnim = useRef(new Animated.Value(0)).current;
  const wordAnim1 = useRef(new Animated.Value(0)).current;
  const wordAnim2 = useRef(new Animated.Value(0)).current;
  const wordAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: useWebNativeDriver }).start();
  }, []);

  useEffect(() => {
    const runWordDrop = () => {
      return Animated.sequence([
        Animated.parallel([
          Animated.timing(wordAnim1, { toValue: 0, duration: 0, useNativeDriver: useWebNativeDriver }),
          Animated.timing(wordAnim2, { toValue: 0, duration: 0, useNativeDriver: useWebNativeDriver }),
          Animated.timing(wordAnim3, { toValue: 0, duration: 0, useNativeDriver: useWebNativeDriver }),
        ]),
        Animated.stagger(300, [
          Animated.timing(wordAnim1, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: useWebNativeDriver }),
          Animated.timing(wordAnim2, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: useWebNativeDriver }),
          Animated.timing(wordAnim3, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: useWebNativeDriver }),
        ]),
        Animated.delay(3000),
      ]);
    };

    const loop = Animated.loop(runWordDrop());
    loop.start();
    return () => loop.stop();
  }, [wordAnim1, wordAnim2, wordAnim3]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(boyAnim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: useWebNativeDriver }),
        Animated.timing(boyAnim, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: useWebNativeDriver }),
      ])
    ).start();
  }, [boyAnim]);

  return (
    <View style={st.root}>
      {/* Premium Warm Background Gradient */}
      <LinearGradient colors={[C.bgLight, '#F8F1E4', C.bgDark]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={st.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scrollEnabled={scrollEnabled}
          onContentSizeChange={(w, h) => setScrollEnabled(h > SH)}
        >

          <Animated.View style={{ opacity: contentAnim, flex: 1 }}>

            {/* Hero Section */}
            <View style={st.heroContainer}>
              {/* Left Side: Illustration */}
              <View style={st.heroImgContainer}>
                <Animated.Image 
                  source={require('../../../assets/boy_illustration.png')} 
                  style={[
                    st.boyImg,
                    {
                      transform: [
                        { perspective: 800 },
                        { translateY: boyAnim.interpolate({ inputRange: [0, 1], outputRange: [4, -8] }) },
                        { rotateZ: boyAnim.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] }) },
                        { rotateY: boyAnim.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) },
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
{/* Right Side: Typography */}
              <View style={st.heroTextContainer}>
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.7}
                  style={[
                    st.heroWord,
                    {
                      opacity: wordAnim1,
                      transform: [
                        // Starts high, lands exactly in place
                        { translateY: wordAnim1.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) },
                        { translateX: wordAnim1.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }
                      ],
                    },
                  ]}
                >
                  Learn
                </Animated.Text>
                
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.7}
                  style={[
                    st.heroWord,
                    {
                      opacity: wordAnim2,
                      transform: [
                        // Starts high, lands 6px lower and slightly more left (closer to image)
                        { translateY: wordAnim2.interpolate({ inputRange: [0, 1], outputRange: [-15, 6] }) },
                        { translateX: wordAnim2.interpolate({ inputRange: [0, 1], outputRange: [10, -8] }) }
                      ],
                    },
                  ]}
                >
                  Grow
                </Animated.Text>
                
                <Animated.Text
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.7}
                  style={[
                    st.heroWord,
                    {
                      opacity: wordAnim3,
                      transform: [
                        // Starts high, lands 12px lower and even further left
                        { translateY: wordAnim3.interpolate({ inputRange: [0, 1], outputRange: [-15, 12] }) },
                        { translateX: wordAnim3.interpolate({ inputRange: [0, 1], outputRange: [10, -16] }) }
                      ],
                    },
                  ]}
                >
                  Achieve
                </Animated.Text>
              </View>
            </View>

            {/* Section Headers */}
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>Choose your workspace</Text>
              <Text style={st.sectionSub}>Built for students, teachers, and admin teams</Text>
            </View>

            {/* Cards List */}
            <View style={st.cards}>
              {WORKSPACES.map((ws, i) => (
                <WorkspaceCard key={ws.id} workspace={ws} index={i} onSelectWorkspace={onSelectWorkspace} />
              ))}
            </View>

            {/* Footer with lines */}
            <View style={st.footerContainer}>
              <View style={st.footerLine} />
              <Text style={st.footerText}>Premium EdTech Platform • Since 2026</Text>
              <View style={st.footerLine} />
            </View>

          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDFBF7' },
  // Bumped up the paddingBottom to ensure nothing gets cut off on smaller screens
  scroll: { flexGrow: 1, paddingBottom: 24, paddingTop: 10 }, 
  
heroContainer: {
  flexDirection: 'row',

  alignItems: 'center',

  justifyContent: 'space-between',

  paddingHorizontal: 18,

  marginTop: 2,

  marginBottom: 12,

  width: '100%',
},

heroImgContainer: {
  width: Math.min(SW * 0.44, SH * 0.28),
  // Reduced the height significantly from 0.42 / 1.05 
  // to remove the empty vertical space
  height: Math.min(SH * 0.25, SW * 0.65), 
  justifyContent: 'center',
  alignItems: 'center',
},
boyImg: {
  width: '100%',

  height: '100%',
},

heroTextContainer: {
  flex: 1,

  paddingLeft: 10,

  justifyContent: 'center',

  alignItems: 'flex-end',

  minWidth: 0,
},
heroWord: {
  fontSize: SW < 380 ? 28 : 34,
  lineHeight: SW < 380 ? 32 : 38,
  fontWeight: '900',
  color: C.textNavy,
  textAlign: 'right',
  letterSpacing: 0.4,
  fontFamily:
    Platform.OS === 'ios'
      ? 'Georgia'
      : undefined,
},

academyName: {
  fontSize: SW < 380 ? 10 : 12,

  fontWeight: '900',

  color: C.textNavy,

  letterSpacing: 1.3,

  marginBottom: 4,

  flexWrap: 'wrap',
},

heroTitle: {
  fontSize: SW < 380 ? 28 : 34,

  lineHeight: SW < 380 ? 32 : 38,

  fontWeight: '900',

  color: C.textNavy,

  textAlign: 'right',

  flexWrap: 'wrap',

  fontFamily:
    Platform.OS === 'ios'
      ? 'Georgia'
      : undefined,
},

heroJourney: {
  fontSize: SW < 380 ? 42 : 52,

  lineHeight: SW < 380 ? 46 : 56,

  color: C.textGold,

  textAlign: 'right',

  fontWeight: '700',

  fontStyle: 'italic',

  marginTop: 2,

  flexShrink: 1,

  fontFamily:
    Platform.OS === 'ios'
      ? 'Georgia'
      : undefined,
},

  sectionHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textNavy,
  },
  sectionSub: {
    fontSize: 13,
    color: C.textSoft,
    marginTop: 4,
  },

  cards: {
    paddingHorizontal: 18,
    gap: 14,
  },
  cardWrapper: {
    ...cardShadow,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cardIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18, 
    borderWidth: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: C.textSoft,
    lineHeight: 18,
    marginBottom: 4,
  },
  cardTagline: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  arrowBox: {
    paddingLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1C8B6', 
  },
  footerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: C.textNavy,
  },
});
