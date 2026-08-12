import { ParticleTextEffect } from "@/components/ui/interactive-text-particle";

const DemoOne = () => {
  return (
    <ParticleTextEffect
      text="Resilience"
      className="absolute top-0 left-0"
      colors={['ff6b6b', 'feca57', '48dbfb', '1dd1a1']}
    />
  );
};

export { DemoOne };
