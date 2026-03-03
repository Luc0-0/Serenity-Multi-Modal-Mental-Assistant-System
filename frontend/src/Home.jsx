export default function Home({ onStart }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-8 max-w-md">
        <h1 className="text-4xl md:text-5xl text-offwhite font-light">
          You're safe here
        </h1>
        
        <p className="text-mutedgray text-lg font-light">
          A quiet space to breathe, reflect, and feel heard.
        </p>
        
        <button 
          onClick={onStart}
          className="mt-12 px-8 py-3 bg-graphite hover:bg-brass/10 border border-brass/30 hover:border-brass/60 text-brass rounded-sm transition-all duration-300 ease-out font-sans tracking-wide"
        >
          Check in
        </button>
      </div>
    </div>
  );
}
