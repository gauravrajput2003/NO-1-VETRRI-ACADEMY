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

const buildFallbackAnswer = () => {
  return [
    'English:',
    'Vettri AI is temporarily unavailable due to an upstream service issue. Please try again in a moment. You can continue by asking your teacher or checking your study materials.',
    '',
    'Tamil:',
    'Vettri AI இப்போது தற்காலிகமாக கிடைக்கவில்லை. சில நிமிடங்களில் மீண்டும் முயற்சிக்கவும். இதற்குள் உங்கள் ஆசிரியரிடம் கேள்வி கேட்கலாம் அல்லது படிப்புப் பொருட்களை பார்க்கலாம்.',
  ].join('\n');
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
      let timeout;
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const abortController = new AbortController();
        timeout = setTimeout(() => abortController.abort(), 12000);

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
          signal: abortController.signal,
        });

        clearTimeout(timeout);

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
      } catch (providerError) {
        lastProviderMessage = providerError?.message || 'Gemini request failed.';
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }

    if (!answer) {
      return res.json({
        success: true,
        answer: buildFallbackAnswer(),
        fallback: true,
        message: `Vettri AI fallback used: ${lastProviderMessage}`,
      });
    }

    return res.json({ success: true, answer, model: usedModel || preferredModel });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to get Vettri AI response.' });
  }
};

module.exports = { askVettriAI };
