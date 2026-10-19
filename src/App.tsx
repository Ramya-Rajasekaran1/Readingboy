import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';
import { DemoOne } from '@/components/ui/demo';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const maskContainerRef = useRef<HTMLDivElement>(null);
  const mouseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntersectingRef = useRef(false);

  // Detect mobile/touch
  useEffect(() => {
    const checkMobile = () => {
      const mobileWidth = window.innerWidth < 768;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobileWidth || hasTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set intro finished state after timings complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroFinished(true);
    }, 1200); // 1.2s reveal fade
    return () => clearTimeout(timer);
  }, []);



  // Motion Values for custom cursor (fast follow)
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { stiffness: 450, damping: 28 });
  const cursorY = useSpring(mouseY, { stiffness: 450, damping: 28 });

  // Spring values for mouse parallax shifts (max ±12px)
  const videoParallaxX = useMotionValue(0);
  const videoParallaxY = useMotionValue(0);
  const videoParallaxXSpring = useSpring(videoParallaxX, { stiffness: 80, damping: 20 });
  const videoParallaxYSpring = useSpring(videoParallaxY, { stiffness: 80, damping: 20 });

  // Synchronous calculation of the media card center (bypasses unpainted DOM clientRect issues)
  const getCardCenter = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const h = window.innerHeight * 0.88;
    let w = h * (3293 / 5028);
    const maxW = window.innerWidth * 0.95;
    if (w > maxW) w = maxW;
    return { x: w / 2, y: h / 2 };
  };

  const initialCenter = getCardCenter();

  // Coordinates for the organic morphing SVG blob mask
  const maskX = useMotionValue(initialCenter.x);
  const maskY = useMotionValue(initialCenter.y);
  const maskXSpring = useSpring(maskX, { stiffness: 120, damping: 18 });
  const maskYSpring = useSpring(maskY, { stiffness: 120, damping: 18 });

  useEffect(() => {
    const el = maskContainerRef.current;
    if (!el) return;

    const updateMask = () => {
      const x = Math.round(maskXSpring.get());
      const y = Math.round(maskYSpring.get());
      const grad = `radial-gradient(circle 240px at ${x}px ${y}px, black 45%, rgba(0, 0, 0, 0.08) 100%)`;
      el.style.maskImage = grad;
      el.style.webkitMaskImage = grad;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    };

    updateMask();

    const unsubX = maskXSpring.on("change", updateMask);
    const unsubY = maskYSpring.on("change", updateMask);

    return () => {
      unsubX();
      unsubY();
    };
  }, [maskXSpring, maskYSpring]);

  // Synchronous window resizing center updater
  useEffect(() => {
    const handleResize = () => {
      const center = getCardCenter();
      maskX.set(center.x);
      maskY.set(center.y);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Query video and configure playback rate on mount/load
  useEffect(() => {
    const container = mediaRef.current;
    if (!container) return;

    const video = container.querySelector('video');
    if (!video) return;

    // @ts-ignore
    videoRef.current = video;
    video.muted = true;
    video.loop = true;

    // Set initial mask coordinates to the center of the card
    const center = getCardCenter();
    maskX.set(center.x);
    maskY.set(center.y);

    // Set playback speed safely when metadata is ready (safeguards Safari freeze bug)
    const setSpeed = () => {
      video.playbackRate = 0.8;
    };
    const tryPlay = () => {
      video.muted = true;
      video.playbackRate = 0.8;
      video.play().catch(() => {});
    };
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('loadedmetadata', setSpeed);
    video.addEventListener('play', setSpeed);
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('ended', handleEnded);

    if (video.readyState >= 1) {
      setSpeed();
    }
    if (video.readyState >= 2) {
      tryPlay();
    }

    // Intersection Observer to handle continuous looping when in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isIntersectingRef.current = entry.isIntersecting;
          if (entry.isIntersecting) {
            video.muted = true;
            video.playbackRate = 0.8;
            video.play().catch(() => {});
          }
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    return () => {
      video.removeEventListener('loadedmetadata', setSpeed);
      video.removeEventListener('play', setSpeed);
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('ended', handleEnded);
      observer.disconnect();
    };
  }, [introFinished]);

  // Window Scroll tracking
  const { scrollY } = useScroll();

  // Smooth scroll spring (low stiffness and damping for buttery, slow momentum transitions)
  const smoothScrollY = useSpring(scrollY, { stiffness: 35, damping: 15 });

  // Parallax transitions for Section 1 (Hero)
  const heroY = useTransform(smoothScrollY, [0, 500], [0, -150]);
  const heroOpacity = useTransform(smoothScrollY, [0, 500], [1, 0]);

  // Parallax transitions for Section 2 (Showcase)
  const boyY = useTransform(smoothScrollY, [0, 800], [0, -120]);
  const boyOpacity = useTransform(smoothScrollY, [150, 650], [0, 1]);

  // Mouse, scroll, and touch interaction tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updatePointer = (clientX: number, clientY: number) => {
      mouseX.set(clientX);
      mouseY.set(clientY);

      const { innerWidth, innerHeight } = window;

      if (!isMobile) {
        const vX = ((clientX / innerWidth) - 0.5) * 24;
        const vY = ((clientY / innerHeight) - 0.5) * 24;
        videoParallaxX.set(vX);
        videoParallaxY.set(vY);
      }

      // Update relative mask coordinates on the media card container in Section 2
      if (mediaRef.current) {
        const rect = mediaRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;
        maskX.set(relativeX);
        maskY.set(relativeY);
        setHasInteracted(true);
      }

      const video = videoRef.current;
      if (video) {
        if (video.readyState >= 1) {
          video.playbackRate = 0.8;
        }
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
      handleInteraction();
    };

    // User interaction scroll/touch triggers to play the video (authorizes autoplay on modern browsers)
    const handleInteraction = () => {
      const video = videoRef.current;
      if (video) {
        if (video.readyState >= 1) {
          video.playbackRate = 0.8;
        }
        if (video.paused) {
          video.play()
            .then(() => console.log("Video played successfully via user interaction."))
            .catch((err) => console.log("Video play failed via interaction:", err));
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('wheel', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction);
    window.addEventListener('touchend', handleInteraction);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('touchend', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    };
  }, [isMobile, mouseX, mouseY, videoParallaxX, videoParallaxY]);

  return (
    <div
      ref={containerRef}
      className={`w-full min-h-screen bg-[#030311] text-white relative flex flex-col items-center ${
        isMobile ? '' : 'custom-cursor-active'
      }`}
    >


      {/* Cinematic Film Grain Overlay */}
      <div className="noise-overlay" />

      {/* Custom Spring Cursor Dot */}
      {!isMobile && (
        <motion.div
          className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-50 mix-blend-difference"
          style={{
            x: cursorX,
            y: cursorY,
            translateX: "-50%",
            translateY: "-50%",
          }}
        />
      )}



      {/* SECTION 1: HERO (Particle text 'Resilience') */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative w-full h-screen flex flex-col justify-center items-center overflow-hidden border-b border-white/5 z-10"
      >
        <DemoOne />

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 font-sans text-[10px] tracking-[0.25em] text-white/40 pointer-events-none">
          <span>SCROLL</span>
          <motion.span
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-xs font-light"
          >
            ↓
          </motion.span>
        </div>
      </motion.section>

      {/* SECTION 2: CINEMATIC SHOWCASE (Centered Boy Canvas - Shifted Up) */}
      <motion.section 
        style={{ y: boyY, opacity: boyOpacity }}
        className="relative w-full h-[88vh] flex flex-col justify-center items-center overflow-hidden z-10 -mt-16"
      >
        <div
          ref={mediaRef}
          onMouseLeave={() => {
            if (!isMobile) {
              if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
              const center = getCardCenter();
              maskX.set(center.x);
              maskY.set(center.y);
            }
          }}
          className="relative h-[88vh] aspect-[3293/5028] max-w-[95vw] select-none"
        >
          {/* Timed Initial Fade-in Reveal Wrapper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={introFinished ? { opacity: 1 } : { opacity: 0.85 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full relative"
          >
            {/* Interactive Parallax shifts Wrapper */}
            <motion.div
              style={{
                x: isMobile ? 0 : videoParallaxXSpring,
                y: isMobile ? 0 : videoParallaxYSpring,
              }}
              className="w-full h-full relative"
            >
              {/* Masked Wrapper for Video */}
              <div 
                ref={maskContainerRef}
                style={{ 
                  opacity: 1,
                  maskImage: `radial-gradient(circle 240px at var(--mouse-x, ${Math.round(initialCenter.x)}px) var(--mouse-y, ${Math.round(initialCenter.y)}px), black 45%, rgba(0, 0, 0, 0.08) 100%)`,
                  WebkitMaskImage: `radial-gradient(circle 240px at var(--mouse-x, ${Math.round(initialCenter.x)}px) var(--mouse-y, ${Math.round(initialCenter.y)}px), black 45%, rgba(0, 0, 0, 0.08) 100%)`,
                }}
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <video
                  ref={(el) => {
                    if (el) {
                      el.setAttribute('muted', '');
                      el.setAttribute('playsinline', '');
                      el.setAttribute('webkit-playsinline', '');
                      el.setAttribute('autoplay', '');
                      el.setAttribute('loop', '');
                      el.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');
                      el.setAttribute('disablepictureinpicture', 'true');
                      el.setAttribute('disableremoteplayback', 'true');
                      el.muted = true;
                      el.defaultMuted = true;
                      el.loop = true;
                      // @ts-ignore
                      videoRef.current = el;
                      el.play().catch(() => {});
                    }
                  }}
                  src={`${import.meta.env.BASE_URL}untitled-design.mp4`}
                  className="w-full h-full object-cover pointer-events-none"
                  style={{ transform: 'translate3d(0,0,0)', willChange: 'transform' }}
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="auto"
                  controls={false}
                  disablePictureInPicture
                  onEnded={(e) => {
                    e.currentTarget.currentTime = 0;
                    e.currentTarget.play().catch(() => {});
                  }}
                >
                  <source src={`${import.meta.env.BASE_URL}untitled-design.mp4`} type="video/mp4" />
                </video>
              </div>

              {/* Subtle Breathing Halo Cue (Guides the user that light can be moved) */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: hasInteracted ? 0 : [0.15, 0.45, 0.15],
                  scale: hasInteracted ? 0.9 : [0.95, 1.06, 0.95],
                }}
                transition={{
                  duration: 3,
                  repeat: hasInteracted ? 0 : Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  left: maskXSpring,
                  top: maskYSpring,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-72 h-72 rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(251,191,36,0.18)_0%,rgba(251,191,36,0.05)_45%,transparent_70%)] blur-md"
              />

              {/* Floating Pill Affordance Cue */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: hasInteracted ? 0 : 1,
                  y: hasInteracted ? 10 : 0,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#030311]/70 border border-white/10 backdrop-blur-md shadow-2xl shadow-black/80"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-300"></span>
                </span>
                <span className="font-sans text-[10px] tracking-[0.25em] text-white/80 font-light select-none">
                  {isMobile ? 'DRAG TO ILLUMINATE' : 'HOVER TO ILLUMINATE'}
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

{/* CSS radial-gradient mask active */}
    </div>
  );
}
