// Web Audio API procedural sound synthesizer for gamer SFX and soundboard

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export function playAirhorn(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const frequencies = [370, 392, 440]; // Discordant energetic horn frequencies

  frequencies.forEach((freq, idx) => {
    // 3 rhythmic pulses
    for (let pulse = 0; pulse < 3; pulse++) {
      const startTime = now + pulse * 0.16;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const distortion = ac.createWaveShaper();

      // subtle distortion curve for that gritty horn punch
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; ++i) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((3 + 20) * x) / (1 + 20 * Math.abs(x));
      }
      distortion.curve = curve;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq + (idx === 1 ? 5 : 0), startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, startTime + 0.14);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

      osc.connect(distortion);
      distortion.connect(gain);
      gain.connect(ac.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    }
  });
}

export function playVictory(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const notes = [
    { freq: 523.25, time: 0, dur: 0.12 }, // C5
    { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
    { freq: 783.99, time: 0.24, dur: 0.12 }, // G5
    { freq: 1046.5, time: 0.38, dur: 0.4 }, // C6 (long finish)
  ];

  notes.forEach((note) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.freq, now + note.time);

    gain.gain.setValueAtTime(0.001, now + note.time);
    gain.gain.linearRampToValueAtTime(0.25, now + note.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now + note.time);
    osc.stop(now + note.time + note.dur + 0.05);
  });
}

export function playEnemySpotted(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  // Two urgent tactical warning bleeps
  [0, 0.15].forEach((offset) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now + offset);
    osc.frequency.exponentialRampToValueAtTime(440, now + offset + 0.1);

    gain.gain.setValueAtTime(0.2, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now + offset);
    osc.stop(now + offset + 0.12);
  });
}

export function playHitmarker(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(2400, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

export function playCoinLevelUp(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(987.77, now); // B5
  osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(now);
  osc.stop(now + 0.36);
}

export function playNukeAlarm(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.linearRampToValueAtTime(750, now + 0.35);
  osc.frequency.linearRampToValueAtTime(300, now + 0.7);

  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(now);
  osc.stop(now + 0.76);
}

export function playRushBBass(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(38, now + 0.45);

  gain.gain.setValueAtTime(0.45, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(now);
  osc.stop(now + 0.52);
}

export function playUiClick(muted: boolean, ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(muted ? 300 : 700, now);
  osc.frequency.exponentialRampToValueAtTime(muted ? 180 : 950, now + 0.05);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ac.destination);

  osc.start(now);
  osc.stop(now + 0.07);
}

export function playJoinSound(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const notes = [440, 660, 880];
  notes.forEach((freq, idx) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);
    gain.gain.setValueAtTime(0.15, now + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.13);
  });
}

export function playLeaveSound(ctx?: AudioContext | null) {
  const ac = ctx || getAudioContext();
  if (!ac) return;

  const now = ac.currentTime;
  const notes = [880, 660, 440];
  notes.forEach((freq, idx) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.07);
    gain.gain.setValueAtTime(0.12, now + idx * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(now + idx * 0.07);
    osc.stop(now + idx * 0.07 + 0.13);
  });
}

export function triggerSfxById(sfxId: string) {
  switch (sfxId) {
    case 'airhorn':
      playAirhorn();
      break;
    case 'victory':
      playVictory();
      break;
    case 'enemy_spotted':
      playEnemySpotted();
      break;
    case 'hitmarker':
      playHitmarker();
      break;
    case 'coin':
      playCoinLevelUp();
      break;
    case 'nuke':
      playNukeAlarm();
      break;
    case 'rush_b':
      playRushBBass();
      break;
    default:
      playUiClick(false);
      break;
  }
}
