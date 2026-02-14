#!/bin/bash
# =============================================================================
# Hymnotic Media Upload Script
# =============================================================================
# Upload your media files to S3 with proper content types
#
# Usage:
#   Upload a single audio file:
#     ./infrastructure/s3/upload-media.sh audio path/to/song.mp3 sands-01
#
#   Upload a single image:
#     ./infrastructure/s3/upload-media.sh image path/to/artwork.png album-sands
#
#   Upload a video:
#     ./infrastructure/s3/upload-media.sh video path/to/video.mp4 peace-01
#
#   Upload all from a directory:
#     ./infrastructure/s3/upload-media.sh bulk-audio path/to/audio/dir/
#     ./infrastructure/s3/upload-media.sh bulk-images path/to/images/dir/
# =============================================================================

set -e

BUCKET_NAME="hymnotic-media"
TYPE="$1"
SOURCE="$2"
NAME="$3"

usage() {
  echo "Usage:"
  echo "  $0 audio   <file>  <track-id>    Upload an audio file"
  echo "  $0 image   <file>  <name>        Upload an image"
  echo "  $0 video   <file>  <track-id>    Upload a video"
  echo "  $0 bulk-audio  <directory>        Upload all audio from directory"
  echo "  $0 bulk-images <directory>        Upload all images from directory"
  echo ""
  echo "Examples:"
  echo "  $0 audio ~/Music/brightly-beams.mp3 sands-01"
  echo "  $0 image ~/Art/album-sands.png album-sands"
  echo "  $0 video ~/Videos/be-still.mp4 peace-01"
  echo "  $0 bulk-audio ~/Music/hymnotic/"
  exit 1
}

get_content_type() {
  local file="$1"
  local ext="${file##*.}"
  case "$ext" in
    mp3)  echo "audio/mpeg" ;;
    flac) echo "audio/flac" ;;
    aac)  echo "audio/aac" ;;
    m4a)  echo "audio/mp4" ;;
    wav)  echo "audio/wav" ;;
    ogg)  echo "audio/ogg" ;;
    png)  echo "image/png" ;;
    jpg|jpeg) echo "image/jpeg" ;;
    webp) echo "image/webp" ;;
    svg)  echo "image/svg+xml" ;;
    mp4)  echo "video/mp4" ;;
    webm) echo "video/webm" ;;
    mov)  echo "video/quicktime" ;;
    *)    echo "application/octet-stream" ;;
  esac
}

upload_file() {
  local file="$1"
  local s3_key="$2"
  local content_type=$(get_content_type "$file")

  echo "  📤 Uploading: $(basename "$file")"
  echo "     → s3://$BUCKET_NAME/$s3_key"
  echo "     Content-Type: $content_type"

  aws s3 cp "$file" "s3://$BUCKET_NAME/$s3_key" \
    --content-type "$content_type" \
    --cache-control "public, max-age=31536000, immutable"

  echo "     ✅ Done"
  echo ""
}

case "$TYPE" in
  audio)
    [ -z "$SOURCE" ] || [ -z "$NAME" ] && usage
    EXT="${SOURCE##*.}"
    upload_file "$SOURCE" "audio/tracks/$NAME.$EXT"
    ;;

  image)
    [ -z "$SOURCE" ] || [ -z "$NAME" ] && usage
    EXT="${SOURCE##*.}"
    upload_file "$SOURCE" "images/artwork/$NAME.$EXT"
    ;;

  video)
    [ -z "$SOURCE" ] || [ -z "$NAME" ] && usage
    EXT="${SOURCE##*.}"
    upload_file "$SOURCE" "video/tracks/$NAME.$EXT"
    ;;

  bulk-audio)
    [ -z "$SOURCE" ] && usage
    echo "🎵 Bulk uploading audio from: $SOURCE"
    echo ""
    for file in "$SOURCE"/*.{mp3,flac,aac,m4a,wav,ogg}; do
      [ -f "$file" ] || continue
      filename=$(basename "$file")
      name="${filename%.*}"
      ext="${filename##*.}"
      upload_file "$file" "audio/tracks/$name.$ext"
    done
    echo "✅ Bulk audio upload complete!"
    ;;

  bulk-images)
    [ -z "$SOURCE" ] && usage
    echo "🖼️  Bulk uploading images from: $SOURCE"
    echo ""
    for file in "$SOURCE"/*.{png,jpg,jpeg,webp,svg}; do
      [ -f "$file" ] || continue
      filename=$(basename "$file")
      name="${filename%.*}"
      ext="${filename##*.}"
      upload_file "$file" "images/artwork/$name.$ext"
    done
    echo "✅ Bulk image upload complete!"
    ;;

  *)
    usage
    ;;
esac
