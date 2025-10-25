#!/bin/bash

echo "🔍 Verifying Spotify Visualizer Fixes..."
echo ""

# Check current branch
BRANCH=$(git branch --show-current)
echo "📌 Current Branch: $BRANCH"

if [[ "$BRANCH" != "claude/youtube-music-scraper-011CUT5iTBzyxMN6oXk6q4hw" ]]; then
    echo "⚠️  WARNING: You're not on the correct branch!"
    echo "   Expected: claude/youtube-music-scraper-011CUT5iTBzyxMN6oXk6q4hw"
    echo "   Run: git checkout claude/youtube-music-scraper-011CUT5iTBzyxMN6oXk6q4hw"
    echo ""
fi

# Check latest commit
LATEST_COMMIT=$(git log -1 --oneline)
echo "📝 Latest Commit: $LATEST_COMMIT"
echo ""

# Check if maxPopularity is 100
echo "🔧 Checking Code Changes:"
echo ""

echo "1. Max Popularity in DiscoveryFilters.vue:"
if grep -q "maxPopularity: 100" src/components/Discovery/DiscoveryFilters.vue; then
    echo "   ✅ PASS - maxPopularity is 100"
else
    echo "   ❌ FAIL - maxPopularity is NOT 100"
    grep "maxPopularity:" src/components/Discovery/DiscoveryFilters.vue | head -1
fi

echo ""
echo "2. Max Popularity in Discover.vue:"
if grep -q "maxPopularity: 100" src/views/Discover.vue; then
    echo "   ✅ PASS - maxPopularity is 100"
else
    echo "   ❌ FAIL - maxPopularity is NOT 100"
    grep "maxPopularity:" src/views/Discover.vue | head -1
fi

echo ""
echo "3. Shuffle Code:"
if grep -q "Shuffle to add variety" src/views/Discover.vue; then
    SHUFFLE_COUNT=$(grep -c "Shuffle to add variety" src/views/Discover.vue)
    echo "   ✅ PASS - Shuffle code found ($SHUFFLE_COUNT instances)"
else
    echo "   ❌ FAIL - Shuffle code NOT found"
fi

echo ""
echo "4. Increased Limit to 100:"
if grep -q "limit: 100" src/views/Discover.vue; then
    echo "   ✅ PASS - Limit increased to 100"
else
    echo "   ❌ FAIL - Limit NOT increased"
fi

echo ""
echo "📦 Checking Build Status:"
if [ -d "dist" ]; then
    echo "   ✅ dist folder exists"
    DIST_DATE=$(date -r dist +"%Y-%m-%d %H:%M:%S" 2>/dev/null || stat -f "%Sm" dist 2>/dev/null || echo "unknown")
    echo "   Last built: $DIST_DATE"
else
    echo "   ⚠️  dist folder doesn't exist - run 'npm run build'"
fi

echo ""
echo "🧹 Cache Check:"
if [ -d "node_modules/.vite" ]; then
    echo "   ⚠️  Vite cache exists - consider clearing it"
    echo "   Run: rm -rf node_modules/.vite"
else
    echo "   ✅ Vite cache is clean"
fi

echo ""
echo "📋 Summary:"
echo ""

# Count passed checks
CHECKS_PASSED=0
[ -n "$(grep 'maxPopularity: 100' src/components/Discovery/DiscoveryFilters.vue)" ] && ((CHECKS_PASSED++))
[ -n "$(grep 'maxPopularity: 100' src/views/Discover.vue)" ] && ((CHECKS_PASSED++))
[ -n "$(grep 'Shuffle to add variety' src/views/Discover.vue)" ] && ((CHECKS_PASSED++))
[ -n "$(grep 'limit: 100' src/views/Discover.vue)" ] && ((CHECKS_PASSED++))

if [ $CHECKS_PASSED -eq 4 ]; then
    echo "✅ All 4 code checks PASSED!"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Clear caches: rm -rf dist node_modules/.vite"
    echo "   2. Rebuild: npm run build"
    echo "   3. Start server: npm run dev"
    echo "   4. Hard refresh browser: Ctrl+Shift+R"
    echo "   5. Clear browser storage (F12 → Application → Clear site data)"
else
    echo "⚠️  Only $CHECKS_PASSED out of 4 checks passed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Make sure you're on the right branch"
    echo "   2. Pull latest changes: git pull origin $BRANCH"
    echo "   3. Check for uncommitted changes: git status"
fi

echo ""
echo "📖 For detailed instructions, see: VERIFY_FIXES.md"
