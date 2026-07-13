import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, geminiKey } = await request.json();
    
    if (!prompt || !geminiKey) {
      return NextResponse.json(
        { error: { message: 'Falta el prompt o la clave API de Gemini.' } },
        { status: 400 }
      );
    }

    // Call the official Google Gemini 3.5 Flash API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey.trim()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ['IMAGE']
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: { message: errData.error?.message || `El servidor de Google devolvió estado ${response.status}` } },
        { status: response.status }
      );
    }

    const resData = await response.json();
    return NextResponse.json(resData);
  } catch (error: any) {
    console.error('[API Generate Image] Server error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Error interno del servidor proxy.' } },
      { status: 500 }
    );
  }
}
