#!/usr/bin/env python3
"""
Session 3 — clean up package.json:
  - Remove @supabase/auth-helpers-react (deprecated, unused)
  - Remove expo-camera (unused)
  - Fix @types/react-native to match RN 0.83

Run from: ppl-app/
Usage: python3 fix-session3-deps.py
"""

import json

path = 'package.json'
with open(path) as f:
    pkg = json.load(f)

deps = pkg.get('dependencies', {})
dev_deps = pkg.get('devDependencies', {})

# Remove deprecated / unused packages
for pkg_name in ['@supabase/auth-helpers-react', 'expo-camera']:
    if pkg_name in deps:
        del deps[pkg_name]
        print(f"  ✓ removed {pkg_name}")

# Fix @types/react-native to match react-native 0.83
if '@types/react-native' in dev_deps:
    dev_deps['@types/react-native'] = '^0.83.0'
    print("  ✓ @types/react-native → ^0.83.0")

pkg['dependencies'] = deps
pkg['devDependencies'] = dev_deps

with open(path, 'w') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')

print("\nNow run: npm install")
print("Then:    npx tsc --noEmit")
