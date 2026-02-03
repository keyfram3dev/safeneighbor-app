import React from 'react';
import { SpeakerHigh, Megaphone, House } from '@phosphor-icons/react';

// Community Alert Signals (ICE-focused)
const communitySignals = [
  {
    pattern: '• (One Short)',
    title: 'Alert / Attention',
    description: 'Eyes here. A neighbor is signaling that something requires immediate attention. Look for the source of the signal.',
    neighborResponse: 'Observe from a distance. Prepare to document if needed.'
  },
  {
    pattern: '• • (Two Short)',
    title: 'Support Requested',
    description: 'Gathering signal. A neighbor needs support or witnesses. This signals for the community to congregate nearby while maintaining safe legal distance.',
    neighborResponse: 'Move toward the signal safely. Bring your recording device.'
  },
  {
    pattern: '• • • (Three Short)',
    title: 'ICE Confirmed / Emergency',
    description: 'Active encounter in progress. This is a critical distress signal indicating an immediate threat to the community.',
    neighborResponse: 'Activate legal support networks. Ensure children and vulnerable neighbors are sheltered.'
  },
  {
    pattern: '—— (One Long)',
    title: 'Danger / Shelter',
    description: 'High risk. Stay inside. This signal is used when it is no longer safe to be on the street or when a sweep is underway.',
    neighborResponse: 'Remain indoors. Secure your door. Do not open for anyone without a judicial warrant.'
  }
];

// Protest Whistle Protocol
const whistleProtocol = [
  {
    pattern: 'One Long Blast',
    meaning: '"Heads Up" / Attention',
    action: 'Stop chanting, look toward the signal source.'
  },
  {
    pattern: 'Three Short Blasts',
    meaning: 'Medical Emergency',
    action: 'Clear a path; look for a medic (Red Cross/Tape).'
  },
  {
    pattern: 'Continuous Short Blasts',
    meaning: 'Immediate Danger/Advance',
    action: 'Move to the designated exit or "safe zone."'
  }
];

// Visual Hand Signals
const handSignals = [
  {
    gesture: 'Hands in an "X" above head',
    meaning: '"Stop moving" or "Blockage ahead."'
  },
  {
    gesture: 'Twinkling fingers (Jazz hands)',
    meaning: '"Agreement" (allows for quiet consensus without drowning out speakers).'
  },
  {
    gesture: 'Pointing Up',
    meaning: '"Keep moving forward."'
  },
  {
    gesture: 'Fist raised',
    meaning: '"Stay still/Hold the line."'
  }
];

// Signal Card Component
const SignalCard = ({ pattern, title, description, neighborResponse }) => (
  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-4">
    {/* Pattern Display */}
    <div className="flex items-center justify-between mb-4">
      <div className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 flex-1 mr-3">
        <p className="text-white text-center font-mono font-bold">{pattern}</p>
      </div>
      <button className="bg-slate-700 hover:bg-slate-600 p-3 rounded-full transition-colors">
        <SpeakerHigh size={20} weight="bold" className="text-slate-300" />
      </button>
    </div>

    {/* Title and Description */}
    <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-300 text-sm mb-4 leading-relaxed">{description}</p>

    {/* Neighbor Response Box */}
    <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
      <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">NEIGHBOR RESPONSE</p>
      <p className="text-white font-medium text-sm">{neighborResponse}</p>
    </div>
  </div>
);

function Whistle() {
  return (
    <div className="max-w-4xl mx-auto px-4 pb-24">
      {/* Header */}
      <div className="text-center mb-8 pt-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Megaphone size={36} weight="bold" className="text-blue-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">Signals Guide</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Communication protocols for safe coordination during community actions and encounters.
        </p>
      </div>

      {/* Section 1: Community Alert Signals */}
      <div className="mb-10">
        {/* The Hierarchy of Sound */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔊</span>
            <h2 className="text-xl font-bold text-white">The Hierarchy of Sound</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            To prevent sensory overload, use different sounds for different purposes:
          </p>
          <div className="space-y-3">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-sm mb-1">Chants</p>
              <p className="text-slate-300 text-sm">Used for morale, public messaging, and rhythm.</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-sm mb-1">Drums/Percussion</p>
              <p className="text-slate-300 text-sm">Used to set the pace of a march and maintain energy.</p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-sm mb-1">Whistles/Air Horns</p>
              <p className="text-slate-300 text-sm">Strictly reserved for tactical alerts (e.g., medical emergency, police line movement, or a "stop" command).</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <House size={24} weight="bold" className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">Community Alert Signals</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          Use these patterns to communicate with neighbors without shouting during ICE encounters.
        </p>

        {communitySignals.map((signal, index) => (
          <SignalCard
            key={index}
            pattern={signal.pattern}
            title={signal.title}
            description={signal.description}
            neighborResponse={signal.neighborResponse}
          />
        ))}
      </div>

      {/* Section 2: Whistle Protocol */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📣</span>
          <h2 className="text-xl font-bold text-white">The Whistle Protocol</h2>
        </div>
        <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4 mb-4">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">THE "SIGNAL-ONLY" RULE</p>
          <p className="text-white text-sm">If you aren't signaling a change in the environment, keep the whistle silent.</p>
        </div>

        {/* Protocol Table */}
        <div className="space-y-3">
          {whistleProtocol.map((item, index) => (
            <div key={index} className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <span className="bg-slate-700 text-white text-xs font-mono font-bold px-3 py-1 rounded inline-block w-fit">
                  {item.pattern}
                </span>
                <span className="text-cyan-400 font-bold text-sm">{item.meaning}</span>
              </div>
              <p className="text-slate-300 text-sm">{item.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Visual Signaling */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">👐</span>
          <h2 className="text-xl font-bold text-white">Visual Signaling</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          In large crowds where sound carries poorly, use hand signals to relay information back through the ranks (the "Human Microphone").
        </p>
        <div className="space-y-3">
          {handSignals.map((signal, index) => (
            <div key={index} className="flex items-start gap-3 bg-slate-900/50 rounded-lg p-4">
              <span className="text-cyan-400 font-bold text-2xl">✋</span>
              <div>
                <p className="text-white font-bold text-sm mb-1">{signal.gesture}</p>
                <p className="text-slate-300 text-sm">{signal.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: De-escalation */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🌡️</span>
          <h2 className="text-xl font-bold text-white">De-escalation & "Lowering the Temp"</h2>
        </div>
        <p className="text-slate-400 text-sm mb-4">
          When the energy becomes frantic or aggressive in a way that risks safety:
        </p>
        <div className="space-y-3">
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <p className="text-red-400 font-bold text-sm mb-2">Drop the Volume</p>
            <p className="text-slate-300 text-sm">If the crowd is getting agitated, organizers should switch to a lower-frequency, slower chant to bring the heart rate of the group down.</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4">
            <p className="text-red-400 font-bold text-sm mb-2">The "Sit Down" Tactic</p>
            <p className="text-slate-300 text-sm">If police tension is high, having the front line sit down communicates non-aggression and makes it physically harder for a "surge" to happen.</p>
          </div>
        </div>
      </div>

      {/* Section 6: Digital & External Comms */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">📱</span>
          <h2 className="text-xl font-bold text-white">Digital & External Comms</h2>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-cyan-400 font-bold text-sm mb-2">The "Buddy System"</p>
            <p className="text-slate-300 text-sm">Never rely solely on a whistle. Ensure every person has a "point person" to check in with.</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4">
            <p className="text-cyan-400 font-bold text-sm mb-2">Signal/Telegram Groups</p>
            <p className="text-slate-300 text-sm">Use encrypted apps for logistical updates (e.g., "Water station moved to 5th and Main"), but remember that cell towers often fail in large crowds.</p>
          </div>
        </div>
      </div>

      {/* Best Practices Summary */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-amber-400 text-xl">💡</span>
          <h3 className="text-white font-bold">Key Reminders</h3>
        </div>
        <ul className="space-y-3">
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>Keep a high-quality metal whistle on your keychain at all times.</span>
          </li>
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>Practice signals with neighbors during community meetings.</span>
          </li>
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>If you hear a signal, repeat it twice to confirm receipt and relay it through the neighborhood.</span>
          </li>
          <li className="text-slate-300 text-sm flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>Whistles are for emergencies only—overuse leads to "noise fatigue."</span>
          </li>
        </ul>
      </div>

      {/* Nietzsche Quote */}
      <div className="text-center mb-8">
        <p className="text-slate-400 italic text-sm mb-2">
          "He who has a why to live can bear almost any how."
        </p>
        <p className="text-slate-500 text-xs">— FRIEDRICH NIETZSCHE</p>
      </div>

      {/* Disclaimer */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-amber-500">⚠️</span>
          <h3 className="text-amber-400 font-medium text-xs tracking-wider">DISCLAIMER</h3>
        </div>
        <p className="text-slate-500 text-xs mb-1">
          This app shares general info on your rights — not legal advice.
        </p>
        <p className="text-slate-500 text-xs mb-1">
          I'm not a lawyer, and accuracy isn't guaranteed.
        </p>
        <p className="text-slate-500 text-xs mb-1">
          For legal help, talk to a licensed attorney.
        </p>
        <p className="text-slate-500 text-xs">
          Use this info at your own discretion.
        </p>
      </div>

      {/* Install CTA */}
      <div className="text-center">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 flex items-center justify-center gap-2 mx-auto">
          <span>📲</span>
          INSTALL BROWSERLESS APP
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          Recommended for offline & secure use
        </p>
      </div>
    </div>
  );
}

export default Whistle;
