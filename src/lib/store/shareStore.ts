import { create } from "zustand";

export interface ShareData {
  type: "track" | "collection";
  id: string;
  title: string;
  artist?: string;
  artworkUrl?: string | null;
}

interface ShareState {
  isOpen: boolean;
  shareData: ShareData | null;
  openShare: (data: ShareData) => void;
  closeShare: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  isOpen: false,
  shareData: null,
  openShare: (data) => set({ isOpen: true, shareData: data }),
  closeShare: () => set({ isOpen: false, shareData: null }),
}));
