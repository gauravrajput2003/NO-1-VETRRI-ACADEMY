import { useState } from 'react';
import toast from 'react-hot-toast';

export async function copyLoginText(value) {
  try { await navigator.clipboard.writeText(value); toast.success('Copied'); }
  catch { toast.error('Could not copy. Select and copy the text instead.'); }
}

export default function StudentLoginDetails({ details, onClose, accountType = 'Student' }) {
  const [visible, setVisible] = useState(false);
  const button = 'px-3 py-2 rounded-xl bg-teal-50 text-teal-800 font-semibold';
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Saved ${accountType.toLowerCase()} login details`}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 text-gray-900">
        <h2 className="text-xl font-bold">Login details saved</h2>
        <p>{details.name}</p>
        <p className="select-text break-all">Phone: {details.mobile}</p>
        <button type="button" className={button} onClick={() => copyLoginText(details.mobile)}>Copy phone number</button>
        <p className="select-text break-all">Password: {visible ? details.password : '••••••••'}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => setVisible(!visible)}>{visible ? 'Hide' : 'Show'} password</button>
          <button type="button" className={button} onClick={() => copyLoginText(details.password)}>Copy password</button>
          <button type="button" className={button} onClick={() => copyLoginText(`Phone: ${details.mobile}\nPassword: ${details.password}`)}>Copy both login details</button>
        </div>
        <p className="text-sm text-gray-500">Copy now to share with the {accountType === 'Teacher' ? 'teacher' : 'parent'}. You can set another password anytime from Edit {accountType}.</p>
        <button type="button" className="w-full py-3 rounded-xl bg-teal-500 text-white font-bold" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
