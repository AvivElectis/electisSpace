#!/bin/bash
# Remove console.log statements from source files

echo "Removing console.log statements..."

# Find all TS/TSX files (excluding tests and node_modules)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -name "*.test.*" ! -name "*.spec.*" | while read file; do
    # Remove single-line console.log statements
    sed -i 's/^\s*console\.log(.*);*\s*$//' "$file"
    sed -i '/^\s*console\.log(/d' "$file"
done

echo "✅ Console.log statements removed!"
echo "Note: Multi-line console.log statements may need manual review"
