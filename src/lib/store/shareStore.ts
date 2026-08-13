import { create } from "zustand";
import type { ShareData } from "@/lib/share/shareData";

export type { ShareData } from "@/lib/share/shareData";

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
