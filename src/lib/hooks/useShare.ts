import { useCallback } from "react";
import {
  buildSharePayload,
  buildShareText,
  buildShareUrl,
  buildTrackShareImageUrl,
  type ShareData,
} from "@/lib/share/shareData";
import { useShareStore } from "@/lib/store/shareStore";

export function useShare() {
  const openShare = useShareStore((s) => s.openShare);

  const share = useCallback(
    (data: ShareData) => {
      openShare(data);
    },
    [openShare]
  );

  return {
    share,
    buildShareUrl,
    buildShareText,
    buildSharePayload,
    buildTrackShareImageUrl,
  };
}
