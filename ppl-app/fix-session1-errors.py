#!/usr/bin/env python3
"""
Fix Session 1 theme errors.
Run from: ppl-app/
Usage: python3 fix-session1-errors.py
"""

import re, os, sys

# ── Helpers ───────────────────────────────────────────────────

def read(path):
    with open(path, 'r') as f:
        return f.read()

def write(path, content):
    with open(path, 'w') as f:
        f.write(content)
    print(f"  ✓ {path}")

def ensure_theme_import(content):
    """
    Remove static `import { colors } from '@/lib/theme'` and
    add `import { useTheme } from '@/lib/ThemeContext'` if missing.
    """
    # Remove static colors import
    content = re.sub(r"import \{ colors \} from '@/lib/theme'\n", '', content)

    if 'useTheme' in content:
        return content  # already imported

    # Try anchors in priority order
    anchors = [
        "from '@/hooks/useAuth'",
        "from '@/hooks/useSettings'",
        "from '@/lib/supabase'",
        "from '@/lib/ThemeContext'",   # already there edge case
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

    return content

def remove_duplicate_hooks(content):
    """Remove consecutive duplicate `const { colors } = useTheme()` lines."""
    # Match two or more identical hook lines back to back (any indentation)
    content = re.sub(
        r'([ \t]*const \{ colors \} = useTheme\(\)\n)(\1)+',
        r'\1',
        content
    )
    return content

def add_hooks_to_components(content):
    """
    For every PascalCase function component that:
      - uses `colors.` somewhere in its body
      - does NOT already have `const { colors } = useTheme()`
    insert the hook as the first statement.
    """
    lines = content.split('\n')
    output = []
    i = 0

    while i < len(lines):
        line = lines[i]
        output.append(line)

        # Match PascalCase function definitions (React components)
        # Handles: function Foo(, export default function Foo(, (indented) function Foo(
        is_component = bool(re.match(
            r'^(?:\s*)(?:export\s+default\s+)?function\s+[A-Z]\w*\s*[\(<]',
            line
        ))

        if is_component and '{' in line:
            # Scan ahead: find the opening brace and extract the body
            brace_depth = line.count('{') - line.count('}')
            j = i + 1
            while j < len(lines) and brace_depth > 0:
                brace_depth += lines[j].count('{') - lines[j].count('}')
                j += 1
            body = '\n'.join(lines[i+1:j])

            # Only inject if body uses colors AND hook not already there
            if 'colors.' in body and 'useTheme()' not in body:
                # Detect the indentation of the line after the opening brace
                indent = '  '
                if i + 1 < len(lines):
                    m = re.match(r'^(\s+)', lines[i + 1])
                    if m:
                        indent = m.group(1)

                output.append(f'{indent}const {{ colors }} = useTheme()')

        i += 1

    return '\n'.join(output)

# ── Files to fix ──────────────────────────────────────────────

FILES = [
    'app/(auth)/login.tsx',
    'src/components/OfflineBanner.tsx',
    'app/(tabs)/index.tsx',
    'app/(tabs)/progress.tsx',
    'app/(tabs)/programs.tsx',
    'app/(tabs)/partner.tsx',
    'app/workout/[dayKey].tsx',
    'app/session/[id].tsx',
]

print("🔧 Fixing Session 1 theme errors...\n")

for path in FILES:
    if not os.path.exists(path):
        print(f"  ⚠️  Skipped (not found): {path}")
        continue

    content = read(path)

    # Step 1: fix imports
    content = ensure_theme_import(content)

    # Step 2: remove any double-injected hooks from the first script run
    content = remove_duplicate_hooks(content)

    # Step 3: add hook to any component that still needs it
    content = add_hooks_to_components(content)

    write(path, content)

print("\n✅ Done. Run: npx tsc --noEmit")
