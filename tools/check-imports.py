#!/usr/bin/env python3
"""Check that every import in the project resolves to a real export.

Modules like main.js and the ui/ files touch `document`, so they cannot simply
be imported under Node to be validated. That leaves a blind spot exactly where
it hurts: deleting an export elsewhere breaks them only once a browser loads
the page. This resolves every import statically instead.
"""
import re, os, glob, sys

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/..'
os.chdir(ROOT)

files = sorted(glob.glob('src/**/*.js', recursive=True))
src = {f: open(f).read() for f in files}

# what each file exports
exports = {}
for f, t in src.items():
    names = set()
    for m in re.finditer(r'^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)', t, re.M):
        names.add(m.group(1))
    for m in re.finditer(r'^export\s*\{([^}]*)\}', t, re.M):
        for part in m.group(1).split(','):
            part = part.strip()
            if part:
                names.add(part.split(' as ')[-1].strip())
    if re.search(r'^export\s+default\b', t, re.M):
        names.add('default')
    exports[f] = names

problems = []
checked = 0
for f, t in src.items():
    for m in re.finditer(r"^import\s*(?:\{([^}]*)\}|(\w+))?\s*(?:from\s*)?['\"]([^'\"]+)['\"]", t, re.M):
        spec = m.group(3)
        if not spec.startswith('.'):
            continue                      # bare specifier: three, etc.
        target = os.path.normpath(os.path.join(os.path.dirname(f), spec))
        if not os.path.exists(target):
            problems.append(f'{f}: import tu "{spec}" -> KHONG CO FILE {target}')
            continue
        if not m.group(1):
            continue                      # default or side-effect import
        for name in [x.strip() for x in m.group(1).split(',')]:
            if not name:
                continue
            want = name.split(' as ')[0].strip()
            checked += 1
            if want not in exports.get(target, set()):
                problems.append(f'{f}: import {{ {want} }} tu "{spec}" -> {target} KHONG EXPORT cai nay')

print(f'Da kiem tra {checked} ten import tren {len(files)} file.')
if problems:
    print('\nLOI:')
    for p in problems:
        print('  ' + p)
    sys.exit(1)
print('Moi import deu phan giai duoc.')
