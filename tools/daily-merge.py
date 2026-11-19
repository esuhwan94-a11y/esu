"""Merge the three daily collection files into vault-pack.js.
Usage: python3 -I tools/daily-merge.py <folder with weather-news.json, cl.json, notes.json> <YYYYMMDD>"""
import json, os, re, sys, time
D, DAY = sys.argv[1], sys.argv[2]
PACK = '/home/user/esu/vault-pack.js'
raw = open(PACK, encoding='utf8').read()
i, j = raw.index('{'), raw.rindex('}') + 1
P = json.loads(raw[i:j])
by = {n['id']: n for n in P['notes']}
now = int(time.time() * 1000)
REV = int(DAY)
report = []
SENS = re.compile(r'(01[016789][- ]?\d{3,4}[- ]?\d{4}|0\d{1,2}-\d{3,4}-\d{4}|eyJ[A-Za-z0-9_-]{20,}|192\.168\.\d+\.\d+|127\.0\.0\.1|\b\d{6}-\d{7}\b)')


def load(name):
    p = os.path.join(D, name)
    if not os.path.exists(p):
        report.append(f'{name}: 파일 없음')
        return None
    try:
        return json.load(open(p, encoding='utf8'))
    except Exception as e:
        report.append(f'{name}: 읽기 실패 {e}')
        return None


wn = load('weather-news.json')
if wn:
    for key, nid, must in (('weather', 'day-weather', '화성'), ('news', 'day-news', '주요 뉴스')):
        body = str(wn.get(key) or '').strip()
        if len(body) < 80 or must not in body:
            report.append(f'{nid}: 내용이 기준에 안 맞아 건너뜀')
            continue
        n = by[nid]
        n['body'], n['updated'], n['rev'] = body, now, REV
        report.append(f'{nid}: 갱신 ({len(body)}자)')

cl = load('cl.json')
if cl:
    for nid, body in (cl.get('bodies') or {}).items():
        body = str(body or '').strip()
        if nid not in by or not nid.startswith('cl-') or len(body) < 100:
            report.append(f'{nid}: 건너뜀')
            continue
        if SENS.search(body):
            report.append(f'{nid}: 접속 정보·전화번호로 보이는 글자가 있어 건너뜀')
            continue
        n = by[nid]
        n['body'], n['updated'], n['rev'] = body, now, n.get('rev', 1) + 1
        report.append(f'{nid}: 갱신')
    for f in cl.get('failed') or []:
        report.append(f'cl 실패: {f}')

nt = load('notes.json')
added = 0
if nt:
    titles = {n['title'].strip() for n in P['notes']}
    for n in nt.get('notes') or []:
        nid, title, body = str(n.get('id', '')), str(n.get('title', '')).strip(), str(n.get('body', '')).strip()
        if not re.match(r'^d-' + DAY + r'-\d\d$', nid) or not title or len(body) < 30:
            report.append(f'노트 형식 불량: {nid} {title[:20]}')
            continue
        if SENS.search(body + title):
            report.append(f'{nid}: 전화번호·접속 정보로 보이는 글자가 있어 건너뜀')
            continue
        if title in titles and nid not in by:
            title = title + f' ({int(DAY[4:6])}월 {int(DAY[6:8])}일)'
        rec = {'id': nid, 'folder': n.get('folder') if n.get('folder') in ('res', 'idea', 'work') else 'work', 'title': title,
               'tags': [str(t) for t in (n.get('tags') or [])][:4] or ['KAB'], 'body': body[:900], 'updated': now, 'rev': 2}
        if nid in by:
            P['notes'][P['notes'].index(by[nid])] = rec
        else:
            P['notes'].append(rec)
            added += 1
        titles.add(title)
    for f in nt.get('unread') or []:
        report.append(f'못 읽음: {f}')

# links must resolve
tset = {n['title'].strip() for n in P['notes']}
broken = sorted({m for n in P['notes'] for m in re.findall(r'\[\[([^\]]+)\]\]', n['body']) if m.strip() not in tset})
if broken:
    report.append('끊어진 연결: ' + ', '.join(broken[:6]))
P['v'] += 1
open(PACK, 'w', encoding='utf8').write(raw[:i] + json.dumps(P, ensure_ascii=False) + raw[j:])
print('pack v', P['v'], 'notes', len(P['notes']), 'added', added)
print('\n'.join(report))
