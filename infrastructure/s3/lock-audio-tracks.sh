#!/usr/bin/env bash
# Flip the lock: add a CloudFront cache behavior for `audio/tracks/*` restricted
# to the trusted key group, so track MP3s require signed URLs. Run ONCE at cutover,
# AFTER the signing code + CLOUDFRONT_* env vars are live in production.
#
# Idempotent: refuses to apply if the audio/tracks/* behavior already exists.
# See infrastructure/s3/SIGNED-URLS-RUNBOOK.md.
set -euo pipefail

DIST_ID="E68JXX74O21KI"
KEY_GROUP_ID="de92c9b3-ff0b-430b-90ea-aaf259733e37"
PATH_PATTERN="audio/tracks/*"
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

echo "Fetching live distribution config for $DIST_ID ..."
aws cloudfront get-distribution-config --id "$DIST_ID" > "$SCRATCH/full.json"
ETAG=$(python3 -c "import json;print(json.load(open('$SCRATCH/full.json'))['ETag'])")

# Build the modified config. Prints STATUS=OK / STATUS=ALREADY_LOCKED / STATUS=NO_TEMPLATE.
STATUS=$(python3 - "$SCRATCH/full.json" "$SCRATCH/config.json" "$PATH_PATTERN" "$KEY_GROUP_ID" <<'PY'
import json, sys, copy
full_path, out_path, pattern, key_group = sys.argv[1:5]
cfg = json.load(open(full_path))["DistributionConfig"]
behaviors = cfg.setdefault("CacheBehaviors", {"Quantity": 0, "Items": []})
items = behaviors.setdefault("Items", [])

if any(b.get("PathPattern") == pattern for b in items):
    print("STATUS=ALREADY_LOCKED"); sys.exit(0)

template = next((b for b in items if b.get("PathPattern") == "audio/*"), None)
if template is None:
    print("STATUS=NO_TEMPLATE"); sys.exit(0)

new = copy.deepcopy(template)
new["PathPattern"] = pattern
new["TrustedKeyGroups"] = {"Enabled": True, "Quantity": 1, "Items": [key_group]}
new["ViewerProtocolPolicy"] = "redirect-to-https"

# Most-specific-first: CloudFront uses the first matching behavior, so audio/tracks/*
# must precede audio/*. Insert at the front.
items.insert(0, new)
behaviors["Quantity"] = len(items)

json.dump(cfg, open(out_path, "w"))
print("STATUS=OK")
PY
)

case "$STATUS" in
  *ALREADY_LOCKED*) echo "audio/tracks/* behavior already exists — nothing to do."; exit 0 ;;
  *NO_TEMPLATE*)    echo "ERROR: no audio/* behavior to clone from. Aborting."; exit 2 ;;
  *OK*)             ;;
  *)                echo "ERROR: unexpected status '$STATUS'. Aborting."; exit 3 ;;
esac

echo "Applying update-distribution (ETag $ETAG) ..."
aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --if-match "$ETAG" \
  --distribution-config "file://$SCRATCH/config.json" \
  --query 'Distribution.Status' --output text

echo "Done. Distribution is deploying (~5-10 min). Verify with the runbook's curl checks."
