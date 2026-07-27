/**
 * Mattermost /atd - 버튼 문답형 출결 판정
 * 출처: Notion "출결 기준 가이드" (2026-07-27)
 */

const BASE_URL = 'https://mm-atd.vercel.app/api/atd';
const FORM_URL = 'https://forms.gle/여기에출결공유설문링크';
const NOTION_URL = 'https://app.notion.com/p/2f42d25df3a980d2943fcad76bbce3f1';

const FOOTER = [
  '',
  '⚠️ 사유·임의 상관없이 **3회 누적 시 교육지원금 1일 차감**',
  '📝 소명 제출: ' + FORM_URL,
  '_안내용입니다. 최종 인정 여부는 담당 프로가 확인합니다._',
].join('\n');

const LABEL = {
  gongga: '🟢 공가',
  sayu: '🟡 사유출결',
  imui: '🟠 임의출결',
  bulga: '🔴 소명불가',
};

const CATS = ['질병', '취업', '경조사', '국가소집', '교통', '개인부주의'];

const RULES = {
  r01: { cat: '질병', name: '병원 진료', type: 'sayu',
    doc: '진료확인서 / 통원확인서 / 진단서 中 택 1',
    notes: ['본인이 진료받지 않는 병원 동행은 모두 임의출결', '예방접종은 임의출결'] },
  r02: { cat: '질병', name: '병원 입원', type: 'sayu',
    doc: '진료확인서 / 통원확인서 / 진단서 中 택 1',
    notes: ['사유결석 15일 이상 → 출결위험군', '사유결석 20일 이상 → 퇴소대상 (전자보고 필수)', '온라인 기간 중 병원에서 Webex 접속 시에도 사유결석 처리'] },
  r03: { cat: '질병', name: '독감 및 유행성 질환', type: 'sayu',
    doc: '진료확인서 / 통원확인서 / 진단서 中 택 1 (격리 시 격리필요 소견서)',
    notes: ['격리 소견이 있으면 해당 기간 동안 사유결석 가능'] },
  r04: { cat: '질병', name: '국가건강검진', type: 'imui',
    doc: '없음', notes: ['주말 예약이 가능하므로 소명 불가'] },

  r05: { cat: '취업', name: '면접', type: 'gongga', job: true,
    doc: '면접확인서', notes: [] },
  r06: { cat: '취업', name: '인적성 검사', type: 'gongga', job: true,
    doc: '인적성검사 응시확인서', notes: ['취업 프로세스에 포함된 검사인 경우에만 가능'] },
  r07: { cat: '취업', name: '코딩 테스트', type: 'gongga', job: true,
    doc: '코딩테스트 참가확인서', notes: [] },
  r08: { cat: '취업', name: '채용검진', type: 'gongga', job: true,
    doc: '검진확인서', notes: ['취업 프로세스에 포함된 검진인 경우에만 가능'] },
  r09: { cat: '취업', name: '자격증 시험', type: 'gongga', job: true,
    doc: '시험 응시 확인서',
    notes: ['국가 자격시험·평일에만 열리는 시험 → 공가', '그 외 → 사유결석', '정보처리기사(필기·실기) 사유 가능 / 오픽은 임의결석'] },
  r10: { cat: '취업', name: '경진대회', type: 'branch',
    q: '어디에서 주최하는 대회인가요?',
    opts: [
      { label: '정부기관·국가 규모', cond: '정부기관 주관 · 국가 규모 기능경기대회 · SSAFY 연계', type: 'gongga', doc: '경진대회 참여확인서' },
      { label: '시·군·구 주최', cond: '시·군·구 주최', type: 'sayu', doc: '경진대회 참여확인서' },
    ], notes: [] },
  r11: { cat: '취업', name: '해커톤', type: 'branch',
    q: '어떤 해커톤인가요?',
    opts: [
      { label: 'SSAFY 연계·정부기관', cond: 'SSAFY 연계 또는 정부기관 주관', type: 'gongga', doc: '참여확인서' },
      { label: '그 외 일반', cond: '그 외 일반 해커톤', type: 'sayu', doc: '① 참여확인서(메일/문자/증명서) ② 이름표 ③ 본인이 나온 사진' },
    ],
    notes: ['대회 당 1회에 한하여 인정 (참여, 시상식)', '2박 3일 일정 등 특이사항은 전자 의사결정 필요'] },
  r12: { cat: '취업', name: '컨퍼런스', type: 'sayu',
    doc: '① 방문 문자·이름표·티켓 ② 본인 얼굴이 나온 참가 사진',
    notes: ['SW·AI 관련만 가능 (단순 정보제공형 불가)', '대기업 주최 또는 코엑스 개최여야 함'] },
  r13: { cat: '취업', name: '취업박람회·채용설명회', type: 'imui',
    doc: '없음', notes: ['학교 단위 취업박람회는 소명 불가', 'IT 관련 일정이 있는 경우 사유 고려'] },

  r14: { cat: '경조사', name: '결혼', type: 'gongga',
    doc: '혼인증명서', notes: ['워킹데이 기준 5일 공가'] },
  r15: { cat: '경조사', name: '장례식', type: 'gongga',
    doc: '장례확인서 / 사망확인서',
    notes: ['워킹데이 기준 3일 공가', '백숙부모는 3일 사유결석', '3촌 외는 임의결석'] },
  r16: { cat: '경조사', name: '졸업식', type: 'gongga', when: '2월 / 8월',
    doc: '① 졸업식 일정 안내문 ② 참석 사진(학교명·본인 얼굴 필수)',
    notes: ['1년 1회', '학위복 대여·학위증 수령과 중복 불가'] },
  r17: { cat: '경조사', name: '학위복 대여 / 촬영', type: 'gongga', when: '2월 / 8월',
    doc: '① 대여 일정 안내문 ② 학위복 착용 사진(본인 얼굴 필수)',
    notes: ['1년 1회', '졸업식·학위증 수령과 중복 불가'] },
  r18: { cat: '경조사', name: '학위증 수령', type: 'gongga', when: '2월 / 8월',
    doc: '① 수령 일정 안내문 ② 학위증을 들고 찍은 사진(본인 얼굴 필수)',
    notes: ['1년 1회', '졸업식·학위복 대여와 중복 불가'] },

  r19: { cat: '국가소집', name: '예비군 훈련', type: 'gongga', when: '3월 ~ 11월',
    doc: '예비군 참여증 / 교육훈련필증', notes: ['소요일수만큼 공가 지원'] },
  r20: { cat: '국가소집', name: '민방위 훈련', type: 'gongga', when: '3월 ~ 11월',
    doc: '교육필증', notes: ['소요일수만큼 공가 지원'] },

  r21: { cat: '교통', name: '지하철 연착', type: 'sayu',
    doc: '① 지연증명서 ② 교통카드 사용 내역',
    notes: ['연착 10분 이상부터 인정', '카드 내역에 일자·시간·역이름이 보여야 함'] },
  r22: { cat: '교통', name: '버스 연착', type: 'branch',
    q: '어떤 상황이었나요?',
    opts: [
      { label: '단순 지연', cond: '단순 지연', type: 'bulga', doc: '없음' },
      { label: '사고로 인한 연착', cond: '버스 사고로 인한 연착', type: 'sayu', doc: '사고를 확인할 수 있는 자료 (사고확인서·지연증명서·뉴스 등)' },
    ],
    notes: ['일반 버스 연착은 증빙이 불명확해 소명이 불가합니다', '지하철은 지연증명서가 발급되므로 사유출결로 인정됩니다'] },

  r23: { cat: '개인부주의', name: '입실 미클릭', type: 'imui',
    doc: '없음', notes: ['14시 이후 확인 시 출결변경 소명 (결석 → 지각)'] },
  r24: { cat: '개인부주의', name: '퇴실 미클릭', type: 'imui',
    doc: '없음', notes: ['출결변경 소명 필수 (결석 → 조퇴)', '퇴실시간 18:31로 변경'] },
};

// ─── handler ────────────────────────────────────────────────
export default function handler(req, res) {
  try {
    const body = req.body || {};
    if (body.context) {
      return res.status(200).json({
        update: { message: '', props: { attachments: route(body.context) } },
      });
    }
    return res.status(200).json({
      response_type: 'ephemeral',
      username: '출결도우미',
      attachments: home(),
    });
  } catch (e) {
    return res.status(200).json({
      response_type: 'ephemeral',
      text: '⚠️ 오류가 발생했습니다.\n```\n' + (e && e.stack ? e.stack : String(e)) + '\n```',
    });
  }
}

function route(ctx) {
  if (ctx.step === 'cat') return pickRule(ctx.cat);
  if (ctx.step === 'rule') return handleRule(ctx.id);
  if (ctx.step === 'branch') return branchResult(ctx.id, Number(ctx.bi));
  if (ctx.step === 'job1') return ctx.v === 'no' ? final(RULES[ctx.id], 'gongga') : jobQ2(ctx.id);
  if (ctx.step === 'job2') {
    return ctx.v === 'no'
      ? final(RULES[ctx.id], 'sayu', '취업 공가 3회를 모두 사용하셨으므로 **사유결석**으로 신청합니다.')
      : final(RULES[ctx.id], 'imui', '취업 공가 3회 + 사유결석 2회를 모두 사용하셨으므로 **임의결석**으로 신청합니다.');
  }
  return home();
}

// ─── screens ────────────────────────────────────────────────
function home() {
  return card(
    '### 🚨 출결 판정 도우미\n어떤 사유인가요?',
    CATS.map((c, i) => btn('c' + i, c, { step: 'cat', cat: c }))
  );
}

function pickRule(cat) {
  const items = Object.keys(RULES).filter((id) => RULES[id].cat === cat);
  const buttons = items.map((id) => btn(id, RULES[id].name, { step: 'rule', id }));
  return card('**' + cat + '** — 해당하는 항목을 선택하세요.', buttons.concat(homeBtn()));
}

function handleRule(id) {
  const r = RULES[id];
  if (r.type === 'branch') {
    const buttons = r.opts.map((o, i) => btn(id + 'b' + i, o.label, { step: 'branch', id: id, bi: String(i) }));
    return card('**' + r.name + '**\n' + r.q, buttons.concat(homeBtn()));
  }
  if (r.job) {
    return card(
      '**' + r.name + '**\n이번 달 취업 관련 공가를 3회 모두 사용하셨나요?\n_(면접·인적성·코딩테스트·채용검진·자격증시험 합산, 월 3회 한도)_',
      [
        btn(id + 'j0', '아직 남아있어요', { step: 'job1', id: id, v: 'no' }),
        btn(id + 'j1', '3회 다 썼어요', { step: 'job1', id: id, v: 'yes' }),
      ].concat(homeBtn())
    );
  }
  return final(r, r.type);
}

function jobQ2(id) {
  return card(
    '**' + RULES[id].name + '**\n사유결석도 2회 모두 사용하셨나요?',
    [
      btn(id + 'k0', '아니요', { step: 'job2', id: id, v: 'no' }),
      btn(id + 'k1', '네, 2회 다 썼어요', { step: 'job2', id: id, v: 'yes' }),
    ].concat(homeBtn())
  );
}

function branchResult(id, i) {
  const r = RULES[id];
  const o = r.opts[i];
  return final(
    { cat: r.cat, name: r.name + ' — ' + o.cond, doc: o.doc, notes: r.notes, when: r.when },
    o.type
  );
}

function final(r, type, extra) {
  const L = ['### ' + LABEL[type], '**' + r.name + '** · ' + r.cat, ''];
  if (extra) L.push(extra, '');
  L.push('📎 증빙: ' + r.doc);
  if (r.when) L.push('📅 신청 가능 시점: ' + r.when);
  if (r.notes && r.notes.length) {
    L.push('', '📌 참고');
    r.notes.forEach(function (n) { L.push('- ' + n); });
  }
  L.push(FOOTER);
  return card(L.join('\n'), homeBtn());
}

// ─── utils ──────────────────────────────────────────────────
function card(text, actions) {
  const chunks = [];
  for (let i = 0; i < actions.length; i += 4) chunks.push(actions.slice(i, i + 4));
  if (!chunks.length) return [{ text: text }];
  return chunks.map(function (acts, i) {
    return { text: i === 0 ? text : '', actions: acts };
  });
}

function btn(id, name, context) {
  return { id: id, name: name, integration: { url: BASE_URL, context: context } };
}

function homeBtn() {
  return [{ id: 'home', name: '↩ 처음으로', integration: { url: BASE_URL, context: { step: 'home' } } }];
}
