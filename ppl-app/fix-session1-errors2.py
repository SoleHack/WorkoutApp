#!/usr/bin/env python3
"""
Fix remaining 15 Session 1 errors (4 files).
Run from: ppl-app/
Usage: python3 fix-session1-errors2.py
"""

import re, os

def read(path):
    with open(path) as f: return f.read()

def write(path, content):
    with open(path, 'w') as f: f.write(content)
    print(f"  ✓ {path}")

# ─────────────────────────────────────────────────────────────
# 1. programs.tsx — remove duplicate (colors + DAY_TYPE_COLORS) block
# ─────────────────────────────────────────────────────────────
path = 'app/(tabs)/programs.tsx'
content = read(path)

# Remove any repeated pair of these two lines (with any leading whitespace)
content = re.sub(
    r'([ \t]*const \{ colors \} = useTheme\(\)\n[ \t]*const DAY_TYPE_COLORS = getDayTypeColors\(colors\)\n)'
    r'([ \t]*const \{ colors \} = useTheme\(\)\n[ \t]*const DAY_TYPE_COLORS = getDayTypeColors\(colors\)\n)+',
    r'\1',
    content
)
write(path, content)

# ─────────────────────────────────────────────────────────────
# 2. progress.tsx — inject useWindowDimensions inside the component
#    that uses SCREEN_W, and add it to the react-native import
# ─────────────────────────────────────────────────────────────
path = 'app/(tabs)/progress.tsx'
content = read(path)

# Ensure useWindowDimensions is in the react-native import
if 'useWindowDimensions' not in content:
    content = re.sub(
        r"(from 'react-native')",
        lambda m: m.group(0),  # placeholder — handled below
        content
    )
    # Add useWindowDimensions to the RN destructured import
    content = re.sub(
        r'(import \{[^}]+)(} from .react-native.)',
        lambda m: m.group(1).rstrip() + ', useWindowDimensions' + '\n' + m.group(2)
        if 'useWindowDimensions' not in m.group(1)
        else m.group(0),
        content
    )

# Find every component that references SCREEN_W and inject the const
# SCREEN_W is used at the top level of the default export ProgressScreen
# Add `const { width: SCREEN_W } = useWindowDimensions()` after `const { colors } = useTheme()`
# (only if SCREEN_W is not already declared in that scope)
if 'width: SCREEN_W' not in content:
    content = re.sub(
        r'(const \{ colors \} = useTheme\(\))',
        r'\1\n  const { width: SCREEN_W } = useWindowDimensions()',
        content,
        count=1  # only inject once — into the first (outermost) component
    )

write(path, content)

# ─────────────────────────────────────────────────────────────
# 3. session/[id].tsx — add useTheme import (check for import statement,
#    not just the word 'useTheme' which may already be in the function body)
# ─────────────────────────────────────────────────────────────
path = 'app/session/[id].tsx'
content = read(path)

has_import = bool(re.search(r"import.*useTheme.*from", content))

if not has_import:
    # Try anchors
    anchors = [
        "from '@/hooks/useSettings'",
        "from '@/lib/supabase'",
        "from 'expo-router'",
        "from 'react-native'",
        "from 'react'",
    ]
    for anchor in anchors:
        if anchor in content:
            content = content.replace(
                anchor,
                anchor + "\nimport { useTheme } from '@/lib/ThemeContext'"
            )
            break

write(path, content)

# ─────────────────────────────────────────────────────────────
# 4. OfflineBanner.tsx — component is an arrow function, add hook inside it
# ─────────────────────────────────────────────────────────────
path = 'src/components/OfflineBanner.tsx'
content = read(path)

# Ensure import exists (checking for import statement specifically)
has_import = bool(re.search(r"import.*useTheme.*from", content))
if not has_import:
    anchors = [
        "from '@/hooks/useAuth'",
        "from '@/lib/ThemeContext'",
        "from 'react-native'",
        "from 'react'",
    ]
    for anchor in anchors:
        if anchor in content:
            content = content.replace(
                anchor,
                anchor + "\nimport { useTheme } from '@/lib/ThemeContext'"
            )
            break

# Add hook to arrow function components (export function / export const = ...)
# Pattern: any exported component (function or arrow) that uses colors but lacks hook
lines = content.split('\n')
output = []
i = 0

while i < len(lines):
    line = lines[i]
    output.append(line)

    # Match arrow function components: `export function Foo(` or `export const Foo = (`
    is_arrow_component = bool(re.match(
        r'^export (?:function|const) [A-Z]\w*',
        line
    ))

    if is_arrow_component and '{' in line:
        brace_depth = line.count('{') - line.count('}')
        j = i + 1
        while j < len(lines) and brace_depth > 0:
            brace_depth += lines[j].count('{') - lines[j].count('}')
            j += 1
        body = '\n'.join(lines[i+1:j])

        if 'colors.' in body and 'useTheme()' not in body:
            indent = '  '
            if i + 1 < len(lines):
                m = re.match(r'^(\s+)', lines[i + 1])
                if m:
                    indent = m.group(1)
            output.append(f'{indent}const {{ colors }} = useTheme()')

    i += 1

content = '\n'.join(output)
write(path, content)

print("\n✅ Done. Run: npx tsc --noEmit")
