import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'VORTEX COMMS - Party Chat Gamer',
  description: 'Party chat de voz gamer futurista com WebRTC de baixa latência, salas de esquadrão, visualizador de áudio e soundboard tático.',
  openGraph: {
    title: 'VORTEX COMMS - Party Chat Gamer',
    description: 'Party chat de voz gamer futurista com WebRTC de baixa latência, salas de esquadrão, visualizador de áudio e soundboard tático.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VORTEX COMMS - Party Chat Gamer',
    description: 'Party chat de voz gamer futurista com WebRTC de baixa latência, salas de esquadrão, visualizador de áudio e soundboard tático.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
