/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AudioMetadata } from "../types";
import { Disc, Tag, Image as ImageIcon } from "lucide-react";

interface MetadataFormProps {
  metadata: AudioMetadata;
  onChangeMetadata: (meta: AudioMetadata) => void;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({ metadata, onChangeMetadata }) => {
  const updateField = (field: keyof AudioMetadata, value: string) => {
    onChangeMetadata({
      ...metadata,
      [field]: value
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      updateField("coverArtUrl", imageUrl);
    }
  };

  return (
    <div id="metadata-form" className="bg-[#0E0E11] border border-[#2A2A2E] rounded-lg p-5 text-gray-200">
      <h3 className="font-bold flex items-center gap-2 text-sm text-cyan-400 font-mono tracking-widest uppercase mb-4 border-b border-[#2A2A2E] pb-3">
        <Tag size={18} /> CD Jewel Case & Metadata Editor
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Vinyl case visual overlay (4 columns) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#050507] border border-[#1A1A1E] rounded-lg relative group">
          <div className="w-36 h-36 rounded-md bg-[#111114] border border-[#2A2A2E] flex flex-col items-center justify-center relative overflow-hidden shadow-lg shadow-black/60">
            {metadata.coverArtUrl ? (
              <img
                src={metadata.coverArtUrl}
                alt="Uploaded Cover Art"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <Disc size={44} className="animate-spin-slow text-cyan-500/65" />
                <span className="text-[10px] font-mono mt-2 uppercase tracking-wider">No Album Art</span>
              </div>
            )}
            
            {/* Spinning vintage label simulation */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-mono bg-cyan-600 px-2 py-0.5 rounded text-white font-bold shadow-[0_0_8px_rgba(34,211,238,0.5)]">REPLACE</span>
            </div>
          </div>

          <label className="mt-4 px-3 py-1.5 bg-[#111114] border border-[#2A2A2E] text-xs font-mono font-semibold rounded cursor-pointer flex items-center gap-1.5 transition-colors text-cyan-400 hover:bg-cyan-500/10">
            <ImageIcon size={13} /> {metadata.coverArtUrl ? "Change Studio Art" : "Upload Jewel Art"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
          <span className="text-[10px] text-gray-500 font-mono mt-1 text-center font-normal">Formats: JPG, PNG, WEBP</span>
        </div>

        {/* Form fields (8 columns) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono font-bold text-gray-400 mb-1 uppercase">Track Title / Song Name</label>
            <input
              type="text"
              className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-cyan-400/50 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none transition-colors"
              placeholder="e.g. Laser Starship Orbit"
              value={metadata.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-gray-400 mb-1 uppercase">Artist Name / Studio DJ</label>
            <input
              type="text"
              className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-cyan-400/50 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none transition-colors"
              placeholder="e.g. Vector Hacker Band"
              value={metadata.artist}
              onChange={(e) => updateField("artist", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-gray-400 mb-1 uppercase">Album / Production</label>
            <input
              type="text"
              className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-cyan-400/50 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none transition-colors"
              placeholder="e.g. Geocities Soundstage v1"
              value={metadata.album}
              onChange={(e) => updateField("album", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-gray-400 mb-1 uppercase">Genre Type</label>
            <input
              type="text"
              className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-cyan-400/50 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none transition-colors"
              placeholder="e.g. Synthwave / Cyberpunk"
              value={metadata.genre}
              onChange={(e) => updateField("genre", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-gray-400 mb-1 uppercase">Release Year</label>
            <input
              type="text"
              className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-cyan-400/50 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none transition-colors"
              placeholder="e.g. 2026"
              value={metadata.year}
              onChange={(e) => updateField("year", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-bold text-gray-400 mb-1 uppercase">Studio Comments / Track Memo</label>
            <input
              type="text"
              className="w-full bg-[#111114] border border-[#2A2A2E] focus:border-cyan-400/50 rounded px-3 py-2 text-xs text-cyan-400 focus:outline-none transition-colors"
              placeholder="e.g. Mastered render with delay effects applied"
              value={metadata.comment}
              onChange={(e) => updateField("comment", e.target.value)}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
