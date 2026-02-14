#!/bin/bash
# =============================================================================
# Hymnotic S3 Bucket Setup Script
# =============================================================================
# Run this once to create and configure your S3 bucket
#
# Prerequisites:
#   1. AWS CLI installed: brew install awscli
#   2. AWS configured: aws configure
#
# Usage: ./infrastructure/s3/setup-bucket.sh
# =============================================================================

set -e

BUCKET_NAME="hymnotic-media"
REGION="us-west-2"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🎵 Hymnotic S3 Setup"
echo "===================="
echo ""

# Check AWS CLI is configured
if ! aws sts get-caller-identity &>/dev/null; then
  echo "❌ AWS CLI is not configured. Run 'aws configure' first."
  echo "   You'll need your AWS Access Key ID and Secret Access Key."
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account: $ACCOUNT_ID"
echo ""

# Step 1: Create the S3 bucket
echo "📦 Step 1: Creating S3 bucket '$BUCKET_NAME' in $REGION..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "   Bucket already exists, skipping creation."
else
  aws s3api create-bucket \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
  echo "   ✅ Bucket created!"
fi
echo ""

# Step 2: Block public access (we'll use CloudFront, not direct public access)
echo "🔒 Step 2: Blocking direct public access (CloudFront will serve files)..."
aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"
echo "   ✅ Public access blocked (CloudFront-only access)"
echo ""

# Step 3: Apply CORS configuration
echo "🌐 Step 3: Applying CORS configuration..."
aws s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration file://"$SCRIPT_DIR/bucket-cors.json"
echo "   ✅ CORS configured for hymnotic.com + localhost"
echo ""

# Step 4: Enable versioning (protects against accidental deletions)
echo "🔄 Step 4: Enabling bucket versioning..."
aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled
echo "   ✅ Versioning enabled"
echo ""

# Step 5: Create folder structure
echo "📁 Step 5: Creating folder structure..."
for folder in audio/tracks audio/previews images/artwork images/artists images/misc video/tracks video/thumbnails; do
  aws s3api put-object --bucket "$BUCKET_NAME" --key "$folder/" --content-length 0 >/dev/null
  echo "   📂 $folder/"
done
echo "   ✅ Folder structure created"
echo ""

# Step 6: Set lifecycle rules for cost optimization
echo "💰 Step 6: Setting lifecycle rules..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "$BUCKET_NAME" \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "TransitionOldVersionsToIA",
        "Status": "Enabled",
        "Filter": {},
        "NoncurrentVersionTransitions": [
          {
            "NoncurrentDays": 30,
            "StorageClass": "STANDARD_IA"
          }
        ],
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 90
        }
      }
    ]
  }'
echo "   ✅ Old versions move to IA after 30 days, expire after 90 days"
echo ""

# Summary
echo "=========================================="
echo "🎉 S3 Setup Complete!"
echo "=========================================="
echo ""
echo "Bucket:     s3://$BUCKET_NAME"
echo "Region:     $REGION"
echo "Account:    $ACCOUNT_ID"
echo ""
echo "Folder structure:"
echo "  📂 audio/tracks/       - Full audio files (MP3, FLAC, AAC)"
echo "  📂 audio/previews/     - 30-second preview clips"
echo "  📂 images/artwork/     - Album/collection artwork"
echo "  📂 images/artists/     - Artist photos"
echo "  📂 images/misc/        - Other images (logos, etc.)"
echo "  📂 video/tracks/       - Music videos"
echo "  📂 video/thumbnails/   - Video thumbnail images"
echo ""
echo "Next steps:"
echo "  1. Run: ./infrastructure/s3/setup-cloudfront.sh"
echo "  2. Add your CDN URL to .env.local"
echo "  3. Upload your media files (see upload-media.sh)"
echo ""
