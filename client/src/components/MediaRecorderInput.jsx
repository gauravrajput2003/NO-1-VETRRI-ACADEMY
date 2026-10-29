import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
export default function MediaRecorderInput({ onFile, video = false }) {
  const recorder = useRef(null), stream = useRef(null), chunks = useRef([]), active = useRef(true);
  const [recording, setRecording] = useState(false), [seconds, setSeconds] = useState(0);
  useEffect(() => { active.current = true; return () => { active.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }; }, []);
  useEffect(() => { if (!recording) return; const timer = setInterval(() => setSeconds((value) => value + 1), 1000); return () => clearInterval(timer); }, [recording]);
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return null;
  const start = async () => {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      const types = video ? ['video/webm;codecs=vp8,opus', 'video/mp4'] : ['audio/webm;codecs=opus', 'audio/mp4'];
      const mimeType = types.find((type) => MediaRecorder.isTypeSupported(type));
      const instance = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      chunks.current = []; recorder.current = instance;
      instance.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      instance.onstop = () => {
        stream.current?.getTracks().forEach((track) => track.stop());
        if (!active.current) return;
        const type = instance.mimeType; const blob = new Blob(chunks.current, { type });
        if (blob.size) onFile(new File([blob], `recording-${Date.now()}.${type.includes('mp4') ? 'mp4' : 'webm'}`, { type: type.split(';')[0] }));
        setRecording(false);
      };
      instance.start(); setSeconds(0); setRecording(true);
    } catch { stream.current?.getTracks().forEach((track) => track.stop()); toast.error(`Unable to access ${video ? 'camera and microphone' : 'microphone'}. You can attach a recorded file instead.`); }
  };
  return <button type="button" className={recording ? 'text-red-300 text-sm' : 'text-gold text-sm'} onClick={() => recording ? recorder.current?.stop() : start()}>{recording ? `Stop recording (${seconds}s)` : video ? 'Record video' : 'Record voice'}</button>;
}
