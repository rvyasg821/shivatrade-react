#!/bin/bash

# Script to remove all tenant checks from roles store
# This fixes the issue where company admins can't see roles

ROLES_STORE="/home/strivedge-asus-2/Documents/Rahul/adorn/apgem/react/src/views/roles/store/index.js"

echo "Fixing roles store - removing tenant checks..."

# Backup original file
cp "$ROLES_STORE" "$ROLES_STORE.backup"

# Create temporary file with fixes
cat > /tmp/roles-store-temp.txt << 'EOF'
# Fix createRole function
# Find the pattern and replace with simplified version
# This will be done manually after review
EOF

echo "✅ Backup created at: $ROLES_STORE.backup"
echo ""
echo "📝 Manual fixes needed in: $ROLES_STORE"
echo ""
echo "Find these patterns and replace:"
echo ""
echo "1. In createRole (around line 150-180):"
echo "   REMOVE:"
echo "     const tenantId = getTenantId()"
echo "     if (!tenantId) { ... }"
echo "     response = await createTenantRoleRequest(tenantId, finalPayload)"
echo ""
echo "   REPLACE WITH:"
echo "     response = await createRoleRequest(finalPayload)"
echo ""
echo "2. In updateRole (around line 219-247):"
echo "   REMOVE tenant checks, use updateRoleRequest for all"
echo ""
echo "3. In deleteRole (around line 280-308):"
echo "   REMOVE tenant checks, use deleteRoleRequest for all"
echo ""
echo "4. In toggleRoleStatus (around line 341-369):"
echo "   REMOVE tenant checks, use toggleRoleStatusRequest for all"

