import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, text, geminiKey } = await request.json();
    
    if (!title || !geminiKey) {
      return NextResponse.json(
        { error: { message: 'Falta el título o la clave API de Gemini.' } },
        { status: 400 }
      );
    }

    // Phase 1: Call Gemini Flash in text-mode to design a highly conceptual physical metaphor prompt in English
    const designPrompt = `You are a visual design assistant for a brand system.
The user wants to generate a "minimalist pictogram" icon for a audience segment.
Segment Title: "${title}"
Segment Description: "${text || ''}"

Your task is to describe a single, simple, concrete visual metaphor or action in English that represents this segment.
Avoid abstract concepts. Choose concrete physical objects or humans doing a clear, simple action.
Keep the description focused solely on the main subject. Do NOT include any background elements, landscapes, surroundings, or decorative context.
Examples:
- "La familia que descubre" -> "parents silhouette holding hands with a child silhouette"
- "La pareja de temporada media" -> "a couple silhouette standing together"
- "El repetidor" -> "a key silhouette"

Rules for the description:
- Keep it extremely short (under 8 words).
- Describe only the main subject. No background or scenery.
- Do NOT include any style keywords (like outline, background, color).
- Speak only in English.
- Output ONLY the description. No introduction, no quotes, no markdown.`;

    const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`;
    const textResponse = await fetch(textUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: designPrompt }] }]
      })
    });

    let visualSubject = title;
    if (textResponse.ok) {
      const textData = await textResponse.json();
      const generatedText = textData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (generatedText && generatedText.trim()) {
        visualSubject = generatedText.trim().replace(/^["']|["']$/g, '');
      }
    }

    // Phase 2: Compile the final strict style prompt and call gemini-2.5-flash-image
    const finalPrompt = `extremely simple and clean flat minimalist icon, bold conceptual pictogram style, thick clean black stroke on solid white background, no detail, no decoration, no gradients, no shading, no colors, raw graphic outline, subject: ${visualSubject}. CRITICAL: Do NOT include any text, letters, words, writing, numbers, labels, or characters inside the image. The symbol must be standalone, floating in space on solid white background. Do NOT enclose inside a circle, square, frame, shield, border, or any enclosing shape. Do NOT add any outline border or box around the image edges. The canvas boundary must remain solid pure white.`;

    const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey.trim()}`;
    const imgResponse = await fetch(imageUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      })
    });

    if (!imgResponse.ok) {
      const errData = await imgResponse.json().catch(() => ({}));
      return NextResponse.json(
        { error: { message: errData.error?.message || `El servidor de Google Imagen devolvió estado ${imgResponse.status}` } },
        { status: imgResponse.status }
      );
    }

    const resData = await imgResponse.json();
    return NextResponse.json(resData);
  } catch (error: any) {
    console.error('[API Generate Image] Server error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Error interno del servidor proxy.' } },
      { status: 500 }
    );
  }
}
