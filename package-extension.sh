#!/bin/bash

# CSS Inspector Pro - Extension Packaging Script
# This script creates a clean ZIP file ready for Chrome Web Store submission

echo "📦 CSS Inspector Pro - Packaging Script"
echo "========================================"
echo ""

# Set variables
EXTENSION_NAME="css-inspector-pro"
VERSION="v1.0.0"
OUTPUT_FILE="${EXTENSION_NAME}-${VERSION}.zip"

# Check if zip command exists
if ! command -v zip &> /dev/null; then
    echo "❌ Error: 'zip' command not found. Please install zip utility."
    exit 1
fi

# Remove old package if exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "🗑️  Removing old package: $OUTPUT_FILE"
    rm "$OUTPUT_FILE"
fi

echo "📁 Creating package with required files..."
echo ""

# Create the ZIP file with only necessary files
zip -r "$OUTPUT_FILE" \
    manifest.json \
    background.js \
    content.js \
    styles.css \
    icons/ \
    README.md \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "*/.claude/*" \
    -x "*.sh" \
    -x "*STORE_*" \
    -x "*PRIVACY_*" \
    -x "*PUBLISHING_*" \
    -x "*PROMOTIONAL_*" \
    -x "privacy-policy.html"

# Check if ZIP was created successfully
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo ""
    echo "✅ Package created successfully!"
    echo "📦 File: $OUTPUT_FILE"
    echo "📏 Size: $FILE_SIZE"
    echo ""
    echo "📋 Contents:"
    unzip -l "$OUTPUT_FILE"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Go to https://chrome.google.com/webstore/devconsole"
    echo "   2. Click 'New Item'"
    echo "   3. Upload: $OUTPUT_FILE"
    echo "   4. Fill in store listing details"
    echo "   5. Submit for review"
    echo ""
    echo "📄 Documentation files (not included in package):"
    echo "   - STORE_DESCRIPTION.md (for store listing)"
    echo "   - PRIVACY_POLICY.md (for reference)"
    echo "   - privacy-policy.html (host this online)"
    echo "   - PROMOTIONAL_ASSETS.md (design guidelines)"
    echo "   - PUBLISHING_CHECKLIST.md (submission guide)"
    echo ""
else
    echo "❌ Error: Failed to create package"
    exit 1
fi
