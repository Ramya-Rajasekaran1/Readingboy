import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion';
import { DemoOne } from '@/components/ui/demo';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [isMouseActive, setIsMouseActive] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mouseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Force play/visible state on mobile/touch since there are no hover events
  useEffect(() => {
    if (isMobile) {
      setIsMouseActive(true);
    }
  }, [isMobile]);



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

  // Coordinates for the organic morphing SVG blob mask
  const maskX = useMotionValue(0);
  const maskY = useMotionValue(0);
  const maskXSpring = useSpring(maskX, { stiffness: 120, damping: 18 });
  const maskYSpring = useSpring(maskY, { stiffness: 120, damping: 18 });

  // Blob SVG morphing variants (centered at 0, 0 - larger size)
  const blobVariants = [
    "M -160,-30 C -150,-130 -90,-180 10,-160 C 120,-140 190,-70 180,30 C 160,130 100,190 -10,180 C -120,160 -180,70 -160,-30 Z",
    "M -180,20 C -170,-100 -60,-200 40,-180 C 150,-160 160,-40 190,60 C 220,160 80,180 -30,200 C -140,220 -200,140 -180,20 Z",
    "M -150,0 C -140,-120 -80,-170 30,-150 C 140,-130 180,-60 170,40 C 150,140 90,180 -40,170 C -180,150 -170,120 -150,0 Z",
    "M -200,-20 C -180,-140 -100,-170 0,-200 C 100,-230 180,-100 180,20 C 180,140 120,200 20,180 C -90,160 -220,100 -200,-20 Z"
  ];

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
    const rect = container.getBoundingClientRect();
    maskX.set(rect.width / 2);
    maskY.set(rect.height / 2);

    // Set playback speed safely when metadata is ready (safeguards Safari freeze bug)
    const setSpeed = () => {
      video.playbackRate = 0.8;
    };
    video.addEventListener('loadedmetadata', setSpeed);
    video.addEventListener('play', setSpeed);
    if (video.readyState >= 1) {
      setSpeed();
    }

    video.play().catch((err) => {
      console.log("Autoplay play trigger failed:", err);
    });

    return () => {
      video.removeEventListener('loadedmetadata', setSpeed);
      video.removeEventListener('play', setSpeed);
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

  // Mouse movement and touch interaction tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;

      // Update cursor coordinates
      mouseX.set(clientX);
      mouseY.set(clientY);

      if (isMobile) return;

      const { innerWidth, innerHeight } = window;

      // Video Parallax (max ±12px)
      const vX = ((clientX / innerWidth) - 0.5) * 24;
      const vY = ((clientY / innerHeight) - 0.5) * 24;
      videoParallaxX.set(vX);
      videoParallaxY.set(vY);

      // Update relative mask coordinates on the media card container in Section 2
      if (mediaRef.current) {
        const rect = mediaRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;
        maskX.set(relativeX);
        maskY.set(relativeY);

        // Autoplay recovery (forces play if browser pauses it off-screen)
        const video = videoRef.current;
        if (video) {
          if (video.readyState >= 1) {
            video.playbackRate = 0.8;
          }
          if (video.paused) {
            video.play().catch(() => {});
          }
        }
      }

      // Handle activity state (reveals spotlight on mouse movement)
      setIsMouseActive(true);
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
      mouseTimeoutRef.current = setTimeout(() => {
        setIsMouseActive(false);
      }, 2000); // Fades back to dim after 2 seconds of stillness
    };

    // Mobile touch interaction to trigger autoplay in Low Power Mode
    const handleTouchStart = () => {
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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
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
        className="relative w-full h-screen flex flex-col justify-center items-center overflow-hidden z-10 -mt-16"
      >
        <div
          ref={mediaRef}
          onMouseLeave={() => {
            if (!isMobile) {
              setIsMouseActive(false);
              if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
              if (mediaRef.current) {
                const rect = mediaRef.current.getBoundingClientRect();
                maskX.set(rect.width / 2);
                maskY.set(rect.height / 2);
              }
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
              {/* Masked Wrapper for Video (dangerouslySetInnerHTML bypasses React muted compilation bugs) */}
              <div 
                style={{ 
                  opacity: 1, // Keep opacity 1 so the browser loops the video continuously in the background
                  WebkitMaskImage: 'url(#blob-mask)',
                  maskImage: 'url(#blob-mask)',
                  WebkitMask: 'url(#blob-mask)',
                  mask: 'url(#blob-mask)',
                }}
                className="absolute inset-0 w-full h-full pointer-events-none"
                dangerouslySetInnerHTML={{
                  __html: `
                    <video
                      src="/untitled-design.mp4"
                      class="w-full h-full object-cover pointer-events-none"
                      muted
                      playsinline
                      loop
                      autoplay
                    ></video>
                  `
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* SVG Mask Definition */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          {/* Gaussian Blur Filter for the mask edge */}
          <filter id="blob-blur">
            <feGaussianBlur stdDeviation="25" />
          </filter>
          
          <mask id="blob-mask" maskUnits="userSpaceOnUse">
            {/* White color inside the mask means visible, blurred path */}
            <motion.path
              animate={{ 
                d: blobVariants,
                scale: isMouseActive ? 1 : 0
              }}
              transition={{
                d: {
                  repeat: Infinity,
                  repeatType: "mirror",
                  duration: 6,
                  ease: "easeInOut"
                },
                scale: {
                  duration: 0.5,
                  ease: "easeInOut"
                }
              }}
              fill="white"
              filter="url(#blob-blur)"
              style={{
                x: maskXSpring,
                y: maskYSpring,
                originX: 0,
                originY: 0,
              }}
            />
          </mask>
        </defs>
      </svg>
    </div>
  );
}
