import { useMemo } from "react";

/**
 * BobaCupAnimation
 *
 * Props:
 *   itemName       – string: the menu item name (used to pick liquid colour)
 *   sectionKey     – string: "milk-teas" | "fruit-teas" | "specialties" | "toppings"
 *   size           – "regular" | "large"
 *   iceLevel       – "No Ice" | "Light Ice" | "Regular Ice" | "Extra Ice"
 *   toppingIds     – number[]: selected topping option IDs
 *   customizationOptions – full options array (to resolve IDs → names)
 */
export default function BobaCupAnimation({
  itemName = "",
  sectionKey = "milk-teas",
  size = "regular",
  iceLevel = "Regular Ice",
  toppingIds = [],
  customizationOptions = [],
}) {
  /* ── Liquid colour ───────────────────────────────────────────── */
  const liquidColor = useMemo(() => {
    const n = itemName.toLowerCase();
    if (n.includes("taro"))          return { base: "#c9a0dc", mid: "#b57abf", foam: "#e8cff5" };
    if (n.includes("matcha"))        return { base: "#7ab648", mid: "#5d9130", foam: "#c5e8a0" };
    if (n.includes("brown sugar"))   return { base: "#8b5e3c", mid: "#6e4523", foam: "#d4a574" };
    if (n.includes("thai"))          return { base: "#e8803a", mid: "#c4612a", foam: "#fbd0a0" };
    if (n.includes("chocolate"))     return { base: "#6b3a2a", mid: "#4e2518", foam: "#c48060" };
    if (n.includes("coffee"))        return { base: "#7a5230", mid: "#5c3818", foam: "#c4996a" };
    if (n.includes("strawberry"))    return { base: "#f06080", mid: "#d04060", foam: "#fbb0c0" };
    if (n.includes("mango"))         return { base: "#ffb347", mid: "#e8922a", foam: "#ffe0a0" };
    if (n.includes("lychee"))        return { base: "#f5c2d0", mid: "#e0a0b8", foam: "#fce8f0" };
    if (n.includes("peach"))         return { base: "#ffb07c", mid: "#e8904a", foam: "#ffd5b0" };
    if (n.includes("passion"))       return { base: "#e86090", mid: "#c0406a", foam: "#f5b0d0" };
    if (n.includes("wintermelon"))   return { base: "#b8d8b0", mid: "#88b880", foam: "#d8f0d0" };
    if (n.includes("honey"))         return { base: "#d4a84b", mid: "#b8882e", foam: "#f0d890" };
    if (n.includes("coconut"))       return { base: "#e8e0d0", mid: "#c8c0a8", foam: "#f8f4ec" };
    if (n.includes("jasmine"))       return { base: "#d0e8c0", mid: "#a8c890", foam: "#e8f5d8" };
    if (n.includes("mint"))          return { base: "#a8e0c8", mid: "#70c0a0", foam: "#d0f5e8" };
    if (n.includes("oreo"))          return { base: "#888888", mid: "#555555", foam: "#cccccc" };
    if (sectionKey === "fruit-teas") return { base: "#f5b060", mid: "#d88030", foam: "#ffe0b0" };
    // default milk tea
    return { base: "#c8a070", mid: "#a07840", foam: "#e8d0a8" };
  }, [itemName, sectionKey]);

  /* ── Topping visuals ─────────────────────────────────────────── */
  const resolvedToppingNames = useMemo(() => {
    return toppingIds.map((id) => {
      const opt = customizationOptions.find((o) => o.id === id);
      return (opt?.name || opt?.displayName || "").toLowerCase();
    });
  }, [toppingIds, customizationOptions]);

  const toppingDefs = useMemo(() => {
    const defs = [];
    for (const name of resolvedToppingNames) {
      if (name.includes("boba pearl") || name.includes("boba pearls")) {
        defs.push({ type: "boba", color: "#1a0a0a", label: "Boba Pearls" });
      } else if (name.includes("crystal boba")) {
        defs.push({ type: "crystal", color: "rgba(200,240,255,0.7)", label: "Crystal Boba" });
      } else if (name.includes("aloe")) {
        defs.push({ type: "jelly-cube", color: "#b8e8b0", label: "Aloe Jelly" });
      } else if (name.includes("lychee jelly")) {
        defs.push({ type: "jelly-blob", color: "#f5d0e8", label: "Lychee Jelly" });
      } else if (name.includes("mango jelly")) {
        defs.push({ type: "jelly-blob", color: "#ffe080", label: "Mango Jelly" });
      } else if (name.includes("chia")) {
        defs.push({ type: "chia", color: "#2a2a2a", label: "Chia Seeds" });
      } else if (name.includes("popping boba")) {
        defs.push({ type: "popping", color: "#ff6090", label: "Popping Boba" });
      } else if (name.includes("pudding")) {
        defs.push({ type: "pudding", color: "#f0c060", label: "Pudding" });
      }
    }
    return defs;
  }, [resolvedToppingNames]);

  /* ── Sizes ───────────────────────────────────────────────────── */
  const isLarge = size === "large";
  // Cup SVG viewBox is fixed; we scale the cup shape
  const cupW = isLarge ? 110 : 88;
  const cupH = isLarge ? 170 : 140;
  const cupX = isLarge ? 95 : 106; // center offset in 300-wide viewBox
  const cupTopY = isLarge ? 30 : 44;
  const cupBotY = isLarge ? 200 : 184;

  /* ── Ice ─────────────────────────────────────────────────────── */
  const iceCount = useMemo(() => {
    if (iceLevel === "No Ice")    return 0;
    if (iceLevel === "Light Ice") return 2;
    if (iceLevel === "Regular Ice") return 4;
    if (iceLevel === "Extra Ice") return 7;
    return 4;
  }, [iceLevel]);

  /* deterministic ice positions */
  const iceChunks = useMemo(() => {
    const chunks = [];
    const positions = [
      { x: 130, y: 80 }, { x: 155, y: 95 }, { x: 120, y: 110 },
      { x: 160, y: 70 }, { x: 140, y: 60 }, { x: 115, y: 75 },
      { x: 168, y: 110 },
    ];
    for (let i = 0; i < iceCount; i++) {
      const p = positions[i % positions.length];
      chunks.push({ ...p, rot: (i * 37) % 60 - 30, size: 14 + (i % 3) * 4 });
    }
    return chunks;
  }, [iceCount]);

  /* ── Topping render helpers ──────────────────────────────────── */
  const renderToppings = () => {
    const elements = [];
    let bobas = 0, jellies = 0, chias = 0;

    for (const t of toppingDefs) {
      if (t.type === "boba" || t.type === "crystal" || t.type === "popping") {
        const positions = [
          [118, 168], [132, 174], [146, 168], [160, 174],
          [124, 181], [140, 181], [154, 181],
        ];
        const slice = positions.slice(bobas * 3, bobas * 3 + 3);
        slice.forEach(([x, y]) => {
          const baseColor = t.color;
          const isTransparent = t.type === "crystal";
          elements.push(
            <circle key={`${t.type}-${x}-${y}`} cx={x} cy={y} r={7}
              fill={baseColor}
              stroke={isTransparent ? "rgba(100,200,255,0.5)" : "rgba(0,0,0,0.2)"}
              strokeWidth={isTransparent ? 1.5 : 0}
              style={{ filter: isTransparent ? "none" : `drop-shadow(0 2px 2px rgba(0,0,0,0.3))` }}
            />
          );
          if (!isTransparent) {
            elements.push(
              <ellipse key={`${t.type}-shine-${x}-${y}`} cx={x - 2} cy={y - 2} rx={2.5} ry={1.5}
                fill="rgba(255,255,255,0.4)" />
            );
          }
        });
        bobas++;
      } else if (t.type === "jelly-cube" || t.type === "jelly-blob") {
        const jPos = [[116, 165], [136, 170], [156, 165]];
        jPos.slice(jellies, jellies + 2).forEach(([x, y]) => {
          if (t.type === "jelly-cube") {
            elements.push(
              <rect key={`jelly-${x}-${y}`} x={x - 7} y={y - 6} width={14} height={12} rx={3}
                fill={t.color} opacity={0.85}
                style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))" }}
              />
            );
          } else {
            elements.push(
              <ellipse key={`jelly-${x}-${y}`} cx={x} cy={y} rx={8} ry={6}
                fill={t.color} opacity={0.85}
                style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.15))" }}
              />
            );
          }
        });
        jellies++;
      } else if (t.type === "chia") {
        const chiaPos = [
          [122,170],[128,176],[134,171],[140,177],[146,170],[152,176],[158,171],
          [125,183],[131,183],[137,183],[143,183],[149,183],
        ];
        chiaPos.slice(chias, chias + 8).forEach(([x, y]) => {
          elements.push(<ellipse key={`chia-${x}-${y}`} cx={x} cy={y} rx={2.5} ry={1.5} fill={t.color} opacity={0.7} />);
        });
        chias++;
      } else if (t.type === "pudding") {
        elements.push(
          <g key="pudding">
            <ellipse cx={140} cy={172} rx={22} ry={10} fill={t.color} opacity={0.9}
              style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.2))" }}
            />
            <ellipse cx={140} cy={166} rx={18} ry={8} fill="#f8d888" opacity={0.9} />
            <ellipse cx={140} cy={161} rx={12} ry={6} fill="#fce8a0" opacity={0.9} />
          </g>
        );
      }
    }
    return elements;
  };

  /* ── Cup path (trapezoid with rounded bottom) ────────────────── */
  // We'll use a fixed coordinate cup in a 300×240 viewBox, scaling via transform
  const scale = isLarge ? 1.22 : 1.0;
  const tx = isLarge ? -15 : 0;
  const ty = isLarge ? -20 : 0;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      padding: "0 0 4px",
    }}>
      <svg
        viewBox="0 0 300 240"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: isLarge ? 200 : 170,
          height: isLarge ? 210 : 180,
          overflow: "visible",
          transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.25))",
        }}
      >
        <defs>
          {/* Liquid fill gradient */}
          <linearGradient id="liquidGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={liquidColor.mid} />
            <stop offset="40%"  stopColor={liquidColor.base} />
            <stop offset="100%" stopColor={liquidColor.mid} />
          </linearGradient>

          {/* Cup body clip */}
          <clipPath id="cupClip">
            <path d="M 97 55 L 87 195 Q 140 210 193 195 L 183 55 Z" />
          </clipPath>

          {/* Ice shimmer */}
          <linearGradient id="iceGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
            <stop offset="60%"  stopColor="rgba(220,240,255,0.8)" />
            <stop offset="100%" stopColor="rgba(180,220,255,0.6)" />
          </linearGradient>

          {/* Foam gradient */}
          <linearGradient id="foamGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={liquidColor.foam} />
            <stop offset="100%" stopColor={liquidColor.base} stopOpacity="0.5" />
          </linearGradient>

          {/* Cup glass gradient */}
          <linearGradient id="cupBodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(255,255,255,0.55)" />
            <stop offset="25%"  stopColor="rgba(255,255,255,0.12)" />
            <stop offset="60%"  stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.45)" />
          </linearGradient>

          <style>{`
            @keyframes fillUp {
              from { transform: translateY(100%); }
              to   { transform: translateY(0%); }
            }
            @keyframes liquidWobble {
              0%,100% { d: path("M 87 102 Q 113 96 140 100 Q 167 104 193 100"); }
              50%      { d: path("M 87 102 Q 113 108 140 104 Q 167 100 193 102"); }
            }
            @keyframes bubbleFloat {
              0%   { transform: translateY(0px) scale(1); opacity: 0.6; }
              50%  { transform: translateY(-6px) scale(1.1); opacity: 0.9; }
              100% { transform: translateY(0px) scale(1); opacity: 0.6; }
            }
            @keyframes straw-sway {
              0%,100% { transform: rotate(0deg); }
              50%      { transform: rotate(1.5deg); }
            }
            .cup-fill-anim {
              animation: fillUp 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
              transform-origin: bottom;
              transform-box: fill-box;
            }
            .bubble-float-1 { animation: bubbleFloat 2.8s ease-in-out infinite; }
            .bubble-float-2 { animation: bubbleFloat 3.4s ease-in-out 0.5s infinite; }
            .bubble-float-3 { animation: bubbleFloat 2.2s ease-in-out 1.1s infinite; }
            .straw-sway     { animation: straw-sway 3s ease-in-out infinite; transform-origin: 165px 230px; }
          `}</style>
        </defs>

        {/* ── Scale group for size transition ── */}
        <g transform={`translate(${tx}, ${ty}) scale(${scale})`} style={{ transformOrigin: "150px 140px", transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)" }}>

          {/* Cup outline / glass shape */}
          <path d="M 97 55 L 87 195 Q 140 210 193 195 L 183 55 Z"
            fill="rgba(255,255,255,0.15)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
          />

          {/* ── LIQUID (clipped inside cup) ── */}
          <g clipPath="url(#cupClip)">

            {/* Liquid body fill with fill-up animation */}
            <rect
              x="85" y="100" width="110" height="115"
              fill="url(#liquidGrad)"
              className="cup-fill-anim"
            />

            {/* Liquid surface shimmer wave */}
            <ellipse cx="140" cy="100" rx="54" ry="6"
              fill={liquidColor.base}
              className="cup-fill-anim"
            />

            {/* Foam layer */}
            <ellipse cx="140" cy="97" rx="52" ry="9"
              fill="url(#foamGrad)"
              opacity="0.7"
              className="cup-fill-anim"
            />

            {/* Toppings (inside cup at bottom) */}
            <g className="cup-fill-anim">
              {renderToppings()}
            </g>

            {/* Ice chunks (above liquid surface slightly) */}
            {iceChunks.map((chunk, i) => (
              <g
                key={i}
                transform={`translate(${chunk.x}, ${chunk.y}) rotate(${chunk.rot})`}
                className="cup-fill-anim"
              >
                <rect
                  x={-chunk.size / 2} y={-chunk.size / 2}
                  width={chunk.size} height={chunk.size}
                  rx={3}
                  fill="url(#iceGrad)"
                  stroke="rgba(200,235,255,0.6)"
                  strokeWidth="1"
                  style={{ transition: "all 0.35s ease" }}
                />
                {/* Ice shine */}
                <line
                  x1={-chunk.size / 2 + 2} y1={-chunk.size / 2 + 2}
                  x2={-chunk.size / 2 + chunk.size * 0.4} y2={-chunk.size / 2 + 2}
                  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"
                />
              </g>
            ))}

            {/* Floating bubbles in liquid */}
            <circle cx="115" cy="140" r="4" fill="rgba(255,255,255,0.25)" className="bubble-float-1" />
            <circle cx="155" cy="130" r="3" fill="rgba(255,255,255,0.2)"  className="bubble-float-2" />
            <circle cx="138" cy="150" r="2.5" fill="rgba(255,255,255,0.2)" className="bubble-float-3" />

          </g>

          {/* Cup glass overlay (reflection) */}
          <path d="M 97 55 L 87 195 Q 140 210 193 195 L 183 55 Z"
            fill="url(#cupBodyGrad)"
            stroke="none"
            pointerEvents="none"
          />

          {/* Left shine streak */}
          <path d="M 103 65 L 94 170"
            stroke="rgba(255,255,255,0.5)" strokeWidth="5" strokeLinecap="round"
            fill="none"
          />
          {/* Smaller right shine */}
          <path d="M 174 65 L 182 150"
            stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round"
            fill="none"
          />

          {/* Cup rim */}
          <ellipse cx="140" cy="55" rx="43" ry="7"
            fill="rgba(255,255,255,0.6)"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="1.5"
          />

          {/* Lid */}
          <path d="M 94 55 Q 94 42 140 40 Q 186 42 186 55"
            fill="rgba(255,255,255,0.35)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="2"
          />
          <path d="M 110 48 Q 140 43 170 48"
            fill="rgba(255,255,255,0.25)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          />

          {/* Straw */}
          <g className="straw-sway">
            <rect x="160" y="-10" width="9" height="85" rx="4.5"
              fill={sectionKey === "fruit-teas" ? "#ff9f1c" : "#c77dff"}
              opacity="0.9"
            />
            {/* Straw stripe */}
            <rect x="162" y="-10" width="2.5" height="85" rx="1.25"
              fill="rgba(255,255,255,0.4)"
            />
          </g>

          {/* Cup bottom ellipse */}
          <ellipse cx="140" cy="202" rx="36" ry="6"
            fill="rgba(255,255,255,0.3)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      {/* Label */}
      <div style={{
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.45)",
        textAlign: "center",
      }}>
        {isLarge ? "Large" : "Regular"} · {iceLevel}
        {toppingDefs.length > 0 && ` · ${toppingDefs.map(t => t.label).join(", ")}`}
      </div>
    </div>
  );
}
