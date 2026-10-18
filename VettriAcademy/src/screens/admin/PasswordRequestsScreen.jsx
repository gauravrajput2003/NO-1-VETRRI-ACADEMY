import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl, Modal, ScrollView, ActivityIndicator, Alert, AppState, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getPasswordRequestsAPI, generateTemporaryPasswordAPI, sendTemporaryPasswordAPI, markRecoveryCopiedAPI, rejectPasswordRequestAPI } from '../../services/api';
import { copyLoginText } from '../../components/StudentLoginDetails';
import { useBottomTabBarPadding } from '../../hooks/useBottomTabBarPadding';

const C = { navy: '#102A43', teal: '#20C7C9', pink: '#FF4F8B', ink: '#0F0E2A' };
const labels = { pending: 'Pending', sent: 'Sent', used: 'Used', expired: 'Expired', rejected: 'Rejected', locked: 'Locked' };
const exactDate = value => value ? new Date(value).toLocaleString() : '';
function timeAgo(value, now) { const minutes = Math.max(0, Math.floor((now - Date.parse(value)) / 60000)); return minutes < 60 ? minutes + 'm ago' : minutes < 1440 ? Math.floor(minutes / 60) + 'h ago' : Math.floor(minutes / 1440) + 'd ago'; }
function expiryText(request, now) {
  const minutes = Math.ceil((Date.parse(request?.tempPasswordExpiresAt) - now) / 60000);
  return !Number.isFinite(minutes) ? 'Expires in 24 hours after you send it' : minutes <= 0 ? 'Expired' : 'Expires in ' + Math.floor(minutes / 60) + 'h ' + minutes % 60 + 'm';
}
function Action({ title, onPress, secondary, danger, disabled, busy }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: Boolean(disabled || busy), busy }}
    disabled={disabled || busy} onPress={onPress} style={[s.action, secondary && s.secondary, danger && s.danger, (disabled || busy) && { opacity: 0.45 }]}>
    {busy ? <ActivityIndicator color={secondary ? C.navy : '#FFF'} /> : <Text style={[s.actionText, secondary && { color: C.navy }, danger && { color: '#BE123C' }]}>{title}</Text>}
  </TouchableOpacity>;
}

export default function PasswordRequestsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const bottomPadding = useBottomTabBarPadding();
  const [filter, setFilter] = useState('pending'), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [page, setPage] = useState(1), [pages, setPages] = useState(1), [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true), [refreshing, setRefreshing] = useState(false), [error, setError] = useState('');
  const [selected, setSelected] = useState(null), [password, setPassword] = useState(''), [busy, setBusy] = useState(false), [now, setNow] = useState(Date.now());
  const sequence = useRef(0), mounted = useRef(true);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (selected?.tempPasswordExpiresAt && Date.parse(selected.tempPasswordExpiresAt) <= now) setPassword(''); }, [selected?.tempPasswordExpiresAt, now]);
  const load = useCallback(async (refresh = false) => {
    const current = ++sequence.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    try { const { data } = await getPasswordRequestsAPI({ status: filter, search: query, page });
      if (current === sequence.current && mounted.current) { setRequests(data.requests); setPages(Math.max(1, data.pages)); }
    } catch (e) { if (current === sequence.current && mounted.current) setError(e.response?.data?.message || 'Unable to connect. Check your internet and retry.'); }
    finally { if (current === sequence.current && mounted.current) { setLoading(false); setRefreshing(false); } }
  }, [filter, query, page]);
  useFocusEffect(useCallback(() => {
    mounted.current = true; load();
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') setPassword(''); });
    return () => { mounted.current = false; sequence.current++; setPassword(''); setSelected(null); subscription.remove(); };
  }, [load]));
  const close = () => { if (!busy) { setPassword(''); setSelected(null); } };
  async function perform(kind) {
    if (!selected || busy) return;
    const id = selected._id;
    setBusy(kind);
    try {
      if (kind === 'generate') {
        const { data } = await generateTemporaryPasswordAPI(id);
        if (!mounted.current) return;
        setPassword(data.password); setSelected(current => ({ ...current, ...data.request }));
      } else if (kind === 'reject') {
        await rejectPasswordRequestAPI(id);
        if (!mounted.current) return;
        setPassword(''); setSelected(null); Toast.show({ type: 'success', text1: 'Request rejected' }); load(true);
      } else {
        const result = kind === 'copy' ? await markRecoveryCopiedAPI(id, password) : await sendTemporaryPasswordAPI(id, password);
        if (!mounted.current) return;
        if (kind === 'copy') await copyLoginText(password);
        setSelected(current => ({ ...current, ...result.data.request }));
        Toast.show({ type: 'success', text1: kind === 'copy' ? 'Copied — check the expiry shown above' : 'Queued for verified devices and Admin Desk' });
        load(true);
      }
    } catch (e) { if (mounted.current) Toast.show({ type: 'error', text1: 'Action failed', text2: e.response?.data?.message || 'Check your connection and retry.' }); }
    finally { if (mounted.current) setBusy(false); }
  }
  function confirm(kind) {
    const title = kind === 'copy' ? 'Identity verified?' : kind === 'reject' ? 'Reject this request?' : 'Send to ' + selected?.user?.name + '?';
    const body = kind === 'copy' ? 'Confirm you verified the account owner independently using academy records. Copy activates the temporary password and starts its 24-hour expiry.'
      : kind === 'reject' ? 'The temporary password and queued deliveries will be invalidated.' : 'Only previously verified devices receive the password. An encrypted Admin Desk message is also saved.';
    if (Platform.OS === 'web') { if (window.confirm(title + '\n\n' + body)) perform(kind); }
    else Alert.alert(title, body, [{ text: 'Cancel', style: 'cancel' }, { text: kind === 'copy' ? 'Verified — Copy' : 'Confirm', onPress: () => perform(kind) }]);
  }
  const card = ({ item }) => {
    const expired = item.status === 'sent' && Date.parse(item.tempPasswordExpiresAt) <= now;
    return <TouchableOpacity accessibilityRole="button" accessibilityLabel={'Open password request for ' + (item.user?.name || 'Unavailable account')} onPress={() => { setPassword(''); setSelected(item); }} style={s.card}>
      <View style={s.avatar}><Text style={s.initials}>{(item.user?.name || '?').split(' ').slice(0, 2).map(p => p[0]).join('')}</Text></View>
      <View style={{ flex: 1, minWidth: 0 }}><Text style={s.name}>{item.user?.name || 'Account unavailable'}</Text>
        <View style={s.meta}><Text style={[s.role, { color: item.user?.role === 'teacher' ? '#087F85' : '#2563EB' }]}>{item.user?.role === 'teacher' ? 'TEACHER' : 'STUDENT'}</Text><Text style={s.small}>{item.user?.grade || item.user?.subjects?.join(', ')}</Text></View>
        <Text selectable style={s.contact}>{item.user?.mobile || item.user?.email}</Text>
        <Text style={s.small}>Requested {timeAgo(item.requestedAt, now)}</Text>
        <View style={s.meta}><Text style={s.pill}>{expired ? 'Expired' : labels[item.status]}</Text>{item.status === 'sent' && <Text style={s.small}>{expiryText(item, now)}</Text>}</View>
      </View><Ionicons name="chevron-forward" size={18} color="#64748B" />
    </TouchableOpacity>;
  };
  return <View style={s.root}>
    <View style={[s.header, { paddingTop: insets.top + 8 }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to admin dashboard" style={s.back} onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={s.heading}>Password Requests</Text><Text style={s.headerSub}>Private, admin-assisted account recovery</Text></View></View>
    <View style={s.toolbar}><View style={s.search}><Ionicons name="search" color="#64748B" size={20} /><TextInput accessibilityLabel="Search requests by name, phone or email" placeholder="Search name, phone or email" value={search} onChangeText={setSearch} autoCapitalize="none" style={s.searchInput} maxLength={80} /></View>
      <View style={s.filters}>{[['pending', 'Pending'], ['sent', 'Sent'], ['closed', 'Used / Expired']].map(([value, title]) => <TouchableOpacity accessibilityRole="button" accessibilityLabel={title + ' requests'} accessibilityState={{ selected: filter === value }} key={value} onPress={() => { setFilter(value); setPage(1); }} style={[s.chip, filter === value && s.chipActive]}><Text style={[s.chipText, filter === value && { color: '#FFF' }]}>{title}</Text></TouchableOpacity>)}</View>
    </View>
    {error ? <View style={s.empty}><Ionicons name="cloud-offline-outline" size={42} color={C.pink} /><Text style={s.small}>{error}</Text><Action title="Retry" onPress={() => load()} /></View>
      : loading && !refreshing ? <View accessibilityLabel="Loading password requests" style={s.toolbar}>{[0, 1, 2].map(i => <View key={i} style={[s.skeleton, { opacity: 1 - i * 0.2 }]}><View style={s.skeletonLine} /><View style={[s.skeletonLine, { width: '55%' }]} /></View>)}</View>
      : <FlatList data={requests} keyExtractor={item => item._id} renderItem={card} contentContainerStyle={[s.list, { paddingBottom: bottomPadding + 26 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.pink} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="key-outline" size={48} color={C.teal} /><Text style={s.name}>No password requests</Text><Text style={s.small}>New requests will appear here.</Text></View>}
        ListFooterComponent={<View style={s.pagination}><Action title="Previous" secondary disabled={page <= 1} onPress={() => setPage(page - 1)} /><Text style={s.small}>{page} / {pages}</Text><Action title="Next" secondary disabled={page >= pages} onPress={() => setPage(page + 1)} /></View>} />}
    <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={close}>
      <View style={s.overlay}><View style={[s.sheet, { paddingBottom: Math.max(24, insets.bottom + 12) }]}>
        <View style={s.sheetHeader}><Text accessibilityRole="header" style={[s.name, { flex: 1 }]}>{selected?.user?.name}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close password request" disabled={busy} style={s.back} onPress={close}><Ionicons name="close" size={24} color={C.ink} /></TouchableOpacity></View>
        <ScrollView contentContainerStyle={{ gap: 12 }}><Text selectable style={s.contact}>{selected?.user?.mobile} {selected?.user?.email}</Text>
          <Text style={s.small}>Requested {exactDate(selected?.requestedAt)}</Text>
          <Text style={s.expiry}>{expiryText(selected, now)}</Text>
          {!!selected?.tempPasswordExpiresAt && <Text style={s.small}>Exact expiry: {exactDate(selected.tempPasswordExpiresAt)}</Text>}
          {!['used', 'rejected'].includes(selected?.status) && <>
            <Action title={password || selected?.hasGeneratedPassword || selected?.status !== 'pending' ? 'Regenerate Temporary Password' : 'Generate Random Temp Password'} onPress={() => perform('generate')} busy={busy === 'generate'} disabled={Boolean(busy)} />
            {!!password && <><View style={s.passwordBox}><Text selectable style={s.password}>{password}</Text><Text style={s.small}>{selected?.sentAt ? 'Expires: ' + exactDate(selected.tempPasswordExpiresAt) : 'Expires in 24 hours after you send it'}</Text></View>
              <Text style={s.small}>Activate with Copy or Send. This password is cleared when you leave this screen or background the app.</Text>
              <View style={s.actionRow}><View style={{ flex: 1 }}><Action title="Copy" secondary busy={busy === 'copy'} disabled={Boolean(busy)} onPress={() => confirm('copy')} /></View><View style={{ flex: 1 }}><Action title="Send via App" busy={busy === 'send'} disabled={!selected?.hasVerifiedDevice || Boolean(busy)} onPress={() => confirm('send')} /></View></View>
            </>}
            {!password && selected?.hasGeneratedPassword && <Text style={s.small}>The password cannot be fetched again. Regenerate to obtain another one.</Text>}
            {!selected?.hasVerifiedDevice && <View style={s.notice}><Text style={s.small}>No verified device is available. Verify the account owner's identity independently, then use Copy to share securely.</Text></View>}
            <Action title="Reject" secondary danger disabled={busy} onPress={() => confirm('reject')} />
          </>}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F3F6FA' }, header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 18, backgroundColor: C.navy }, back: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 23, fontWeight: '800', color: '#FFF' }, headerSub: { fontSize: 12, color: '#BED0DD', marginTop: 5 }, toolbar: { padding: 16, width: '100%', maxWidth: 800, alignSelf: 'center' },
  search: { minHeight: 50, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderColor: '#E2E8F0', borderWidth: 1 }, searchInput: { flex: 1, minWidth: 0, fontSize: 15, minHeight: 50, color: C.ink },
  filters: { flexDirection: 'row', gap: 8, marginTop: 12 }, chip: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EDF3', padding: 7 }, chipActive: { backgroundColor: C.pink }, chipText: { fontWeight: '700', color: C.navy, textAlign: 'center', fontSize: 13 },
  list: { paddingHorizontal: 16, width: '100%', maxWidth: 800, alignSelf: 'center', flexGrow: 1 }, card: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#E6EDF4', padding: 16, flexDirection: 'row', gap: 13, alignItems: 'center', marginBottom: 12 }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E1F8F6', alignItems: 'center', justifyContent: 'center' }, initials: { color: '#087F85', fontWeight: '800', fontSize: 17 },
  name: { color: C.ink, fontWeight: '800', fontSize: 17 }, meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 7 }, role: { fontSize: 11, fontWeight: '800' }, small: { color: '#64748B', fontSize: 12, lineHeight: 19 }, contact: { color: '#334155', fontSize: 14, lineHeight: 22, marginTop: 5 }, pill: { backgroundColor: '#E9F6F5', color: '#087F85', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 9, fontWeight: '700', fontSize: 11 },
  action: { minHeight: 50, paddingVertical: 14, paddingHorizontal: 14, backgroundColor: C.pink, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, secondary: { backgroundColor: '#E8F0F6' }, danger: { backgroundColor: '#FFF0F4' }, actionText: { color: '#FFF', fontSize: 14, textAlign: 'center', fontWeight: '800' }, empty: { padding: 30, gap: 15, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 20, gap: 12 }, overlay: { flex: 1, backgroundColor: '#0F172A88', justifyContent: 'flex-end', alignItems: 'center' }, sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, width: '100%', maxWidth: 640, maxHeight: '88%' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  passwordBox: { backgroundColor: '#EFFBFA', borderWidth: 1, borderColor: '#B8E7E4', padding: 20, borderRadius: 14, alignItems: 'center', gap: 12 }, password: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 27, letterSpacing: 2, fontWeight: '700', color: C.navy }, expiry: { color: '#087F85', fontWeight: '800', fontSize: 16 }, actionRow: { flexDirection: 'row', gap: 12 }, notice: { padding: 14, backgroundColor: '#FFF8E7', borderRadius: 12 },
  skeleton: { backgroundColor: '#E4EAF1', minHeight: 116, borderRadius: 18, padding: 20, marginBottom: 12, gap: 15 }, skeletonLine: { backgroundColor: '#D1DAE5', height: 13, width: '75%', borderRadius: 6 },
});
