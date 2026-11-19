/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LayoutSkin, VisualParams } from "../types";
import { Sparkles, Heart, HelpCircle, Edit3 } from "lucide-react";

interface MySpaceProfileProps {
  skin: LayoutSkin;
  visualParams: VisualParams;
  setVisualParams: (p: VisualParams) => void;
  onUpdateSkinCss: (css: string) => void;
}

export const PRESET_SKINS: LayoutSkin[] = [
  {
    id: "studio-charcoal",
    name: "Artistic Flair Neon v3",
    primaryBg: "bg-[#0A0A0B]",
    panelBg: "bg-[#0E0E11]",
    textColor: "text-[#E0E0E0]",
    accentColor: "border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-[#111114]",
    borderColor: "border-[#2A2A2E]",
    customCss: `/* Artistic Flair Theme overrides */
input[type="range"] {
  accent-color: #22d3ee !important;
}
.header-banner {
  background: #111114 !important;
  border-bottom: 2px solid #2a2a2e !important;
}
.myspace-contact-badge {
  background: #0891b2 !important;
  color: #ffffff !important;
}`
  },
  {
    id: "myspace-classic",
    name: "Classic MySpace '05",
    primaryBg: "bg-[#d5e4f2]",
    panelBg: "bg-[#ffffff]",
    textColor: "text-[#003399]",
    accentColor: "border-[#003399] text-[#003399] hover:bg-[#003399]/10 bg-[#f0f0f5]",
    borderColor: "border-[#6699cc]",
    customCss: `.header-banner { background: #6699cc !important; border-bottom: 3px solid #003399 !important; }
.myspace-badge { background: #ff6600 !important; color: white !important; }`
  },
  {
    id: "goth-cyber",
    name: "Vampire Cyberpunk Goth",
    primaryBg: "bg-[#050005]",
    panelBg: "bg-[#110111]",
    textColor: "text-[#39ff14]",
    accentColor: "border-[#ff0055] text-[#ff0055] hover:bg-[#ff0055]/10 bg-black",
    borderColor: "border-[#550055]",
    customCss: `* { text-shadow: 0 0 5px #ff0055; font-family: 'JetBrains Mono', monospace !important; }
.header-banner { border-bottom: 2px dashed #ff0055 !important; }`
  },
  {
    id: "synthwave",
    name: "Neon Arcade 1984",
    primaryBg: "bg-[#050110]",
    panelBg: "bg-[#11052C]",
    textColor: "text-[#00ffff]",
    accentColor: "border-[#ff007f] text-[#ff007f] hover:bg-[#ff007f]/10 bg-[#080120]",
    borderColor: "border-[#ff007f]",
    customCss: `.header-banner { background: linear-gradient(90deg, #ff007f, #7f00ff) !important; color: #ffffff !important; }`
  },
  {
    id: "vintage95",
    name: "Win95 GeoCities Grid",
    primaryBg: "bg-[#008080]",
    panelBg: "bg-[#c0c0c0]",
    textColor: "text-black",
    accentColor: "border-black text-black hover:bg-white/20 bg-[#c0c0c0]",
    borderColor: "border-white",
    customCss: `* { font-family: 'MS Sans Serif', 'Arial', sans-serif; }
.myspace-contact-badge { background: #000080 !important; color: white !important; }`
  }
];

export const MySpaceProfile: React.FC<MySpaceProfileProps> = ({
  skin,
  visualParams,
  setVisualParams,
  onUpdateSkinCss
}) => {
  const [htmlInput, setHtmlInput] = useState(visualParams.retroHtmlSkin);
  const [cssInput, setCssInput] = useState(skin.customCss);
  const [showEdit, setShowEdit] = useState(false);

  const handleSaveLayout = () => {
    setVisualParams({
      ...visualParams,
      retroHtmlSkin: htmlInput
    });
    onUpdateSkinCss(cssInput);
    setShowEdit(false);
  };

  return (
    <div id="myspace-profile" className={`p-4 rounded-lg border-2 ${skin.borderColor} ${skin.panelBg} relative overflow-hidden transition-all duration-300`}>
      {/* Dynamic Inject Style Tag to actually execute user's MySpace styling configs! */}
      <style>{skin.customCss}</style>

      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-sm font-semibold tracking-wider flex items-center gap-2 ${skin.textColor}`}>
          <Sparkles size={16} /> Retro MySpace Profile Sandbox Widget
        </h3>
        <button
          onClick={() => setShowEdit(!showEdit)}
          className={`px-2 py-1 text-xs border rounded flex items-center gap-1 font-mono transition-colors cursor-pointer ${skin.accentColor}`}
        >
          <Edit3 size={12} /> {showEdit ? "Hide HTML Code Editor" : "Inspect Profile Layout Code"}
        </button>
      </div>

      {showEdit ? (
        <div className="bg-[#050508] p-3 rounded border border-gray-800 text-xs space-y-3 mb-4">
          <div>
            <label className="text-gray-400 block mb-1 font-semibold font-mono">Custom HTML Markup (widgets, bio columns, banners):</label>
            <textarea
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-2 text-green-400 font-mono text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
            />
          </div>

          <div>
            <label className="text-gray-400 block mb-1 font-semibold font-mono">Custom CSS Skin Injector (override variables, borders):</label>
            <textarea
              className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-amber-400 font-mono text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none"
              value={cssInput}
              onChange={(e) => setCssInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setHtmlInput(visualParams.retroHtmlSkin);
                setCssInput(skin.customCss);
                setShowEdit(false);
              }}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded font-semibold hover:bg-gray-700"
            >
              Reset to Preset
            </button>
            <button
              onClick={handleSaveLayout}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold"
            >
              Apply Code Customization
            </button>
          </div>
        </div>
      ) : null}

      {/* Actual Render Output Box */}
      <div className="myspace-workspace-renderer border p-4 bg-black/45 rounded relative overflow-y-auto max-h-[380px] border-dashed border-gray-700/80">
        <div dangerouslySetInnerHTML={{ __html: visualParams.retroHtmlSkin }} />

        {/* Top Friends Layout Element (Iconic Retro Feature) */}
        <div className="mt-6 border-t border-gray-800/80 pt-4">
          <h4 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1 mb-3">
            <Heart size={12} className="fill-orange-400" /> Tom's Studio Top Friends Queue
          </h4>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {[
              { name: "Tom", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60" },
              { name: "MySpace Developer", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=60" },
              { name: "Web Shaders", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop&q=60" },
              { name: "Notch Filter", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&fit=crop&q=60" },
              { name: "Analog Delay", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&fit=crop&q=60" },
              { name: "VST Convolve", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&fit=crop&q=60" },
              { name: "MP4 Render", img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&fit=crop&q=60" },
              { name: "Batch Audio", img: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&fit=crop&q=60" }
            ].map((friend, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <img
                  src={friend.img}
                  alt={friend.name}
                  className="w-10 h-10 rounded-md border border-amber-600 object-cover cursor-pointer hover:scale-105 transition-transform"
                />
                <span className="text-[10px] text-gray-400 mt-1 truncate max-w-full font-mono">{friend.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
