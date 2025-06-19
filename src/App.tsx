import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { IconButton, Tooltip, Stack, Badge, Button } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import CopyrightIcon from '@mui/icons-material/Copyright';


const CAT_NAMES = [
  "Whiskers", "Mittens", "Shadow", "Simba", "Luna", "Oliver", "Leo", "Bella", "Chloe", "Max",
  "Tiger", "Smokey", "Milo", "Cleo", "Oscar", "Jasper", "Nala", "Socks", "Toby", "Daisy",
  "Gizmo", "Willow", "Pumpkin", "Coco", "Boots", "Felix", "Misty", "Ziggy", "Peanut", "Mochi",
  "Poppy", "Ruby", "Rosie", "Charlie", "George", "Maggie", "Loki", "Sasha", "Biscuit", "Mimi",
  "Tigger", "Penny", "Muffin", "Bubbles", "Cookie", "Pepper", "Waffles", "Honey", "Maple", "Sunny"
];

interface Cat {
  id: string;
  url: string;
  name: string;
  age: { years: number; months: number };
}

interface RatedCat extends Cat {
  decision: 'liked' | 'disliked' | 'superliked';
}

const CAT_COUNT = 10;
const INITIAL_SUPER_LIKES = 2;

function getRandomName(usedNames: Set<string>) {
  let name = "";
  do {
    name = CAT_NAMES[Math.floor(Math.random() * CAT_NAMES.length)];
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

function getRandomAge() {
  const years = Math.floor(Math.random() * 6); // 0-5
  let months = Math.floor(Math.random() * 11) + 1; // 1-11
  if (years === 5) months = Math.floor(Math.random() * 12); // 0-11 for 5 years
  if (years === 0 && months < 6) months = 6; // Ensure minimum age is 6 months
  return { years, months };
}

function formatAge(age: { years: number; months: number }) {
  const { years, months } = age;
  let text = "";
  if (years > 0) text += `${years} year${years > 1 ? "s" : ""}`;
  if (months > 0) {
    if (text) text += " ";
    text += `${months} month${months > 1 ? "s" : ""}`;
  }
  return text;
}

// SVG loader as a React component
const CatLoader = () => (
  <div className="cat-loader-svg">
    <img
      src="src/assets/CatLoader.gif"
      alt="Loading cat"
    />
  </div>
);

// Skeleton for cat info (name and age)
function CatInfoSkeleton() {
  return (
    <div className="cat-gradient">
      <div className="cat-info">
        <div className="skeleton skeleton-name" />
        <div className="skeleton skeleton-age" />
      </div>
    </div>
  );
}



function App() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratedCats, setRatedCats] = useState<RatedCat[]>([]);
  const [current, setCurrent] = useState(0);
  const [finished, setFinished] = useState(false);
  const [catImageLoading, setCatImageLoading] = useState<{ [id: string]: boolean }>({});
  const [lastSwipe, setLastSwipe] = useState<'left' | 'right' | null>(null);
  const [dragX, setDragX] = useState(0);
  const [showExitOverlay, setShowExitOverlay] = useState(false);
  const [exitOverlayColor, setExitOverlayColor] = useState<string>('rgba(0,0,0,0)');
  const [superLikes, setSuperLikes] = useState(2);
  const [history, setHistory] = useState<{cat: Cat, decision: 'liked'|'disliked'|null}[]>([]);
  const [pendingSummary, setPendingSummary] = useState(false);
  const [lastAction, setLastAction] = useState<'swipe' | 'undo' | null>(null);
  const [showSuperLikeAnimation, setShowSuperLikeAnimation] = useState(false);
  const loadingRef = useRef(false);
  const usedNames = useRef<Set<string>>(new Set());
  

  // Fetch a single cat
  const fetchCat = async (index: number): Promise<Cat> => {
    const timestamp = Date.now() + index;
    const response = await fetch(`https://cataas.com/cat?t=${timestamp}`);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const name = getRandomName(usedNames.current);
    const age = getRandomAge();
    return { id: `cat-${index}`, url: blobUrl, name, age };
  };

  // Load the first cat, then load the rest in the background
  useEffect(() => {
    let isMounted = true;
    loadingRef.current = true;

    const loadFirstCat = async () => {
      try {
        const firstCat = await fetchCat(0);
        if (isMounted) {
          setCats([firstCat]);
          setCatImageLoading({ [firstCat.id]: true });
          setLoading(false);
        }
        // Start loading the rest in the background
        loadRemainingCats(isMounted, [firstCat]);
      } catch (error) {
        setLoading(false);
      }
    };

    const loadRemainingCats = async (isMounted: boolean, currentCats: Cat[]) => {
      const loadedCats = [...currentCats];
      for (let i = 1; i < CAT_COUNT; i++) {
        try {
          const cat = await fetchCat(i);
          loadedCats.push(cat);
          if (isMounted) {
            setCats([...loadedCats]);
            setCatImageLoading(prev => ({ ...prev, [cat.id]: true }));
          }
        } catch (error) {
          // Optionally handle error
        }
      }
    };

    loadFirstCat();

    // Clean up blob URLs when component unmounts
    return () => {
      isMounted = false;
      loadingRef.current = false;
      cats.forEach(cat => {
        if (cat.url && cat.url.startsWith('blob:')) {
          URL.revokeObjectURL(cat.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwipe = (direction: 'left' | 'right', cat: Cat) => {
    setLastAction('swipe');
    setLastSwipe(direction);
    setShowExitOverlay(true);
    setExitOverlayColor(direction === 'right'
      ? 'rgba(0, 200, 83, 0.9)'
      : 'rgba(238, 21, 5, 0.9)'
    );
    const decision = direction === 'right' ? 'liked' : 'disliked';
    setRatedCats(prev => [...prev, { ...cat, decision }]);
    setHistory(prev => [...prev, { cat, decision }]);
    const next = current + 1;
    if (next >= CAT_COUNT) {
      setPendingSummary(true);
    setCurrent(next);
    } else if (next >= cats.length) {
      setCurrent(next);
      setLoading(true);
      const interval = setInterval(() => {
        if (cats.length > next) {
          setLoading(false);
          clearInterval(interval);
        }
      }, 200);
    } else {
      setCurrent(next);
    }
  };

  // Undo logic
  const handleUndo = () => {
    if (current === 0 || history.length === 0) return;
    setLastAction('undo');
    setFinished(false);
    setCurrent(prev => prev - 1);
    setRatedCats(prev => prev.slice(0, -1));
    setHistory(prev => prev.slice(0, -1));
  };


  // Like/Dislike/SuperLike logic
  const handleButtonSwipe = (decision: 'liked' | 'disliked' | 'superliked') => {
    if (showSuperLikeAnimation) return;
    if (!currentCat || isCurrentCatLoading) return;
    if (decision === 'superliked' && superLikes > 0) {
      setSuperLikes(prev => prev - 1);
      setShowSuperLikeAnimation(true);
      setTimeout(() => {
        setLastSwipe('right');
        setRatedCats(prev => [...prev, { ...currentCat, decision: 'superliked' }]);
        setHistory(prev => [...prev, { cat: currentCat, decision: 'liked' }]);
        setCurrent(prev => prev + 1);
        setShowSuperLikeAnimation(false);
      }, 2200);
    } else if (decision === 'liked') {
      handleSwipe('right', currentCat);
    } else if (decision === 'disliked') {
      handleSwipe('left', currentCat);
    }
  };

  // Helper to get overlay color based on dragX
  function getOverlayColor(x: number) {
    const max = 200; // max drag for full color
    if (x > 0) {
      // Green for right
      const alpha = Math.min(Math.abs(x) / max, 1) * 0.5;
      return `rgba(0, 200, 83, ${alpha})`;
    } else if (x < 0) {
      // Red for left
      const alpha = Math.min(Math.abs(x) / max, 1) * 0.5;
      return `rgba(244, 67, 54, ${alpha})`;
    }
    return 'rgba(0,0,0,0)';
  }

  // Framer Motion variants for swipe and undo
  const cardVariants = {
    enter: (custom: { lastAction: 'swipe' | 'undo' | null, lastSwipe: 'left' | 'right' | null }) => {
      if (custom.lastAction === 'undo') {
        return { opacity: 0, scale: 0.7, y: -120 };
      }
      return { opacity: 0, scale: 0.8 };
    },
    center: { opacity: 1, scale: 1, x: 0, y: 0 },
    exit: (custom: { lastAction: 'swipe' | 'undo' | null, lastSwipe: 'left' | 'right' | null }) => {
      if (custom.lastAction === 'undo') {
        return {
          opacity: 0,
          scale: 0.7,
          y: 120,
          transition: { duration: 0.35 }
        };
      }
      return {
        x: custom.lastSwipe === 'left' ? -400 : custom.lastSwipe === 'right' ? 400 : 0,
        opacity: 0,
        scale: 0.5,
        transition: { duration: 0.35 }
      };
    },
  };

  const currentCat = cats[current];
  const isCurrentCatLoading = currentCat ? catImageLoading[currentCat.id] : false;

  useEffect(() => {
    setShowExitOverlay(false);
    setExitOverlayColor('rgba(0,0,0,0)');
  }, [current]);

  useEffect(() => {
    setSuperLikes(INITIAL_SUPER_LIKES - ratedCats.filter(cat => cat.decision === 'superliked').length);
  }, [ratedCats]);

  return (
    <div className="app">
      {/* Top Bar */}
      <div
        style={{
          width: '100%',
          background: 'linear-gradient(-30deg, #FFE1A8 0%, #33CCCC 40%, #33CCCC 70%, #FFE1A8 100%)',
          boxShadow: '0 2px 8px rgba(15, 3, 38, 0.51)',
          padding: '0px 0 0px 0',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100,
          textAlign: 'center',
          borderRadius: '0 0 16px 16px',
        }}
      >
        <h1 style={{
          color: 'rgba(15, 3, 38, 1)',}}>
          Paws & Preferences🐾
        </h1>
      </div>
      {/* Spacer for top bar */}
      <div
        style={{
          height: '56px',
        }}
        className="top-bar-spacer"
      />
      <style>
        {`
          @media (min-width: 600px) {
        .top-bar-spacer {
          height: 100px !important;
        }
          }
        `}
      </style>
      {!finished ? (
        <>
          <div className="card-stack" style={{ position: 'relative', pointerEvents: showSuperLikeAnimation ? 'none' : 'auto' }}>
            {cats.length === 0 ? (
              <div className="cat-card skeleton-card">
                <CatLoader />
                <CatInfoSkeleton />
              </div>
            ) : (
              <>
                <AnimatePresence
                  mode="wait"
                  custom={{ lastAction, lastSwipe }}
                  onExitComplete={() => {
                    if (pendingSummary) {
                      setTimeout(() => setFinished(true), 200);
                      setPendingSummary(false);
                    }
                  }}
                >
                  {currentCat && current < cats.length && (
                    <motion.div
                      key={currentCat.id}
                      className="cat-card"
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      custom={{ lastAction, lastSwipe }}
                      variants={cardVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      style={{
                        touchAction: 'pan-y',
                        rotate: dragX / 30,
                        filter: showSuperLikeAnimation ? 'blur(8px)' : 'none'
                      }}
                      onDrag={(e, info) => {
                        if (showSuperLikeAnimation) return;
                        setDragX(info.offset.x);
                      }}
                      onDragEnd={(e, info) => {
                        if (showSuperLikeAnimation) return;
                        setDragX(0);
                        if (info.offset.x > 100 && !isCurrentCatLoading) handleSwipe('right', currentCat);
                        else if (info.offset.x < -100 && !isCurrentCatLoading) handleSwipe('left', currentCat);
                      }}
                    >
                      <div
                        className="drag-overlay"
                        style={{
                          background: showExitOverlay
                            ? exitOverlayColor
                            : getOverlayColor(dragX)
                        }}
                      />
                      <img
                        src={currentCat.url}
                        alt="Cute cat"
                        draggable={false}
                        style={isCurrentCatLoading ? { opacity: 0.5 } : {}}
                        onLoad={() =>
                          setCatImageLoading(prev => ({
                            ...prev,
                            [currentCat.id]: false
                          }))
                        }
                      />
                      {isCurrentCatLoading && (
                        <div className="cat-loader-overlay">
                          <CatLoader />
                        </div>
                      )}
                      {isCurrentCatLoading ? (
                        <CatInfoSkeleton />
                      ) : (
                        <div className="cat-gradient">
                          <div className="cat-info">
                            <div className="cat-name">{currentCat.name}</div>
                            <div className="cat-age">{formatAge(currentCat.age)}</div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                {current >= cats.length && cats.length > 0 && (
                  <motion.div
                    className="cat-card skeleton-card"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CatLoader />
                    <CatInfoSkeleton />
                  </motion.div>
                )}
              </>
            )}

            {/* SUPER LIKE overlay */}
            {showSuperLikeAnimation && (
                <motion.div
                className="superlike-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                }}
                >
                <motion.img
                  src="src/assets/CatSuper.png"
                  alt="Super Cat"
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  style={{
                  width: '80px',
                  height: '80px',
                  filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.45)) drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                  }}
                />
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', marginTop: '20px', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
                >
                  SUPER
                </motion.div>
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                  style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', marginTop: '0px', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)' }}
                >
                  LIKED
                </motion.div>
                </motion.div>
            )}
          </div>
          
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{
              mt: { xs: 3, sm: 6, md: 9 }, // Responsive margin top: small on mobile, large on desktop
            }}
            >
            <Tooltip title="Undo">
              <IconButton
                color="warning"
                onClick={handleUndo}
                disabled={current === 0 || showSuperLikeAnimation}
                sx={{
                  background: '#fffbe6',
                  width: { xs: 48, sm: 56, md: 59 },
                  height: { xs: 48, sm: 56, md: 59 },
                  '&:hover': { background: '#fff' },
                }}
              >
                <UndoIcon sx={{ fontSize: { xs: 28, sm: 32, md: 33 } }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Dislike">
              <IconButton
                color="error"
                onClick={() => handleButtonSwipe('disliked')}
                disabled={showSuperLikeAnimation}
                sx={{
                  background: '#ffeaea',
                  width: { xs: 48, sm: 56, md: 59 },
                  height: { xs: 48, sm: 56, md: 59 },
                  '&:hover': { background: '#fff' },
                }}
              >
                <CloseIcon sx={{ fontSize: { xs: 28, sm: 32, md: 33 } }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Like">
              <IconButton
                color="success"
                onClick={() => handleButtonSwipe('liked')}
                disabled={showSuperLikeAnimation}
                sx={{
                  background: '#eaffea',
                  width: { xs: 48, sm: 56, md: 59 },
                  height: { xs: 48, sm: 56, md: 59 },
                  '&:hover': { background: '#fff' },
                }}
              >
                <FavoriteIcon sx={{ fontSize: { xs: 28, sm: 32, md: 33 } }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Super Like">
              <Badge badgeContent={superLikes} color="primary" overlap="circular">
                <IconButton
                  color="info"
                  onClick={() => handleButtonSwipe('superliked')}
                  disabled={superLikes === 0 || showSuperLikeAnimation}
                  sx={{
                    background: '#e6f3ff',
                    width: { xs: 48, sm: 56, md: 59 },
                    height: { xs: 48, sm: 56, md: 59 },
                    '&:hover': { background: '#fff' },
                  }}
                >
                  <StarIcon sx={{ fontSize: { xs: 28, sm: 32, md: 33 } }} />
                </IconButton>
              </Badge>
            </Tooltip>
          </Stack>
        </>
      ) : (
        <motion.div
          className="summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Loved Cats Summary Message */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ marginTop: 0, marginBottom: 8 }}
          >
            {(() => {
                const likedCount = ratedCats.filter(cat => cat.decision === 'liked' || cat.decision === 'superliked').length;
              if (likedCount === 0) return "You didn't like any cats 😿";
              if (likedCount === 1) return "You loved 1 cat 😸";
              return `You loved ${likedCount} cats 😻`;
            })()}
          </motion.h2>

          {/* Super Liked Cats Section */}
          {ratedCats.some(cat => cat.decision === 'superliked') && (
            <>
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
              >
                Super Liked Cats <span style={{ color: '#ffb300' }}>&lt;3</span>
              </motion.h3>
              <div className="super-liked-gallery">
                {ratedCats.filter(cat => cat.decision === 'superliked').map((cat, i) => (
                  <motion.div
                    className="gallery-card"
                    key={cat.id + '-superliked'}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.38, delay: 0.15 + i * 0.13 }}
                  >
                    <motion.img
                      src={cat.url}
                      alt="Super liked cat"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.38, delay: 0.15 + i * 0.13 }}
                    />
                    <div className="cat-gradient-summary">
                      <div className="cat-info">
                        <div className="cat-name-card">{cat.name}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}

          {/* Liked Cats Section */}
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
          >
            Liked Cats ✅
          </motion.h3>
          <div className="liked-gallery">
            {ratedCats.filter(cat => cat.decision === 'liked').map((cat, i) => (
              <motion.div
                className="gallery-card"
                key={cat.id + '-liked'}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.38, delay: 0.35 + i * 0.13 }}
              >
                <motion.img
                  src={cat.url}
                  alt="Liked cat"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.38, delay: 0.35 + i * 0.13 }}
                />
                <div className="cat-gradient-summary">
                  <div className="cat-info">
                    <div className="cat-name-card">{cat.name}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 + ratedCats.filter(cat => cat.decision === 'liked').length * 0.13 + 0.2 }}
          >
            Disliked Cats ❌
          </motion.h3>
          <div className="liked-gallery">
            {ratedCats.filter(cat => cat.decision === 'disliked').map((cat, i) => (
              <motion.div
                className="gallery-card"
                key={cat.id + '-disliked'}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.38,
                  delay:
                    0.35 +
                    ratedCats.filter(cat => cat.decision === 'liked').length * 0.13 +
                    0.2 +
                    i * 0.13,
                }}
              >
                <motion.img
                  src={cat.url}
                  alt="Disliked cat"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.38,
                    delay:
                      0.35 +
                      ratedCats.filter(cat => cat.decision === 'liked').length * 0.13 +
                      0.2 +
                      i * 0.13,
                  }}
                />
                <div className="cat-gradient-summary">
                  <div className="cat-info">
                    <div className="cat-name-card">{cat.name}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay:
                0.25 +
                ratedCats.filter(cat => cat.decision === 'liked').length * 0.13 +
                0.2 +
                ratedCats.filter(cat => cat.decision === 'disliked').length * 0.13 +
                0.2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{
                mt: 3,
                backgroundColor: '#FFE1A8',
                color: '#000',
                fontSize: 16,
                fontFamily: 'inherit',
                borderRadius: '10px',
                boxShadow: 'none',
                px: '20px',
                py: '10px',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#FFD085',
                  boxShadow: 'none',
                },
                '&:focus, &:focus-visible': {
                  transform: 'scale(0.97)',
                },
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              component={motion.button}
            >
              More Cats
            </Button>
          </motion.div>
        </motion.div>
      )}
      {/* Bottom Bar */}
      <div
        style={{
          width: '100%',
          background: 'rgba(51, 204, 204, 1)',
          boxShadow: '0 0px 8px rgba(15, 3, 38, 0.51)',
          padding: '6px 0 7px 0',
          position: 'fixed',
          bottom: 0,
          left: 0,
          zIndex: 100,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 16, color: 'rgba(15, 3, 38, 1)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Made with ❤️ by Luccman
          <CopyrightIcon sx={{ fontSize: 18, verticalAlign: 'middle' }} />

        </span>
      </div>
      {/* Spacer for bottom bar */}
      <div style={{ height: 40 }} />
    </div>
  );
}

export default App;

