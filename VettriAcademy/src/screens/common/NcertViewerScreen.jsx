/**
 * ─── NcertViewerScreen ────────────────────────────────────────────────────────
 * 
 * NCERT websites (ncert.nic.in) BLOCK iframe/WebView embedding due to
 * CSP frame-ancestors restrictions. This screen automatically detects the 
 * block and falls back to opening in the external browser.
 * 
 * On native: Attempts WebView first, detects error, offers browser fallback
 * On web: Directly opens in new browser tab (iframes are also blocked by CSP)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity as RNTouchableOpacity, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../utils/colors';
import { checkBlockedSite } from '../../utils/fileUtils';
import ParticleWrapper from '../../components/effects/ParticleWrapper';

const TouchableOpacity = (props) => {
  const { particleCount = 20, size = "small", colors, children, ...rest } = props;
  return (
    <ParticleWrapper particleCount={particleCount} size={size} colors={colors}>
      <RNTouchableOpacity {...rest}>{children}</RNTouchableOpacity>
    </ParticleWrapper>
  );
};

// ─── Brand palette: teal + pink + gold, matches DownloadCenterScreen ───
const P = {
  bgTop: '#04262A',
  bgBottom: '#0B3D40',
  surface: '#0E4548',
  border: 'rgba(22,214,209,0.22)',
  teal: '#16D6D1',
  tealDeep: '#0A8C89',
  pink: '#FF4F8B',
  pinkDeep: '#C2185B',
  gold: '#F4C752',
  goldDeep: '#D89A2B',
  ink: '#04262A',
  textPrimary: '#F4F7F6',
  textSecondary: '#8FC9C6',
  textMuted: '#5FA5A2',
};

let WebView;
try { WebView = require('react-native-webview').WebView; } catch (e) { WebView = null; }

const isWeb = Platform.OS === 'web';

export default function NcertViewerScreen({ route, navigation }) {
  const { url, title } = route.params;
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webRef = React.useRef(null);

  // Check if site is known to block embedding
  const blockCheck = checkBlockedSite(url);

  useEffect(() => {
    // On web platform or known blocked site: go straight to browser
    if (isWeb && blockCheck.blocked) {
      Linking.openURL(url);
      navigation.goBack();
    }
  }, []);

  const openExternal = () => Linking.openURL(url || 'https://ncert.nic.in/textbook.php');

  // Handle WebView errors — CSP blocks show as load errors
  const handleWebViewError = () => {
    setLoading(false);
    setError(true);
    setBlocked(true);
  };

  // ─── Blocked / Error state — user-friendly fallback UI ────────────────────
  if (blocked || error || (isWeb && !WebView)) {
    return (
      <LinearGradient colors={[P.bgTop, P.bgBottom]} style={styles.container}>
        <LinearGradient colors={[P.teal, P.tealDeep]} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title || 'NCERT Textbook'}</Text>
            <Text style={styles.headerSub}>ncert.nic.in</Text>
          </View>
        </LinearGradient>

        <View style={styles.blockedContainer}>
          <LinearGradient colors={[P.gold + '33', P.gold + '0D']} style={styles.blockedIcon}>
            <Ionicons name="shield-checkmark" size={60} color={P.gold} />
          </LinearGradient>
          <Text style={styles.blockedTitle}>🔒 Website Restricted</Text>
          <Text style={styles.blockedMsg}>
            {blockCheck.blocked
              ? `${blockCheck.domain} blocks in-app viewing due to government security policies (CSP frame-ancestors).`
              : 'This website could not be loaded in the app. It may have security restrictions.'}
          </Text>
          <Text style={styles.blockedNote}>
            Don't worry! You can view it in your phone's browser instead.
          </Text>

          <TouchableOpacity onPress={openExternal}>
            <LinearGradient colors={[P.pink, P.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.browserBtn}>
              <Ionicons name="globe-outline" size={20} color="#fff" />
              <Text style={styles.browserBtnText}>Open in Browser</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.retryBtn} onPress={() => { setBlocked(false); setError(false); setLoading(true); }}>
            <Ionicons name="refresh" size={16} color={P.teal} />
            <Text style={styles.retryBtnText}>Try Again In-App</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ─── WebView rendering (native only) ─────────────────────────────────────
  return (
    <LinearGradient colors={[P.bgTop, P.bgBottom]} style={styles.container}>
      <LinearGradient colors={[P.teal, P.tealDeep]} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'NCERT Textbook'}</Text>
          <Text style={styles.headerSub}>ncert.nic.in</Text>
        </View>
        {loading && <ActivityIndicator size="small" color={P.gold} />}
        <TouchableOpacity style={styles.extHeaderBtn} onPress={openExternal}>
          <Ionicons name="open-outline" size={16} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {WebView ? (
        <WebView
          ref={webRef}
          source={{ uri: url || 'https://ncert.nic.in/textbook.php' }}
          style={{ flex: 1 }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={handleWebViewError}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 400) handleWebViewError();
          }}
          onNavigationStateChange={(nav) => {
            setCanGoBack(nav.canGoBack);
            setCanGoForward(nav.canGoForward);
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={P.teal} />
              <Text style={styles.loaderTxt}>Loading NCERT content...</Text>
              <Text style={styles.loaderSub}>If blocked, we'll open your browser</Text>
            </View>
          )}
          // 5 second timeout — if it takes too long, assume blocked
          onShouldStartLoadWithRequest={(req) => {
            // Check if navigating to a completely different blocked domain
            const check = checkBlockedSite(req.url);
            if (check.blocked && req.url !== url) {
              Linking.openURL(req.url);
              return false;
            }
            return true;
          }}
        />
      ) : (
        // Fallback if WebView not available
        <View style={styles.blockedContainer}>
          <Ionicons name="alert-circle" size={48} color={P.pink} />
          <Text style={styles.blockedTitle}>WebView Not Available</Text>
          <TouchableOpacity onPress={openExternal}>
            <LinearGradient colors={[P.pink, P.goldDeep]} style={styles.browserBtn}>
              <Text style={styles.browserBtnText}>Open in Browser</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Navigation */}
      {!isWeb && WebView && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={[styles.navBtn, !canGoBack && styles.navDisabled]} onPress={() => webRef.current?.goBack()} disabled={!canGoBack}>
            <Ionicons name="chevron-back" size={22} color={canGoBack ? P.teal : P.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, !canGoForward && styles.navDisabled]} onPress={() => webRef.current?.goForward()} disabled={!canGoForward}>
            <Ionicons name="chevron-forward" size={22} color={canGoForward ? P.teal : P.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => webRef.current?.reload()}>
            <Ionicons name="refresh" size={20} color={P.teal} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={openExternal}>
            <LinearGradient colors={[P.pink, P.goldDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ncertBtn}>
              <Ionicons name="globe-outline" size={14} color="#fff" />
              <Text style={styles.ncertBtnTxt}>Browser</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 12 : 48, paddingBottom: 12, paddingHorizontal: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  extHeaderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: P.bgTop },
  loaderTxt: { marginTop: 12, fontSize: 14, color: P.textPrimary, fontWeight: '600' },
  loaderSub: { marginTop: 4, fontSize: 12, color: P.textSecondary },

  // Blocked state
  blockedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  blockedIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: P.border },
  blockedTitle: { fontSize: 22, fontWeight: '800', color: P.textPrimary, textAlign: 'center' },
  blockedMsg: { fontSize: 14, color: P.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 22, maxWidth: 300 },
  blockedNote: { fontSize: 13, color: P.gold, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  browserBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 28, gap: 8, marginTop: 28 },
  browserBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: P.teal, gap: 6 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: P.teal },

  // Bottom bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: Platform.OS === 'web' ? 10 : 28, borderTopWidth: 1, borderTopColor: P.border, backgroundColor: P.surface },
  navBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  navDisabled: { opacity: 0.4 },
  ncertBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 5 },
  ncertBtnTxt: { fontSize: 12, fontWeight: '700', color: '#fff' },
});