import { useState } from 'react'

export default function CheckIn({ onSubmit }) {
  const [text, setText] = useState('')
  const [selectedEmotion, setSelectedEmotion] = useState(null)

  const emotions = ['Anxious', 'Tired', 'Overwhelmed', 'Calm', 'Sad', 'Hopeful']

  const handleSubmit = () => {
    if (!text.trim()) return
    
    onSubmit({
      text,
      emotion: selectedEmotion,
      timestamp: new Date()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-xl space-y-8">
        <h2 className="text-3xl text-center font-light">
          How are you feeling right now?
        </h2>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Take your time..."
          className="w-full h-40 bg-graphite border border-brass/20 focus:border-brass/50 rounded-sm px-4 py-3 text-offwhite placeholder-mutedgray/50 resize-none outline-none transition-colors"
        />

        <div className="flex flex-wrap gap-2 justify-center">
          {emotions.map(emotion => (
            <button
              key={emotion}
              onClick={() => setSelectedEmotion(emotion)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                selectedEmotion === emotion
                  ? 'bg-brass/20 border-brass text-brass'
                  : 'bg-graphite/50 border-brass/20 text-mutedgray hover:border-brass/40'
              } border`}
            >
              {emotion}
            </button>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="px-8 py-3 bg-graphite border border-brass/30 hover:border-brass/60 text-brass rounded-sm transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
