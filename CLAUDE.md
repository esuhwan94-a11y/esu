# 세컨드 브레인 (자비스)

- `second-brain.html`이 본체다. 고친 뒤 `./build.sh`로 `index.html`을 다시 만든다.
- `vault-pack.js`(노트 데이터)와 `세컨드브레인.html`은 회사 자료가 들어 있어 커밋하지 않는다.
- 클라우드 세션에서 스킬 검색(`npx skills find <검색어>`)은 Node의 fetch가 프록시를 타야 동작한다. `.claude/settings.json`에 `NODE_USE_ENV_PROXY=1`을 넣어 두었고, 안 되면 명령 앞에 `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`를 붙인다.
- 스킬은 바로 설치하지 않는다. 내려받아 점검하고 사용자 확인을 받은 뒤 설치한다.
- Claude와 관련된 것(예약 작업, 작업 대화, 스킬, 이 컴퓨터에서 한 작업)은 사용자에게 묻지 말고 자비스 노트에 넣는다. 사용자가 여러 번 말한 규칙이다(2026-11-18). 볼 수 없는 것만 무엇을 못 봤는지 알린다.
