#!/bin/bash
# =============================================================================
# Hymnotic CloudFront Distribution Setup
# =============================================================================
# Run this AFTER setup-bucket.sh to create a CloudFront CDN
#
# Usage: ./infrastructure/s3/setup-cloudfront.sh
# =============================================================================

set -e

BUCKET_NAME="hymnotic-media"
REGION="us-west-2"

echo "🌍 Hymnotic CloudFront Setup"
echo "============================="
echo ""

# Check AWS CLI
if ! aws sts get-caller-identity &>/dev/null; then
  echo "❌ AWS CLI is not configured. Run 'aws configure' first."
  exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Step 1: Get or create Origin Access Control (OAC)
echo "🔐 Step 1: Creating Origin Access Control..."
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='hymnotic-media-oac'].Id | [0]" \
  --output text 2>/dev/null)

if [ "$OAC_ID" = "None" ] || [ -z "$OAC_ID" ]; then
  OAC_ID=$(aws cloudfront create-origin-access-control \
    --origin-access-control-config '{
      "Name": "hymnotic-media-oac",
      "Description": "OAC for Hymnotic S3 media bucket",
      "SigningProtocol": "sigv4",
      "SigningBehavior": "always",
      "OriginAccessControlOriginType": "s3"
    }' \
    --query 'OriginAccessControl.Id' \
    --output text)
  echo "   ✅ Created OAC: $OAC_ID"
else
  echo "   ✅ Using existing OAC: $OAC_ID"
fi
echo ""

# Step 2: Create a custom cache policy for media streaming (supports Range header)
echo "📋 Step 2: Creating media cache policy..."
MEDIA_POLICY_ID=$(aws cloudfront list-cache-policies \
  --type custom \
  --query "CachePolicyList.Items[?CachePolicy.CachePolicyConfig.Name=='HymnoticMediaStreaming'].CachePolicy.Id | [0]" \
  --output text 2>/dev/null)

if [ "$MEDIA_POLICY_ID" = "None" ] || [ -z "$MEDIA_POLICY_ID" ]; then
  MEDIA_POLICY_ID=$(aws cloudfront create-cache-policy \
    --cache-policy-config '{
      "Name": "HymnoticMediaStreaming",
      "Comment": "Cache policy for audio/video streaming with Range header support",
      "DefaultTTL": 604800,
      "MaxTTL": 31536000,
      "MinTTL": 0,
      "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": false,
        "EnableAcceptEncodingBrotli": false,
        "HeadersConfig": {
          "HeaderBehavior": "whitelist",
          "Headers": {
            "Quantity": 1,
            "Items": ["Range"]
          }
        },
        "CookiesConfig": {
          "CookieBehavior": "none"
        },
        "QueryStringsConfig": {
          "QueryStringBehavior": "none"
        }
      }
    }' \
    --query 'CachePolicy.Id' \
    --output text)
  echo "   ✅ Created media cache policy: $MEDIA_POLICY_ID"
else
  echo "   ✅ Using existing media cache policy: $MEDIA_POLICY_ID"
fi
echo ""

# Step 3: Create CloudFront Distribution
# Using managed policies:
#   CachingOptimized: 658327ea-f89d-4fab-a63d-7e88639e58f6
#   CORS-S3Origin:    88a5eaf4-2fd4-4709-b370-b4c650ea3fcf
#   SimpleCORS:       60669652-455b-4ae9-85a4-c4c02393f86c
echo "📡 Step 3: Creating CloudFront distribution..."

CALLER_REF="hymnotic-media-$(date +%s)"

DIST_CONFIG=$(cat <<ENDJSON
{
  "CallerReference": "$CALLER_REF",
  "Comment": "Hymnotic media CDN",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "hymnotic-s3",
        "DomainName": "$BUCKET_NAME.s3.$REGION.amazonaws.com",
        "OriginAccessControlId": "$OAC_ID",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "hymnotic-s3",
    "ViewerProtocolPolicy": "redirect-to-https",
    "AllowedMethods": {
      "Quantity": 2,
      "Items": ["GET", "HEAD"],
      "CachedMethods": {
        "Quantity": 2,
        "Items": ["GET", "HEAD"]
      }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
    "ResponseHeadersPolicyId": "60669652-455b-4ae9-85a4-c4c02393f86c",
    "Compress": true
  },
  "CacheBehaviors": {
    "Quantity": 2,
    "Items": [
      {
        "PathPattern": "audio/*",
        "TargetOriginId": "hymnotic-s3",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "CachePolicyId": "$MEDIA_POLICY_ID",
        "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
        "ResponseHeadersPolicyId": "60669652-455b-4ae9-85a4-c4c02393f86c",
        "Compress": false
      },
      {
        "PathPattern": "video/*",
        "TargetOriginId": "hymnotic-s3",
        "ViewerProtocolPolicy": "redirect-to-https",
        "AllowedMethods": {
          "Quantity": 2,
          "Items": ["GET", "HEAD"],
          "CachedMethods": {
            "Quantity": 2,
            "Items": ["GET", "HEAD"]
          }
        },
        "CachePolicyId": "$MEDIA_POLICY_ID",
        "OriginRequestPolicyId": "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
        "ResponseHeadersPolicyId": "60669652-455b-4ae9-85a4-c4c02393f86c",
        "Compress": false
      }
    ]
  },
  "PriceClass": "PriceClass_100",
  "HttpVersion": "http2and3"
}
ENDJSON
)

DISTRIBUTION_ID=$(aws cloudfront create-distribution \
  --distribution-config "$DIST_CONFIG" \
  --query 'Distribution.Id' \
  --output text)

CDN_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text)

echo "   ✅ Distribution ID: $DISTRIBUTION_ID"
echo "   ✅ CDN Domain: https://$CDN_DOMAIN"
echo ""

# Step 4: Update S3 bucket policy with CloudFront access
echo "🔗 Step 4: Updating S3 bucket policy for CloudFront access..."
BUCKET_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontRead",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT_ID:distribution/$DISTRIBUTION_ID"
        }
      }
    }
  ]
}
EOF
)

aws s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "$BUCKET_POLICY"
echo "   ✅ Bucket policy updated"
echo ""

# Summary
echo "=========================================="
echo "🎉 CloudFront Setup Complete!"
echo "=========================================="
echo ""
echo "Distribution ID:  $DISTRIBUTION_ID"
echo "CDN URL:          https://$CDN_DOMAIN"
echo ""
echo "⚠️  It takes 5-15 minutes for the distribution to deploy."
echo ""
echo "Add this to your .env.local:"
echo "  NEXT_PUBLIC_CDN_URL=https://$CDN_DOMAIN"
echo ""
echo "Media URLs will be:"
echo "  Audio:  https://$CDN_DOMAIN/audio/tracks/sands-01.mp3"
echo "  Art:    https://$CDN_DOMAIN/images/artwork/album-sands.png"
echo "  Video:  https://$CDN_DOMAIN/video/tracks/peace-01.mp4"
echo ""
