import { useState, useMemo } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface GifItem {
  id: string;
  title: string;
  url: string;
  category: string;
  previewUrl?: string;
}

// Curated high-quality college & reaction GIF/sticker catalog (Tenor & Giphy CDNs)
const CURATED_GIFS: GifItem[] = [
  // Trending / Vibe
  {
    id: 'vibe-cat',
    title: 'Cat Vibing Jam',
    url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif',
    category: 'trending',
  },
  {
    id: 'popcorn-eating',
    title: 'Watching Drama Popcorn',
    url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif',
    category: 'trending',
  },
  {
    id: 'mind-blown',
    title: 'Mind Blown Galaxy',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    category: 'reactions',
  },
  {
    id: 'this-is-fine',
    title: 'This Is Fine Dog',
    url: 'https://media.giphy.com/media/9M5jK4GXmD5o1irGrF/giphy.gif',
    category: 'exams',
  },
  {
    id: 'crying-studying',
    title: 'Studying All Night Stress',
    url: 'https://media.giphy.com/media/3o6Mb43Nm2WgsE50r6/giphy.gif',
    category: 'exams',
  },
  {
    id: 'celebrate-dance',
    title: 'Victory Dance Placement',
    url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif',
    category: 'celebrate',
  },
  {
    id: 'pepe-clapping',
    title: 'Clapping GG',
    url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif',
    category: 'celebrate',
  },
  {
    id: 'laughing-hard',
    title: 'Laughing Hysterical Meme',
    url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif',
    category: 'memes',
  },
  {
    id: 'side-eye-dog',
    title: 'Suspicious Side Eye',
    url: 'https://media.giphy.com/media/3gNotAoIRZsb9UHPnj/giphy.gif',
    category: 'memes',
  },
  {
    id: 'confused-math',
    title: 'Math Formula Confused',
    url: 'https://media.giphy.com/media/APqEbxBsVlkW9krECY/giphy.gif',
    category: 'exams',
  },
  {
    id: 'nodding-agree',
    title: 'Jeremiah Johnson Nodding',
    url: 'https://media.giphy.com/media/gVoBC0SuaHStq/giphy.gif',
    category: 'reactions',
  },
  {
    id: 'cheering-crowd',
    title: 'Crowd Cheering Fest',
    url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
    category: 'celebrate',
  },
  {
    id: 'typing-fast',
    title: 'Hacker Typing Code',
    url: 'https://media.giphy.com/media/ule4akeEDWA0g/giphy.gif',
    category: 'memes',
  },
  {
    id: 'leonardo-toast',
    title: 'Great Gatsby Toast Cheers',
    url: 'https://media.giphy.com/media/GCLlQnV7dXZ2E/giphy.gif',
    category: 'celebrate',
  },
  {
    id: 'shocked-pikachu',
    title: 'Surprised Pikachu',
    url: 'https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif',
    category: 'reactions',
  },
  {
    id: 'mic-drop',
    title: 'Mic Drop Boom',
    url: 'https://media.giphy.com/media/3o7qDEq2bMbcbPRQ2c/giphy.gif',
    category: 'trending',
  },
];

const CATEGORIES = [
  { id: 'all', label: '🔥 All' },
  { id: 'trending', label: '⚡ Trending' },
  { id: 'memes', label: '😂 Memes' },
  { id: 'exams', label: '🎓 Exams & Prep' },
  { id: 'celebrate', label: '🎉 Celebrate' },
  { id: 'reactions', label: '🤯 Reactions' },
];

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGif: (gifUrl: string) => void;
}

export function GifPicker({ isOpen, onClose, onSelectGif }: GifPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredGifs = useMemo(() => {
    return CURATED_GIFS.filter((gif) => {
      const matchesSearch =
        !search.trim() ||
        gif.title.toLowerCase().includes(search.toLowerCase()) ||
        gif.category.toLowerCase().includes(search.toLowerCase());
      const matchesCat = selectedCategory === 'all' || gif.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
              GIF
            </div>
            <h3 className="text-sm font-bold text-foreground">Choose a GIF or Sticker</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-border/70">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search GIFs, memes, stickers..."
              className="w-full pl-9 pr-8 py-2 bg-secondary border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSearch('');
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* GIF Grid */}
        <div className="p-3 overflow-y-auto flex-1 grid grid-cols-2 gap-2 max-h-[340px]">
          {filteredGifs.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-muted-foreground text-xs">
              <Sparkles size={24} className="mx-auto mb-2 opacity-40 text-primary" />
              <p>No GIFs found matching &quot;{search}&quot;</p>
            </div>
          ) : (
            filteredGifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => {
                  onSelectGif(gif.url);
                  onClose();
                }}
                className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-secondary border border-border hover:border-primary transition-all duration-200 cursor-pointer shadow-xs"
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-[10px] font-bold text-white truncate drop-shadow">
                    {gif.title}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-secondary/40 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Click any GIF to attach to your comment</span>
          <span className="font-semibold text-primary">LastBench Reactions</span>
        </div>
      </div>
    </div>
  );
}
