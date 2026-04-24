const ALLOWED_ROLES = new Set(['student', 'teacher']);

const normalizeModelName = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/^models\//, '');
};

const parseAnswer = (providerData) => {
  return providerData?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text)
    .filter(Boolean)
    .join('\n')
    .trim(); 
};
  
const buildSystemPrompt = (role, userName) => {
  return [
    'You are Vettri AI, the in-app learning assistant for No.1 Vettri Academy.',
    `Current user role: ${role}.`,
    `Current user name: ${userName || 'Unknown User'}.`,
    'Guidelines:',
    '- Give clear, concise educational answers.',
    '- Prefer step-by-step explanations for problem solving.',      
    '- Keep tone encouraging and professional.',
    '- Support multilingual users (Tamil and English).',
    '- Understand English, Tamil, and mixed Tanglish input.',
    '- Always provide the final answer in BOTH English and Tamil.',
    '- Response format must be exactly: "English:" section first, then "Tamil:" section.',
    '- If the user asks in Tamil, still include both sections. If user asks in English, still include both sections.',
    '- Keep both language sections semantically equivalent.',
    '- For unsafe or harmful requests, refuse politely and suggest a safe alternative.',
    '- If the question is ambiguous, ask one short clarifying question.',
  ].join('\n');
};

const askVettriAI = async (req, res) => {
  try {
    const role = req.user?.role;

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(403).json({ success: false, message: 'Vettri AI is available for students and teachers only.' });
    }

    const question = (req.body?.question || '').trim();
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required.' });
    }
    if (question.length > 2000) {
      return res.status(400).json({ success: false, message: 'Question is too long. Keep it under 2000 characters.' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is missing on the server.' });
    }

    const preferredModel = normalizeModelName(process.env.GEMINI_MODEL) || 'gemini-2.0-flash';
    const fallbackModels = [
      preferredModel,
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
    ].filter(Boolean);
    const modelCandidates = [...new Set(fallbackModels)];

    const systemPrompt = buildSystemPrompt(role, req.user?.displayName || req.user?.name);

    let answer = '';
    let usedModel = '';
    let lastProviderMessage = 'Gemini request failed.';

    for (const model of modelCandidates) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser question: ${question}` }],
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        lastProviderMessage = data?.error?.message || 'Gemini request failed.';
        continue;
      }

      const parsed = parseAnswer(data);
      if (parsed) {
        answer = parsed;
        usedModel = model;
        break;
      }
    }

    if (!answer) {
      return res.status(502).json({ success: false, message: `Vettri AI error: ${lastProviderMessage}` });
    }

    return res.json({ success: true, answer, model: usedModel || preferredModel });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to get Vettri AI response.' });
  }
};

module.exports = { askVettriAI };
