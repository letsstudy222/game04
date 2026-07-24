#!/usr/bin/env python3
"""Find names a file USES but never imports or declares.

check-imports.py verifies that every import resolves to a real export. It is
blind to the opposite mistake — calling something that was never imported at
all — because there is no import statement for it to check. That is exactly the
bug that froze the game: an edit added `currentAt(...)` to player.js but the
import line it was supposed to accompany never landed, so every frame threw
`currentAt is not defined` and the render loop died on the first tick.

`node --check` cannot catch it either: it is valid syntax. It only fails when
the line actually runs.
"""
import re, os, glob, sys

ROOT = os.path.dirname(os.path.abspath(__file__)) + '/..'
os.chdir(ROOT)

BUILTINS = {
    'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
    'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Symbol', 'RegExp', 'Error',
    'TypeError', 'RangeError', 'console', 'window', 'document', 'navigator',
    'localStorage', 'sessionStorage', 'location', 'history', 'fetch', 'URL',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame',
    'cancelAnimationFrame', 'performance', 'Float32Array', 'Uint8Array', 'Uint16Array',
    'Uint32Array', 'Int16Array', 'Int32Array', 'ArrayBuffer', 'DataView', 'Image',
    'HTMLCanvasElement', 'CanvasRenderingContext2D', 'ImageData', 'Blob', 'FileReader',
    'AudioContext', 'webkitAudioContext', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
    'NaN', 'Infinity', 'undefined', 'globalThis', 'structuredClone', 'Intl', 'Proxy',
    'Reflect', 'BigInt', 'encodeURIComponent', 'decodeURIComponent', 'alert',
    'devicePixelRatio', 'matchMedia', 'getComputedStyle', 'CustomEvent', 'Event',
    'PointerEvent', 'KeyboardEvent', 'TouchEvent', 'WheelEvent', 'process',
    'URLSearchParams', 'URLSearchParams', 'Worker', 'OffscreenCanvas', 'ResizeObserver',
    'IntersectionObserver', 'MutationObserver', 'DOMParser', 'XMLHttpRequest',
}

# statements that introduce a binding
DECL = re.compile(
    r'(?:^|[\s;{(,])(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)')
PARAM_FN = re.compile(r'function\s*[A-Za-z_$\w]*\s*\(([^)]*)\)')
ARROW = re.compile(r'(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>')
METHOD = re.compile(
    r'^\s{2,}(?:static\s+|async\s+|\*)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{', re.M)
# `get foo()` also makes `foo` look like a call site to the use-scanner below
ACCESSOR = re.compile(r'\b(?:get|set)\s+([A-Za-z_$][\w$]*)\s*\(')
CATCH = re.compile(r'catch\s*\(\s*([A-Za-z_$][\w$]*)')
FORDECL = re.compile(r'for\s*\(\s*(?:const|let|var)\s*(?:\[([^\]]*)\]|\{([^}]*)\}|([A-Za-z_$][\w$]*))')
DESTRUCT = re.compile(r'(?:const|let|var)\s*(?:\{([^}]*)\}|\[([^\]]*)\])\s*=')

# only flag names that look like a call or a member access on something
USE_CALL = re.compile(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(')
USE_NEW = re.compile(r'new\s+([A-Za-z_$][\w$]*)')


def names_from(blob):
    out = set()
    for part in re.split(r'[,\s]+', blob):
        part = part.strip().split('=')[0].strip().lstrip('.')
        part = part.split(':')[-1].strip()
        if re.fullmatch(r'[A-Za-z_$][\w$]*', part):
            out.add(part)
    return out


problems = []
for f in sorted(glob.glob('src/**/*.js', recursive=True)):
    t = open(f).read()
    # strip comments and strings so their contents are not mistaken for code
    code = re.sub(r'/\*.*?\*/', ' ', t, flags=re.S)
    code = re.sub(r'//[^\n]*', ' ', code)
    code = re.sub(r'`(?:[^`\\]|\\.)*`', ' `` ', code)
    code = re.sub(r"'(?:[^'\\]|\\.)*'", " '' ", code)
    code = re.sub(r'"(?:[^"\\]|\\.)*"', ' "" ', code)

    bound = set(BUILTINS)
    for m in re.finditer(r'^import\s+(?:\*\s+as\s+([\w$]+)|\{([^}]*)\}|([\w$]+))', code, re.M):
        if m.group(1):
            bound.add(m.group(1))
        if m.group(2):
            for n in m.group(2).split(','):
                n = n.strip()
                if n:
                    bound.add(n.split(' as ')[-1].strip())
        if m.group(3):
            bound.add(m.group(3))
    for m in DECL.finditer(code):
        bound.add(m.group(1))
    for m in PARAM_FN.finditer(code):
        bound |= names_from(m.group(1))
    for m in ARROW.finditer(code):
        bound |= names_from(m.group(1) or m.group(2) or '')
    for m in METHOD.finditer(code):
        bound.add(m.group(1))
        bound |= names_from(m.group(2))
    for m in ACCESSOR.finditer(code):
        bound.add(m.group(1))
    for m in CATCH.finditer(code):
        bound.add(m.group(1))
    for m in FORDECL.finditer(code):
        bound |= names_from(m.group(1) or m.group(2) or m.group(3) or '')
    for m in DESTRUCT.finditer(code):
        bound |= names_from(m.group(1) or m.group(2) or '')

    used = set()
    for m in USE_CALL.finditer(code):
        used.add(m.group(1))
    for m in USE_NEW.finditer(code):
        used.add(m.group(1))

    KEYWORDS = {'if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function',
                'class', 'new', 'do', 'else', 'in', 'of', 'await', 'yield', 'super',
                'this', 'void', 'delete', 'instanceof', 'throw', 'try', 'import', 'export'}
    for n in sorted(used - bound - KEYWORDS):
        problems.append(f'{f}: dung "{n}(...)" nhung khong import va khong khai bao')

print(f'Da quet {len(glob.glob("src/**/*.js", recursive=True))} file.')
if problems:
    print('\nTEN DUNG MA KHONG CO NGUON:')
    for p in problems:
        print('  ' + p)
    print('\nDay la loai loi node --check khong bat duoc: cu phap hop le,')
    print('chi vo khi dong do thuc su chay.')
    sys.exit(1)
print('Moi ten duoc goi deu co nguon.')
