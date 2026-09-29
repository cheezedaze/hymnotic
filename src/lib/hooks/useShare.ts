import { useCallback } from "react";
import { useShareStore, type ShareData } from "@/lib/store/shareStore";
import { buildShareUrl, buildShareText } from "@/lib/share/data";

export function useShare() {
  const openShare = useShareStore((s) => s.openShare);

  const share = useCallback(
    (data: ShareData) => openShare(data),
    [openShare]
  );

  return { share, buildShareUrl, buildShareText };
}
