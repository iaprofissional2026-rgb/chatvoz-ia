import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { action, game, prompt, squadNames } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        text: '🔥 [APEX-9 TACTICAL AI]: "Squad, bora focar na call! Cobertura mútua, mira na altura da cabeça e não avança sem smoke! Vamo garantir esse round!"',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    let systemInstruction = `Você é o "APEX-9", o bot e coach tático gamer de elite do esquadrão no aplicativo de voz VORTEX COMMS.
Sua linguagem é enérgica, gamer, competitiva, autêntica de pro-player brasileiro (usa gírias como "call limpa", "rush", "clutch", "plantar", "pegar pixel", "drop", "foco no objetivo", "GG WP", "vamos ganhar").
Mantenha as respostas curtas, impactantes (2 a 4 frases no máximo), ideais para serem faladas rápido durante a partida de jogo sem atrapalhar a comunicação do time.
Jogo atual: ${game || 'Geral/FPS/Battle Royale'}.
Membros da party: ${squadNames ? squadNames.join(', ') : 'Squad'}.`;

    let userPrompt = '';
    if (action === 'callout') {
      userPrompt = `Dê uma call rápida ou tática agressiva de vitória para o time no jogo ${game || 'FPS'}. Diga exatamente o que o time deve fazer agora.`;
    } else if (action === 'hype') {
      userPrompt = `O time acabou de perder um round ou está tenso. Mande uma mensagem de hype e liderança curta para animar a galera e buscar o clutch!`;
    } else if (action === 'gg') {
      userPrompt = `O time acabou de vencer a partida! Mande um GG histórico e parabenize o esquadrão pela sincronia na call.`;
    } else {
      userPrompt = prompt || `Dê uma dica rápida de pro player para jogar melhor hoje.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.8,
        maxOutputTokens: 250,
      },
    });

    return NextResponse.json({
      text: response.text || '🔥 [APEX-9]: "Bora squad! Segura a call e mira firme!"',
    });
  } catch (err: unknown) {
    console.error('Gemini coach error:', err);
    return NextResponse.json({
      text: '⚡ [APEX-9 TACTICAL AI]: "Call rápida: reagrupem no bomb, usem os utilitários e ninguém abre pixel sozinho! Bora squad!"',
    });
  }
}
