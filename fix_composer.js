const fs = require('fs');
const path = require('path');

const filePath = path.join('VettriAcademy', 'src', 'screens', 'common', 'DoubtThreadScreen.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add new imports for expo-audio if not present
if (!content.includes('AudioModule')) {
  content = content.replace(
    /import \{ useAudioPlayer, useAudioPlayerStatus \} from 'expo-audio';/,
    "import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from 'expo-audio';"
  );
}

// Add state variables for recording
const stateHookStr = "const [replyAttachments, setReplyAttachments] = useState([]);";
if (content.includes(stateHookStr) && !content.includes('const recorder = useAudioRecorder(')) {
  const newStates = `
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const recordingDurationSec = Math.floor((recorderState?.durationMillis || 0) / 1000);
  const recording = Boolean(recorderState?.isRecording || recordingPaused);

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Toast.show({ type: 'error', text1: 'Microphone permission required' });
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordingPaused(false);
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to start recording' });
    }
  };

  const pauseOrResumeRecording = async () => {
    if (!recording) return;
    try {
      if (recordingPaused) {
        recorder.record();
        setRecordingPaused(false);
      } else {
        recorder.pause();
        setRecordingPaused(true);
      }
    } catch {}
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setReplyAttachments((prev) => [
          ...prev,
          {
            uri,
            name: \`voice-\${Date.now()}.m4a\`,
            type: 'audio/mp4',
          },
        ]);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Unable to stop recording' });
    } finally {
      setRecordingPaused(false);
    }
  };
`;
  content = content.replace(stateHookStr, newStates);
}

// Update Composer UI
const composerStr = `<View style={styles.composerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={onPickAttachment}>
            <Ionicons name="attach" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn} onPress={onSendReply} disabled={replying || uploading}>
            {replying || uploading ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="send" size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>`;

const newComposerStr = `<View style={styles.composerRow}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iconBtn} onPress={onPickAttachment}>
              <Ionicons name="attach" size={18} color={Colors.primary} />
            </TouchableOpacity>
            {!recording ? (
              <TouchableOpacity style={styles.iconBtn} onPress={startRecording}>
                <Ionicons name="mic" size={18} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity style={styles.iconBtn} onPress={pauseOrResumeRecording}>
                  <Ionicons name={recordingPaused ? 'play' : 'pause'} size={18} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#FDE7F1' }]} onPress={stopRecording}>
                  <Ionicons name="stop" size={18} color={Colors.pink} />
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: Colors.pink, fontWeight: 'bold' }}>{recordingDurationSec}s</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={onSendReply} disabled={replying || uploading}>
            {replying || uploading ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="send" size={18} color={Colors.white} />}
          </TouchableOpacity>
        </View>`;

if (content.includes(composerStr)) {
  content = content.replace(composerStr, newComposerStr);
} else {
  console.log("Could not find composerRow to replace");
}

// Update composer padding Bottom
const paddingStr = `<View style={styles.composer}>`;
const newPaddingStr = `<View style={[styles.composer, { paddingBottom: Math.max(10, bottomPadding) }]}>`;
if (content.includes(paddingStr)) {
  content = content.replace(paddingStr, newPaddingStr);
}

fs.writeFileSync(filePath, content);
console.log('Done updating DoubtThreadScreen.jsx');
