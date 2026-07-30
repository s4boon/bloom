type MaskProps = {
  url: string;
  scale: { x: string; y: string };
  origin: { x: string; y: string };
};

export const masks: MaskProps[] = [
  {
    url: "/branches/1.svg",
    scale: { x: "100%", y: "auto" },
    origin: { x: "0%", y: "100%" },
  },
  {
    url: "/branches/2.svg",
    scale: { x: "70%", y: "auto" },
    origin: { x: "0%", y: "0%" },
  },
  {
    url: "/branches/3.svg",
    scale: { x: "100%", y: "auto" },
    origin: { x: "13%", y: "90%" },
  },
  {
    url: "/branches/4.svg",
    scale: { x: "100%", y: "auto" },
    origin: { x: "100%", y: "100%" },
  },
  {
    url: "/branches/5.svg",
    scale: { x: "80%", y: "auto" },
    origin: { x: "0%", y: "0%" },
  },
  {
    url: "/branches/6.svg",
    scale: { x: "100%", y: "auto" },
    origin: { x: "45%", y: "120%" },
  },
];

export function getRandomMask(): MaskProps {
  return masks[Math.floor(Math.random() * masks.length)];
}
