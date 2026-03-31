(() => {
  const BOARD_STORAGE_KEY = 'rookie-pretotype-board-v2';
  const SETTINGS_STORAGE_KEY = 'rookie-pretotype-settings-v2';
  const COMMUNICATION_STORAGE_KEY = 'rookie-cross-mode-messages-v1';
  const PUBLIC_ANNOUNCEMENT_SEEN_KEY = 'rookie-public-announcement-seen-v1';
  const PUBLIC_ACCESS_KEY = 'rookie-public-access-v1';
  const LECTURE_ACCESS_KEY = 'rookie-lecture-access-v1';
  const PUBLIC_PASSWORD = '0330';
  const LECTURE_PASSWORD = '990323';
  const REFRESH_INTERVAL_MS = 30000;
  const SUPABASE_LIVE_REFRESH_INTERVAL_MS = 5000;
  const COMMUNICATION_REFRESH_INTERVAL_MS = 2500;

  const SAMPLE_TEAMS = [
    {
      teamName: '1팀',
      teamItem: '대학생 멘토 매칭',
      teamTarget: '새내기 대학생',
      teamCTA: '첫 멘토링 신청하기',
      teamProblem: '전공/진로 정보를 빠르게 얻을 통로가 부족함',
      teamBudget: '광고 2만 원 + 학내 커뮤니티 배포',
      teamLinks: 'https://example.com/mentoring',
      createdAt: new Date().toISOString()
    },
    {
      teamName: '2팀',
      teamItem: '시험기간 야식 픽업',
      teamTarget: '기숙사 거주 학생',
      teamCTA: '픽업 예약 남기기',
      teamProblem: '늦은 시간에 빠르게 먹을 선택지가 부족함',
      teamBudget: '재료 테스트 3만 원 + 단톡방 공지',
      teamLinks: 'https://example.com/snack',
      createdAt: new Date().toISOString()
    }
  ];

  const $ = (selector) => document.querySelector(selector);

  const els = {
    body: document.body,
    teamForm: $('#teamForm'),
    publicTeamForm: $('#publicTeamForm'),
    teamBoard: $('#teamBoard'),
    emptyState: $('#emptyState'),
    loadSamples: $('#loadSamples'),
    clearBoard: $('#clearBoard'),
    metricTeams: $('#metricTeams'),
    metricCtas: $('#metricCtas'),
    metricLinks: $('#metricLinks'),
    metricResources: $('#metricResources'),
    dataSourceType: $('#dataSourceType'),
    dataSourceUrl: $('#dataSourceUrl'),
    formUrl: $('#formUrl'),
    supabaseKey: $('#supabaseKey'),
    supabaseTable: $('#supabaseTable'),
    supabaseQuestionsTable: $('#supabaseQuestionsTable'),
    supabaseAnnouncementsTable: $('#supabaseAnnouncementsTable'),
    applySourceConfig: $('#applySourceConfig'),
    refreshBoard: $('#refreshBoard'),
    boardStatus: $('#boardStatus'),
    syncMeta: $('#syncMeta'),
    openFormLink: $('#openFormLink'),
    copyFormLink: $('#copyFormLink'),
    openBoardLink: $('#openBoardLink'),
    copyBoardLink: $('#copyBoardLink'),
    formQrImage: $('#formQrImage'),
    boardQrImage: $('#boardQrImage'),
    demoInputPanel: $('#demoInputPanel'),
    publicQuestionForm: $('#publicQuestionForm'),
    publicQuestionInput: $('#publicQuestionInput'),
    publicAnswerList: $('#publicAnswerList'),
    publicStatus: $('#publicStatus'),
    lectureQuestionList: $('#lectureQuestionList'),
    lectureBroadcastForm: $('#lectureBroadcastForm'),
    lectureBroadcastInput: $('#lectureBroadcastInput'),
    publicMessagePopup: $('#publicMessagePopup'),
    publicMessageText: $('#publicMessageText'),
    closePublicMessagePopup: $('#closePublicMessagePopup'),
    themeToggle: $('#themeToggle'),
    lectureGate: $('#lectureGate'),
    lecturePasswordForm: $('#lecturePasswordForm'),
    lecturePasswordInput: $('#lecturePasswordInput'),
    lectureGateKicker: $('#lectureGateKicker'),
    lectureGateDescription: $('#lectureGateDescription'),
    lectureGateSubmit: $('#lectureGateSubmit'),
    cancelLectureAccess: $('#cancelLectureAccess'),
    lecturePasswordMessage: $('#lecturePasswordMessage'),
    modeButtons: Array.from(document.querySelectorAll('[data-mode-btn]')),
    pageViewButtons: Array.from(document.querySelectorAll('[data-view-btn]'))
  };

  if (!els.teamBoard) {
    return;
  }

  const defaultSettings = {
    mode: 'demo',
    sourceType: 'demo',
    sourceUrl: '',
    formUrl: '',
    supabaseKey: '',
    supabaseTable: 'pretotype_board_entries',
    supabaseQuestionsTable: 'pretotype_questions',
    supabaseAnnouncementsTable: 'pretotype_announcements',
    theme: 'dark',
    pageView: 'public'
  };

  let refreshTimer = null;
  let communicationTimer = null;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function normalizeUrl(value = '') {
    const trimmed = String(value).trim();

    if (!trimmed) {
      return '';
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return 'https://' + trimmed;
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJsonStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // 저장 제한 환경에서는 무시하고 현재 세션만 유지합니다.
    }
  }

  function getQueryOverrides() {
    const params = new URLSearchParams(window.location.search);
    const overrides = {};

    if (params.get('mode')) overrides.mode = params.get('mode');
    if (params.get('source')) overrides.sourceType = params.get('source');
    if (params.get('url')) overrides.sourceUrl = params.get('url');
    if (params.get('form')) overrides.formUrl = params.get('form');
    if (params.get('sbkey')) overrides.supabaseKey = params.get('sbkey');
    if (params.get('sbtable')) overrides.supabaseTable = params.get('sbtable');
    if (params.get('sbqtable')) overrides.supabaseQuestionsTable = params.get('sbqtable');
    if (params.get('sbatable')) overrides.supabaseAnnouncementsTable = params.get('sbatable');
    if (params.get('theme')) overrides.theme = params.get('theme');
    if (params.get('view')) overrides.pageView = params.get('view');

    return overrides;
  }

  const state = {
    settings: {
      ...defaultSettings,
      ...readJsonStorage(SETTINGS_STORAGE_KEY, {}),
      ...getQueryOverrides()
    },
    teams: readJsonStorage(BOARD_STORAGE_KEY, []),
    communication: readJsonStorage(COMMUNICATION_STORAGE_KEY, { questions: [], lectureAnnouncement: null }),
    pendingGateMode: 'public',
    lastSeenAnnouncementId: (() => {
      try {
        return sessionStorage.getItem(PUBLIC_ANNOUNCEMENT_SEEN_KEY) || '';
      } catch (error) {
        return '';
      }
    })(),
    publicAuthorized: (() => {
      try {
        return sessionStorage.getItem(PUBLIC_ACCESS_KEY) === 'true';
      } catch (error) {
        return false;
      }
    })(),
    lectureAuthorized: (() => {
      try {
        return sessionStorage.getItem(LECTURE_ACCESS_KEY) === 'true';
      } catch (error) {
        return false;
      }
    })()
  };

  class DemoAdapter {
    async fetch() {
      return readJsonStorage(BOARD_STORAGE_KEY, []);
    }

    async save(record) {
      const next = [record, ...readJsonStorage(BOARD_STORAGE_KEY, [])];
      saveJsonStorage(BOARD_STORAGE_KEY, next);
      return next;
    }

    async seed(records) {
      saveJsonStorage(BOARD_STORAGE_KEY, records);
      return records;
    }

    async clear() {
      saveJsonStorage(BOARD_STORAGE_KEY, []);
      return [];
    }
  }

  class JsonAdapter {
    constructor(url) {
      this.url = normalizeUrl(url);
    }

    async fetch() {
      if (!this.url) {
        throw new Error('외부 JSON URL이 비어 있습니다.');
      }

      const response = await fetch(this.url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`JSON 응답 실패 (${response.status})`);
      }

      const payload = await response.json();
      return extractRecordsFromPayload(payload);
    }
  }

  class GoogleSheetsAdapter {
    constructor(url) {
      this.url = normalizeUrl(url);
    }

    async fetch() {
      if (!this.url) {
        throw new Error('Google Sheets URL이 비어 있습니다.');
      }

      const response = await fetch(this.url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Sheets 응답 실패 (${response.status})`);
      }

      const text = await response.text();
      let payload;

      try {
        payload = JSON.parse(text);
      } catch (error) {
        payload = parseGoogleWrapper(text);
      }

      return extractRecordsFromPayload(payload);
    }
  }

  function sortRecordsByCreatedAt(records = []) {
    return [...records].sort((left, right) => {
      const leftTime = Date.parse(left?.createdAt || '') || 0;
      const rightTime = Date.parse(right?.createdAt || '') || 0;
      return rightTime - leftTime;
    });
  }

  function buildSupabaseTableUrl(url, table = 'pretotype_board_entries') {
    const safeUrl = normalizeUrl(url);
    if (!safeUrl) {
      return '';
    }

    const cleanUrl = safeUrl.replace(/\/+$/, '');
    const safeTable = encodeURIComponent(String(table || 'pretotype_board_entries').trim() || 'pretotype_board_entries');

    if (/\/rest\/v1(\/|$)/i.test(cleanUrl)) {
      const parsed = new URL(cleanUrl);
      if (!/\/rest\/v1\/[^/]+$/i.test(parsed.pathname)) {
        parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/${safeTable}`;
      }
      parsed.searchParams.set('select', '*');
      return parsed.toString();
    }

    return `${cleanUrl}/rest/v1/${safeTable}?select=*`;
  }

  function buildSupabaseRestUrl(url, table, query = {}) {
    const base = buildSupabaseTableUrl(url, table);
    if (!base) {
      return '';
    }

    const parsed = new URL(base);
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || String(value).trim() === '') {
        parsed.searchParams.delete(key);
      } else {
        parsed.searchParams.set(key, String(value));
      }
    });
    return parsed.toString();
  }

  class SupabaseAdapter {
    constructor(url, anonKey, table = 'pretotype_board_entries') {
      this.url = normalizeUrl(url);
      this.anonKey = String(anonKey || '').trim();
      this.table = String(table || 'pretotype_board_entries').trim() || 'pretotype_board_entries';
    }

    get headers() {
      return {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.anonKey}`
      };
    }

    async fetch() {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }

      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오. service_role key는 사용하지 마십시오.');
      }

      const endpoint = buildSupabaseTableUrl(this.url, this.table);
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: this.headers
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Supabase 응답 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }

      const payload = await response.json();
      return sortRecordsByCreatedAt(extractRecordsFromPayload(payload));
    }

    async save(record) {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }

      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오.');
      }

      const endpoint = buildSupabaseTableUrl(this.url, this.table).replace(/\?select=\*$/, '');
      const payload = {
        team_name: record.teamName || null,
        team_item: record.teamItem || null,
        team_target: record.teamTarget || null,
        team_cta: record.teamCTA || null,
        team_problem: record.teamProblem || null,
        team_budget: record.teamBudget || null,
        team_links: record.teamLinks || null,
        created_at: record.createdAt || new Date().toISOString()
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify([payload])
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Supabase 저장 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }

      return response.json();
    }
  }

  function normalizeQuestionRow(row = {}) {
    return {
      id: String(row.id || ''),
      text: String(row.text || row.question || ''),
      answer: String(row.answer || ''),
      createdAt: row.created_at || row.createdAt || '',
      answeredAt: row.answered_at || row.answeredAt || ''
    };
  }

  function normalizeAnnouncementRow(row = {}) {
    return {
      id: String(row.id || ''),
      text: String(row.text || ''),
      createdAt: row.created_at || row.createdAt || ''
    };
  }

  class SupabaseQuestionsAdapter {
    constructor(url, anonKey, table = 'pretotype_questions') {
      this.url = normalizeUrl(url);
      this.anonKey = String(anonKey || '').trim();
      this.table = String(table || 'pretotype_questions').trim() || 'pretotype_questions';
    }

    get headers() {
      return {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.anonKey}`
      };
    }

    async fetch({ limit = 50 } = {}) {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }
      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오.');
      }

      const endpoint = buildSupabaseRestUrl(this.url, this.table, {
        order: 'created_at.desc',
        limit: String(limit)
      });
      const response = await fetch(endpoint, { cache: 'no-store', headers: this.headers });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`질문 목록 조회 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }

      const payload = await response.json();
      if (!Array.isArray(payload)) {
        return [];
      }
      return payload.map(normalizeQuestionRow).filter((q) => q.id && q.text);
    }

    async create(text) {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }
      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오.');
      }

      const endpoint = buildSupabaseTableUrl(this.url, this.table).replace(/\?select=\*$/, '');
      const record = {
        id: createMessageId('question'),
        text: String(text || '').trim(),
        answer: '',
        created_at: new Date().toISOString()
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify([record])
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`질문 저장 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }
      return response.json();
    }

    async answer(id, answer) {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }
      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오.');
      }

      const base = buildSupabaseTableUrl(this.url, this.table).replace(/\?select=\*$/, '');
      const endpoint = `${base}?id=eq.${encodeURIComponent(String(id || '').trim())}`;
      const payload = {
        answer: String(answer || '').trim(),
        answered_at: new Date().toISOString()
      };
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`답변 저장 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }
      return response.json();
    }
  }

  class SupabaseAnnouncementsAdapter {
    constructor(url, anonKey, table = 'pretotype_announcements') {
      this.url = normalizeUrl(url);
      this.anonKey = String(anonKey || '').trim();
      this.table = String(table || 'pretotype_announcements').trim() || 'pretotype_announcements';
    }

    get headers() {
      return {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.anonKey}`
      };
    }

    async fetchLatest() {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }
      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오.');
      }

      const endpoint = buildSupabaseRestUrl(this.url, this.table, {
        order: 'created_at.desc',
        limit: '1'
      });
      const response = await fetch(endpoint, { cache: 'no-store', headers: this.headers });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`공지 조회 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }

      const payload = await response.json();
      const row = Array.isArray(payload) ? payload[0] : null;
      if (!row) {
        return null;
      }
      const normalized = normalizeAnnouncementRow(row);
      return normalized.id ? normalized : null;
    }

    async create(text) {
      if (!this.url) {
        throw new Error('Supabase 프로젝트 URL이 비어 있습니다.');
      }
      if (!this.anonKey) {
        throw new Error('Supabase anon key를 입력하십시오.');
      }

      const endpoint = buildSupabaseTableUrl(this.url, this.table).replace(/\?select=\*$/, '');
      const record = {
        id: createMessageId('announcement'),
        text: String(text || '').trim(),
        created_at: new Date().toISOString()
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify([record])
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`공지 저장 실패 (${response.status}) ${detail.slice(0, 120)}`.trim());
      }
      return response.json();
    }
  }

  function parseGoogleWrapper(text) {
    const trimmed = text.trim();
    const match = trimmed.match(/setResponse\((.*)\);?$/s);

    if (!match) {
      throw new Error('Google Sheets 응답 형식을 해석할 수 없습니다.');
    }

    return JSON.parse(match[1]);
  }

  function rowsToObjects(headers, rows) {
    return rows.map((row) => Object.fromEntries(
      headers.map((header, index) => [String(header || `column${index + 1}`).trim(), row?.[index] ?? ''])
    ));
  }

  function pickValue(record, keys) {
    for (const key of keys) {
      if (record && Object.prototype.hasOwnProperty.call(record, key)) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
    }

    return '';
  }

  function normalizeRecord(record = {}) {
    return {
      teamName: pickValue(record, ['teamName', 'team', 'team_name', 'name', '팀', '팀명', '팀 이름']),
      teamItem: pickValue(record, ['teamItem', 'item', 'idea', 'service', 'product', '아이템', '아이디어']),
      teamTarget: pickValue(record, ['teamTarget', 'target', 'audience', 'customer', '타깃', '타깃 고객']),
      teamCTA: pickValue(record, ['teamCTA', 'cta', 'callToAction', '핵심 CTA', '신청']),
      teamProblem: pickValue(record, ['teamProblem', 'problem', 'painPoint', '문제', '해결하려는 문제']),
      teamBudget: pickValue(record, ['teamBudget', 'budget', 'resources', '예산', '자원', '예산/보유 자원 활용 계획']),
      teamLinks: normalizeUrl(pickValue(record, ['teamLinks', 'link', 'url', 'landingUrl', 'formUrl', '링크', '폼/랜딩 링크'])),
      createdAt: pickValue(record, ['createdAt', 'timestamp', 'submittedAt', 'submitted_at', '제출시간'])
    };
  }

  function hasUsefulValue(record) {
    return Object.values(record).some((value) => String(value || '').trim() !== '');
  }

  function extractRecordsFromPayload(payload) {
    if (Array.isArray(payload)) {
      return payload.map(normalizeRecord).filter(hasUsefulValue);
    }

    if (payload?.items && Array.isArray(payload.items)) {
      return payload.items.map(normalizeRecord).filter(hasUsefulValue);
    }

    if (payload?.data && Array.isArray(payload.data)) {
      return payload.data.map(normalizeRecord).filter(hasUsefulValue);
    }

    if (payload?.rows && Array.isArray(payload.rows)) {
      return payload.rows.map(normalizeRecord).filter(hasUsefulValue);
    }

    if (payload?.values && Array.isArray(payload.values)) {
      const [headers = [], ...rows] = payload.values;
      return rowsToObjects(headers, rows).map(normalizeRecord).filter(hasUsefulValue);
    }

    if (payload?.table?.rows && Array.isArray(payload.table.rows)) {
      const headers = (payload.table.cols || []).map((col, index) => col.label || col.id || `column${index + 1}`);
      const rows = payload.table.rows.map((row) => headers.reduce((acc, header, index) => {
        acc[header] = row?.c?.[index]?.v ?? '';
        return acc;
      }, {}));

      return rows.map(normalizeRecord).filter(hasUsefulValue);
    }

    return [];
  }

  function createAdapter() {
    switch (state.settings.sourceType) {
      case 'json':
        return new JsonAdapter(state.settings.sourceUrl);
      case 'googleSheets':
        return new GoogleSheetsAdapter(state.settings.sourceUrl);
      case 'supabase':
        return new SupabaseAdapter(
          state.settings.sourceUrl,
          state.settings.supabaseKey,
          state.settings.supabaseTable
        );
      default:
        return new DemoAdapter();
    }
  }

  function createQuestionsAdapter() {
    return new SupabaseQuestionsAdapter(
      state.settings.sourceUrl,
      state.settings.supabaseKey,
      state.settings.supabaseQuestionsTable
    );
  }

  function createAnnouncementsAdapter() {
    return new SupabaseAnnouncementsAdapter(
      state.settings.sourceUrl,
      state.settings.supabaseKey,
      state.settings.supabaseAnnouncementsTable
    );
  }

  function isSupabaseConfigured() {
    return state.settings.sourceType === 'supabase'
      && Boolean(normalizeUrl(state.settings.sourceUrl))
      && Boolean(String(state.settings.supabaseKey || '').trim());
  }

  function updateMetrics(teams) {
    els.metricTeams.textContent = String(teams.length);
    els.metricCtas.textContent = String(teams.filter((team) => team.teamCTA).length);
    els.metricLinks.textContent = String(teams.filter((team) => team.teamLinks).length);
    els.metricResources.textContent = String(teams.filter((team) => team.teamBudget).length);
  }

  function renderBoard(teams) {
    els.teamBoard.innerHTML = '';
    els.emptyState.hidden = teams.length > 0;
    updateMetrics(teams);

    teams.forEach((team, index) => {
      const article = document.createElement('article');
      article.className = 'team-card';

      const safeLink = normalizeUrl(team.teamLinks);
      const linkMarkup = safeLink
        ? `<a class="btn btn-ghost" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener">링크 열기</a>`
        : '<span class="pill">링크 미입력</span>';

      const createdText = team.createdAt ? new Date(team.createdAt).toLocaleString('ko-KR') : '시간 정보 없음';

      article.innerHTML = `
        <div class="team-title-row">
          <div>
            <div class="subhead">Team ${index + 1}</div>
            <h4>${escapeHtml(team.teamName || '이름 없는 팀')}</h4>
          </div>
          <span class="pill">${escapeHtml(team.teamCTA || 'CTA 미입력')}</span>
        </div>
        <div class="team-section">
          <p><strong>아이템</strong> · ${escapeHtml(team.teamItem || '-')}</p>
          <p><strong>타깃 고객</strong> · ${escapeHtml(team.teamTarget || '-')}</p>
          <p><strong>문제</strong> · ${escapeHtml(team.teamProblem || '미입력')}</p>
          <p><strong>예산/자원 활용</strong> · ${escapeHtml(team.teamBudget || '미입력')}</p>
          <p><strong>입력 시각</strong> · ${escapeHtml(createdText)}</p>
        </div>
        <div class="team-cta-links">
          ${linkMarkup}
        </div>
      `;

      els.teamBoard.appendChild(article);
    });
  }

  function setStatus(message, tone = 'default') {
    if (!els.boardStatus) {
      return;
    }

    els.boardStatus.dataset.tone = tone;
    els.boardStatus.textContent = message;
  }

  function setPublicStatus(message, tone = 'default') {
    if (!els.publicStatus) {
      return;
    }

    els.publicStatus.dataset.tone = tone;
    els.publicStatus.textContent = message;
  }

  function updateSyncMeta(prefix = '마지막 동기화') {
    if (!els.syncMeta) {
      return;
    }

    const time = new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    els.syncMeta.textContent = `${prefix}: ${time}`;
  }

  function createPlaceholderQr(message) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
        <rect width="280" height="280" rx="24" fill="#ffffff" />
        <rect x="22" y="22" width="72" height="72" rx="10" fill="#181b20" />
        <rect x="36" y="36" width="44" height="44" rx="6" fill="#ffffff" />
        <rect x="186" y="22" width="72" height="72" rx="10" fill="#181b20" />
        <rect x="200" y="36" width="44" height="44" rx="6" fill="#ffffff" />
        <rect x="22" y="186" width="72" height="72" rx="10" fill="#181b20" />
        <rect x="36" y="200" width="44" height="44" rx="6" fill="#ffffff" />
        <g fill="#181b20">
          <rect x="122" y="30" width="14" height="14" rx="3" />
          <rect x="144" y="30" width="14" height="14" rx="3" />
          <rect x="122" y="52" width="14" height="14" rx="3" />
          <rect x="144" y="74" width="14" height="14" rx="3" />
          <rect x="166" y="118" width="14" height="14" rx="3" />
          <rect x="188" y="118" width="14" height="14" rx="3" />
          <rect x="210" y="118" width="14" height="14" rx="3" />
          <rect x="122" y="140" width="14" height="14" rx="3" />
          <rect x="144" y="140" width="14" height="14" rx="3" />
          <rect x="188" y="162" width="14" height="14" rx="3" />
          <rect x="210" y="184" width="14" height="14" rx="3" />
          <rect x="122" y="206" width="14" height="14" rx="3" />
          <rect x="144" y="228" width="14" height="14" rx="3" />
          <rect x="166" y="206" width="14" height="14" rx="3" />
        </g>
        <text x="140" y="262" text-anchor="middle" font-size="13" fill="#4a5568" font-family="Arial, sans-serif">${message}</text>
      </svg>`;

    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  function detectBoardUrl() {
    if (typeof window === 'undefined') {
      return '';
    }

    if (!/^https?:$/i.test(window.location.protocol)) {
      return '';
    }

    const url = new URL(window.location.href);
    url.hash = '#live';

    if (state.settings.mode === 'live') {
      url.searchParams.set('mode', 'live');
    } else {
      url.searchParams.delete('mode');
    }

    if (state.settings.sourceType && state.settings.sourceType !== 'demo') {
      url.searchParams.set('source', state.settings.sourceType);
    } else {
      url.searchParams.delete('source');
    }

    if (state.settings.sourceUrl) {
      url.searchParams.set('url', state.settings.sourceUrl);
    } else {
      url.searchParams.delete('url');
    }

    if (state.settings.formUrl) {
      url.searchParams.set('form', state.settings.formUrl);
    } else {
      url.searchParams.delete('form');
    }

    if (state.settings.theme && state.settings.theme !== 'dark') {
      url.searchParams.set('theme', state.settings.theme);
    } else {
      url.searchParams.delete('theme');
    }

    if (state.settings.pageView === 'public') {
      url.searchParams.set('view', 'public');
    } else {
      url.searchParams.delete('view');
    }

    return url.toString();
  }

  function setQrImage(target, url, placeholderMessage, altText) {
    if (!target) {
      return;
    }

    const safeUrl = normalizeUrl(url);

    if (!safeUrl) {
      target.src = createPlaceholderQr(placeholderMessage);
      target.alt = placeholderMessage;
      return;
    }

    target.onerror = () => {
      target.onerror = null;
      target.src = createPlaceholderQr('QR 생성 실패 · 링크 복사 사용');
      target.alt = 'QR 생성 실패';
    };
    target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(safeUrl);
    target.alt = altText;
  }

  function applyTheme(theme) {
    const resolvedTheme = theme === 'light' ? 'light' : 'dark';
    state.settings.theme = resolvedTheme;
    els.body.classList.toggle('theme-light', resolvedTheme === 'light');
    els.body.classList.toggle('theme-dark', resolvedTheme !== 'light');
    els.themeToggle.textContent = resolvedTheme === 'light' ? '☾' : '☀';
    els.themeToggle.setAttribute('aria-label', resolvedTheme === 'light' ? '다크 테마로 전환' : '화이트 테마로 전환');
  }

  function updateShareLinks() {
    const formUrl = normalizeUrl(state.settings.formUrl);
    const boardUrl = detectBoardUrl();

    if (els.openFormLink) {
      els.openFormLink.href = formUrl || '#';
      els.openFormLink.textContent = formUrl ? '학생 입력 폼 열기' : '입력 링크 미설정';
    }

    if (els.copyFormLink) {
      els.copyFormLink.disabled = !formUrl;
    }

    if (els.openBoardLink) {
      els.openBoardLink.href = boardUrl || '#';
      els.openBoardLink.textContent = boardUrl ? '발표 보드 열기' : '발표 보드 URL 미감지';
    }

    if (els.copyBoardLink) {
      els.copyBoardLink.disabled = !boardUrl;
    }

    setQrImage(els.formQrImage, formUrl, '폼 링크를 넣으면 QR이 표시됩니다', '입력 폼 QR');
    setQrImage(els.boardQrImage, boardUrl, '배포 URL 감지 시 보드 QR 표시', '발표 보드 QR');
  }

  function formatDisplayTime(value) {
    if (!value) {
      return '시간 정보 없음';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString('ko-KR');
  }

  function createMessageId(prefix = 'msg') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function saveCommunicationState(nextCommunication) {
    state.communication = nextCommunication;
    saveJsonStorage(COMMUNICATION_STORAGE_KEY, nextCommunication);
    renderCommunication();
    maybeShowPublicAnnouncement();
  }

  function setAnnouncementSeen(id) {
    state.lastSeenAnnouncementId = String(id || '');

    try {
      if (state.lastSeenAnnouncementId) {
        sessionStorage.setItem(PUBLIC_ANNOUNCEMENT_SEEN_KEY, state.lastSeenAnnouncementId);
      } else {
        sessionStorage.removeItem(PUBLIC_ANNOUNCEMENT_SEEN_KEY);
      }
    } catch (error) {
      // sessionStorage를 사용할 수 없는 환경이면 현재 상태만 유지합니다.
    }
  }

  function hidePublicAnnouncement() {
    if (els.publicMessagePopup) {
      els.publicMessagePopup.hidden = true;
    }

    if (state.communication?.lectureAnnouncement?.id) {
      setAnnouncementSeen(state.communication.lectureAnnouncement.id);
    }
  }

  function maybeShowPublicAnnouncement() {
    const announcement = state.communication?.lectureAnnouncement;
    if (!els.publicMessagePopup || !els.publicMessageText) {
      return;
    }

    if (state.settings.pageView !== 'public' || !announcement?.id) {
      els.publicMessagePopup.hidden = true;
      return;
    }

    if (String(state.lastSeenAnnouncementId) === String(announcement.id)) {
      return;
    }

    els.publicMessageText.textContent = announcement.text || '새 메시지가 도착했습니다.';
    els.publicMessagePopup.hidden = false;
  }

  function renderCommunication() {
    const communication = state.communication || { questions: [], lectureAnnouncement: null };
    const questions = communication.questions || [];

    if (els.publicAnswerList) {
      els.publicAnswerList.innerHTML = questions.length
        ? questions.map((question) => `
            <article class="message-item">
              <strong>질문</strong>
              <p>${escapeHtml(question.text || '')}</p>
              <p class="small">질문 시각 · ${escapeHtml(formatDisplayTime(question.createdAt))}</p>
              <p class="small"><strong>답변</strong> · ${escapeHtml(question.answer || '아직 답변 대기 중입니다.')}</p>
            </article>
          `).join('')
        : '<div class="message-item"><p class="small">아직 보낸 질문이 없습니다.</p></div>';
    }

    if (els.lectureQuestionList) {
      els.lectureQuestionList.innerHTML = questions.length
        ? questions.map((question) => `
            <article class="message-item" data-question-id="${escapeHtml(question.id)}">
              <strong>${escapeHtml(question.text || '')}</strong>
              <p class="small">질문 시각 · ${escapeHtml(formatDisplayTime(question.createdAt))}</p>
              <p class="small">현재 답변 · ${escapeHtml(question.answer || '아직 답변 전')}</p>
              <div class="field-full" style="margin-top: 12px;">
                <label>답변 입력</label>
                <textarea data-answer-input placeholder="예: 질문 감사합니다. 잠시 후 설명드리겠습니다.">${escapeHtml(question.answer || '')}</textarea>
              </div>
              <div class="dash-actions" style="margin-top: 12px;">
                <button class="btn btn-secondary" type="button" data-answer-submit>답변 보내기</button>
              </div>
            </article>
          `).join('')
        : '<div class="message-item"><p class="small">아직 public mode에서 도착한 질문이 없습니다.</p></div>';
    }
  }

  function updateModeUI() {
    els.body.dataset.mode = state.settings.mode;
    els.modeButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.modeBtn === state.settings.mode);
    });

    if (els.demoInputPanel) {
      els.demoInputPanel.hidden = state.settings.mode !== 'demo';
    }
  }

  function setPublicAuthorized(value) {
    state.publicAuthorized = Boolean(value);

    try {
      if (state.publicAuthorized) {
        sessionStorage.setItem(PUBLIC_ACCESS_KEY, 'true');
      } else {
        sessionStorage.removeItem(PUBLIC_ACCESS_KEY);
      }
    } catch (error) {
      // sessionStorage를 사용할 수 없는 환경이면 현재 세션 상태만 유지합니다.
    }
  }

  function setLectureAuthorized(value) {
    state.lectureAuthorized = Boolean(value);

    try {
      if (state.lectureAuthorized) {
        sessionStorage.setItem(LECTURE_ACCESS_KEY, 'true');
      } else {
        sessionStorage.removeItem(LECTURE_ACCESS_KEY);
      }
    } catch (error) {
      // sessionStorage를 사용할 수 없는 환경이면 현재 세션 상태만 유지합니다.
    }
  }

  function showLectureGate(visible, message = '비밀번호를 입력하거나 창을 닫고 public mode로 이동하십시오.', gateMode = 'public') {
    if (!els.lectureGate) {
      return;
    }

    state.pendingGateMode = gateMode;
    els.lectureGate.hidden = !visible;

    if (visible) {
      const isLectureGate = gateMode === 'lecture';
      if (els.lectureGateKicker) {
        els.lectureGateKicker.textContent = isLectureGate ? 'Lecture Access' : 'Public Access';
      }
      if (els.lectureGateDescription) {
        els.lectureGateDescription.textContent = isLectureGate
          ? 'Lecture mode로 들어가려면 비밀번호가 필요합니다.'
          : '처음 접속하면 public mode 비밀번호 입력 창이 먼저 표시됩니다.';
      }
      if (els.lectureGateSubmit) {
        els.lectureGateSubmit.textContent = isLectureGate ? 'Lecture mode 열기' : 'Public 시작하기';
      }
      if (els.lecturePasswordInput) {
        els.lecturePasswordInput.placeholder = isLectureGate ? 'lecture 비밀번호 입력' : 'public 비밀번호 입력';
      }
    }

    if (els.lecturePasswordMessage) {
      els.lecturePasswordMessage.textContent = message;
    }

    if (visible) {
      els.lecturePasswordInput?.focus();
      els.lecturePasswordInput?.select();
    } else if (els.lecturePasswordForm) {
      els.lecturePasswordForm.reset();
    }
  }

  function applyPageView(view) {
    const wantsLecture = view !== 'public';
    const resolvedView = wantsLecture && state.lectureAuthorized ? 'lecture' : 'public';

    state.settings.pageView = resolvedView;
    els.body.dataset.pageView = resolvedView;
    els.pageViewButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.viewBtn === resolvedView);
    });
  }

  function updateConfigFields() {
    if (els.dataSourceType) els.dataSourceType.value = state.settings.sourceType;
    if (els.dataSourceUrl) els.dataSourceUrl.value = state.settings.sourceUrl || '';
    if (els.formUrl) els.formUrl.value = state.settings.formUrl || '';
    if (els.supabaseKey) els.supabaseKey.value = state.settings.supabaseKey || '';
    if (els.supabaseTable) els.supabaseTable.value = state.settings.supabaseTable || 'pretotype_board_entries';
    if (els.supabaseQuestionsTable) els.supabaseQuestionsTable.value = state.settings.supabaseQuestionsTable || 'pretotype_questions';
    if (els.supabaseAnnouncementsTable) els.supabaseAnnouncementsTable.value = state.settings.supabaseAnnouncementsTable || 'pretotype_announcements';
    applyPageView(state.settings.pageView);
    updateModeUI();
    updateShareLinks();
    applyTheme(state.settings.theme);
  }

  function syncBrowserUrl() {
    if (typeof window === 'undefined' || !window.history?.replaceState || !/^https?:$/i.test(window.location.protocol)) {
      return;
    }

    const url = new URL(window.location.href);

    if (state.settings.pageView === 'public') {
      url.searchParams.set('view', 'public');
    } else {
      url.searchParams.delete('view');
    }

    window.history.replaceState({}, '', url.toString());
  }

  function saveSettings() {
    saveJsonStorage(SETTINGS_STORAGE_KEY, state.settings);
    syncBrowserUrl();
  }

  function manageAutoRefresh() {
    if (refreshTimer) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (state.settings.mode === 'live' && state.settings.sourceType !== 'demo' && state.settings.sourceUrl) {
      const interval = state.settings.sourceType === 'supabase' ? SUPABASE_LIVE_REFRESH_INTERVAL_MS : REFRESH_INTERVAL_MS;
      refreshTimer = window.setInterval(syncBoard, interval);
    }
  }

  function manageCommunicationRefresh() {
    if (communicationTimer) {
      window.clearInterval(communicationTimer);
      communicationTimer = null;
    }

    if (!isSupabaseConfigured()) {
      return;
    }

    communicationTimer = window.setInterval(syncCommunication, COMMUNICATION_REFRESH_INTERVAL_MS);
  }

  async function syncCommunication() {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const questionsAdapter = createQuestionsAdapter();
      const announcementsAdapter = createAnnouncementsAdapter();
      const [questions, latestAnnouncement] = await Promise.all([
        questionsAdapter.fetch({ limit: 60 }),
        announcementsAdapter.fetchLatest()
      ]);

      state.communication = {
        questions,
        lectureAnnouncement: latestAnnouncement
      };
      renderCommunication();
      maybeShowPublicAnnouncement();
    } catch (error) {
      if (els.publicStatus && state.settings.pageView === 'public') {
        setPublicStatus(error.message || 'Supabase 통신에 실패했습니다.', 'error');
      }
    }
  }

  async function syncBoard() {
    const adapter = createAdapter();
    setStatus('데이터를 불러오는 중입니다...', 'loading');

    try {
      const teams = await adapter.fetch();
      state.teams = teams;
      renderBoard(teams);
      setStatus(`보드 동기화 완료 · ${teams.length}개 팀 · ${state.settings.sourceType} adapter 사용 중`, 'ok');
      updateSyncMeta();
    } catch (error) {
      setStatus(error.message || '데이터를 불러오지 못했습니다.', 'error');
      updateSyncMeta('동기화 시도');
    }
  }

  async function handleDemoSubmit(event) {
    event.preventDefault();

    const formData = new FormData(els.teamForm);
    const adapter = state.settings.sourceType === 'supabase' ? createAdapter() : new DemoAdapter();

    await adapter.save({
      teamName: formData.get('teamName')?.toString().trim(),
      teamItem: formData.get('teamItem')?.toString().trim(),
      teamTarget: formData.get('teamTarget')?.toString().trim(),
      teamCTA: formData.get('teamCTA')?.toString().trim(),
      teamProblem: formData.get('teamProblem')?.toString().trim(),
      teamBudget: formData.get('teamBudget')?.toString().trim(),
      teamLinks: normalizeUrl(formData.get('teamLinks')?.toString().trim() || ''),
      createdAt: new Date().toISOString()
    });

    els.teamForm.reset();
    setStatus('Demo 데이터가 추가되었습니다.', 'ok');
    syncBoard();
    els.teamForm.querySelector('#teamName')?.focus();
  }

  async function handlePublicTeamSubmit(event) {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      setPublicStatus('Supabase 연결 후에만 제출할 수 있습니다. (Lecture mode에서 source=supabase + url + anon key 설정)', 'error');
      return;
    }

    const formData = new FormData(els.publicTeamForm);
    const adapter = createAdapter();

    try {
      await adapter.save({
        teamName: formData.get('teamName')?.toString().trim(),
        teamItem: formData.get('teamItem')?.toString().trim(),
        teamTarget: formData.get('teamTarget')?.toString().trim(),
        teamCTA: formData.get('teamCTA')?.toString().trim(),
        teamProblem: formData.get('teamProblem')?.toString().trim(),
        teamBudget: formData.get('teamBudget')?.toString().trim(),
        teamLinks: normalizeUrl(formData.get('teamLinks')?.toString().trim() || ''),
        createdAt: new Date().toISOString()
      });

      els.publicTeamForm.reset();
      setPublicStatus('제출이 완료되었습니다. 발표 보드에 반영됩니다.', 'ok');
    } catch (error) {
      setPublicStatus(error.message || '제출에 실패했습니다.', 'error');
    }
  }

  async function seedDemoData() {
    const adapter = new DemoAdapter();
    await adapter.seed(SAMPLE_TEAMS);
    setStatus('예시 데이터 2개를 불러왔습니다.', 'ok');
    syncBoard();
  }

  async function clearDemoData() {
    if (!window.confirm('Demo 보드를 초기화하시겠습니까?')) {
      return;
    }

    const adapter = new DemoAdapter();
    await adapter.clear();
    setStatus('Demo 보드를 비웠습니다.', 'ok');
    syncBoard();
  }

  function handlePageViewChange(view) {
    if (view === 'lecture' && !state.lectureAuthorized) {
      showLectureGate(true, 'Lecture mode에 들어가려면 비밀번호 990323을 입력하십시오.', 'lecture');
      setStatus('Lecture mode는 비밀번호 입력 후에만 열 수 있습니다.', 'loading');
      return;
    }

    if (view === 'public' && !state.publicAuthorized) {
      showLectureGate(true, 'Public mode 비밀번호 0330을 입력하거나 창을 닫으십시오.', 'public');
      setStatus('처음에는 public mode 비밀번호 입력 창이 먼저 표시됩니다.', 'loading');
      return;
    }

    showLectureGate(false);
    applyPageView(view);
    saveSettings();
    updateShareLinks();
    setStatus(
      state.settings.pageView === 'public'
        ? 'Public landing mode로 전환되었습니다. 참가자용 최소 화면만 표시합니다.'
        : 'Lecture mode로 전환되었습니다. 강연용 섹션과 스크립트를 모두 표시합니다.',
      'ok'
    );
  }

  function handleModeChange(mode) {
    state.settings.mode = mode === 'live' ? 'live' : 'demo';
    saveSettings();
    updateModeUI();
    updateShareLinks();
    manageAutoRefresh();
    setStatus(
      state.settings.mode === 'live'
        ? 'Live mode가 켜졌습니다. JSON / Google Sheets / Supabase 응답을 읽어 발표 보드를 갱신합니다.'
        : 'Demo mode가 켜졌습니다. 내장 폼으로 테스트할 수 있습니다.',
      'ok'
    );
    syncBoard();
  }

  function applySourceConfig() {
    state.settings.sourceType = els.dataSourceType.value;
    state.settings.sourceUrl = normalizeUrl(els.dataSourceUrl.value);
    state.settings.formUrl = normalizeUrl(els.formUrl.value);
    state.settings.supabaseKey = els.supabaseKey?.value?.trim() || '';
    state.settings.supabaseTable = els.supabaseTable?.value?.trim() || 'pretotype_board_entries';
    state.settings.supabaseQuestionsTable = els.supabaseQuestionsTable?.value?.trim() || 'pretotype_questions';
    state.settings.supabaseAnnouncementsTable = els.supabaseAnnouncementsTable?.value?.trim() || 'pretotype_announcements';
    saveSettings();
    updateShareLinks();
    manageAutoRefresh();
    manageCommunicationRefresh();
    syncBoard();
    syncCommunication();
  }

  async function copyTextToClipboard(text) {
    if (!text) {
      return false;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fallback으로 진행합니다.
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      return copied;
    } catch (error) {
      return false;
    }
  }

  async function handlePublicQuestionSubmit(event) {
    event.preventDefault();

    const text = els.publicQuestionInput?.value?.trim() || '';
    if (!text) {
      setStatus('질문 내용을 입력하십시오.', 'error');
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const adapter = createQuestionsAdapter();
        await adapter.create(text);
        await syncCommunication();
        els.publicQuestionForm?.reset();
        setPublicStatus('질문이 lecture mode로 전달되었습니다.', 'ok');
      } catch (error) {
        setPublicStatus(error.message || '질문 전송에 실패했습니다.', 'error');
      }
      return;
    }

    const nextCommunication = {
      ...state.communication,
      questions: [
        {
          id: createMessageId('question'),
          text,
          answer: '',
          createdAt: new Date().toISOString()
        },
        ...(state.communication?.questions || [])
      ]
    };

    saveCommunicationState(nextCommunication);
    els.publicQuestionForm?.reset();
    setStatus('질문이 lecture mode로 전달되었습니다.', 'ok');
  }

  async function handleLectureBroadcastSubmit(event) {
    event.preventDefault();

    const text = els.lectureBroadcastInput?.value?.trim() || '';
    if (!text) {
      setStatus('보낼 메시지를 입력하십시오.', 'error');
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const adapter = createAnnouncementsAdapter();
        await adapter.create(text);
        setAnnouncementSeen('');
        await syncCommunication();
        els.lectureBroadcastForm?.reset();
        setStatus('Public mode에 팝업 메시지를 전달했습니다.', 'ok');
      } catch (error) {
        setStatus(error.message || '팝업 전송에 실패했습니다.', 'error');
      }
      return;
    }

    const nextCommunication = {
      ...state.communication,
      lectureAnnouncement: {
        id: createMessageId('announcement'),
        text,
        createdAt: new Date().toISOString()
      }
    };

    setAnnouncementSeen('');
    saveCommunicationState(nextCommunication);
    els.lectureBroadcastForm?.reset();
    setStatus('Public mode에 팝업 메시지를 전달했습니다.', 'ok');
  }

  function handleLectureQuestionListClick(event) {
    const answerButton = event.target.closest('[data-answer-submit]');
    if (!answerButton) {
      return;
    }

    const questionItem = answerButton.closest('[data-question-id]');
    const questionId = questionItem?.dataset.questionId;
    const answerInput = questionItem?.querySelector('[data-answer-input]');
    const answer = answerInput?.value?.trim() || '';

    if (!questionId || !answer) {
      setStatus('답변 내용을 입력하십시오.', 'error');
      return;
    }

    if (isSupabaseConfigured()) {
      const save = async () => {
        const adapter = createQuestionsAdapter();
        await adapter.answer(questionId, answer);
        await syncCommunication();
        setStatus('답변이 public mode에 전달되었습니다.', 'ok');
      };

      save().catch((error) => setStatus(error.message || '답변 저장에 실패했습니다.', 'error'));
      return;
    }

    const nextCommunication = {
      ...state.communication,
      questions: (state.communication?.questions || []).map((question) => (
        question.id === questionId
          ? { ...question, answer, answeredAt: new Date().toISOString() }
          : question
      ))
    };

    saveCommunicationState(nextCommunication);
    setStatus('답변이 public mode에 전달되었습니다.', 'ok');
  }

  async function copyFormLink() {
    const safeUrl = normalizeUrl(state.settings.formUrl);
    if (!safeUrl) {
      setStatus('먼저 Tally 또는 Google Form 링크를 입력하십시오.', 'error');
      return;
    }

    const copied = await copyTextToClipboard(safeUrl);
    setStatus(
      copied ? '학생 입력 링크를 복사했습니다.' : '복사에 실패했습니다. 링크를 길게 눌러 복사하십시오.',
      copied ? 'ok' : 'error'
    );
  }

  async function copyBoardLink() {
    const boardUrl = detectBoardUrl();
    if (!boardUrl) {
      setStatus('현재는 배포 URL을 감지할 수 없어 발표 보드 링크를 만들 수 없습니다.', 'error');
      return;
    }

    const copied = await copyTextToClipboard(boardUrl);
    setStatus(
      copied ? '발표 보드 링크를 복사했습니다.' : '복사에 실패했습니다. 주소창 URL을 직접 복사하십시오.',
      copied ? 'ok' : 'error'
    );
  }

  async function handleLecturePasswordSubmit(event) {
    event.preventDefault();

    const enteredPassword = els.lecturePasswordInput?.value?.trim() || '';

    if (state.pendingGateMode === 'public') {
      if (enteredPassword !== PUBLIC_PASSWORD) {
        showLectureGate(true, '비밀번호가 올바르지 않습니다. public 비밀번호 0330을 다시 입력하거나 창을 닫으십시오.', 'public');
        setStatus('Public mode 비밀번호가 일치하지 않습니다.', 'error');
        return;
      }

      setPublicAuthorized(true);
      showLectureGate(false);
      applyPageView('public');
      saveSettings();
      updateShareLinks();
      setStatus('Public mode 입장이 승인되었습니다.', 'ok');
      return;
    }

    if (enteredPassword !== LECTURE_PASSWORD) {
      showLectureGate(true, '비밀번호가 올바르지 않습니다. lecture 비밀번호 990323을 다시 입력하십시오.', 'lecture');
      setStatus('Lecture mode 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setLectureAuthorized(true);
    showLectureGate(false);
    applyPageView('lecture');
    saveSettings();
    updateShareLinks();
    setStatus('Lecture mode 잠금이 해제되었습니다.', 'ok');
  }

  function bindEvents() {
    els.teamForm?.addEventListener('submit', handleDemoSubmit);
    els.publicTeamForm?.addEventListener('submit', handlePublicTeamSubmit);
    els.publicQuestionForm?.addEventListener('submit', handlePublicQuestionSubmit);
    els.lectureBroadcastForm?.addEventListener('submit', handleLectureBroadcastSubmit);
    els.lectureQuestionList?.addEventListener('click', handleLectureQuestionListClick);
    els.loadSamples?.addEventListener('click', seedDemoData);
    els.clearBoard?.addEventListener('click', clearDemoData);
    els.applySourceConfig?.addEventListener('click', applySourceConfig);
    els.refreshBoard?.addEventListener('click', syncBoard);
    els.copyFormLink?.addEventListener('click', copyFormLink);
    els.copyBoardLink?.addEventListener('click', copyBoardLink);
    els.closePublicMessagePopup?.addEventListener('click', hidePublicAnnouncement);
    els.lecturePasswordForm?.addEventListener('submit', handleLecturePasswordSubmit);
    els.cancelLectureAccess?.addEventListener('click', () => {
      if (state.pendingGateMode === 'public') {
        setPublicAuthorized(true);
      }
      showLectureGate(false);
      applyPageView('public');
      saveSettings();
      updateShareLinks();
      setStatus('팝업을 닫고 public mode 페이지로 이동했습니다.', 'ok');
    });
    els.themeToggle?.addEventListener('click', () => {
      applyTheme(state.settings.theme === 'light' ? 'dark' : 'light');
      updateShareLinks();
      saveSettings();
    });

    els.modeButtons.forEach((button) => {
      button.addEventListener('click', () => handleModeChange(button.dataset.modeBtn));
    });

    els.pageViewButtons.forEach((button) => {
      button.addEventListener('click', () => handlePageViewChange(button.dataset.viewBtn));
    });

    window.addEventListener('storage', (event) => {
      if (event.key === COMMUNICATION_STORAGE_KEY) {
        state.communication = readJsonStorage(COMMUNICATION_STORAGE_KEY, { questions: [], lectureAnnouncement: null });
        renderCommunication();
        maybeShowPublicAnnouncement();
      }

      if (event.key === BOARD_STORAGE_KEY || event.key === SETTINGS_STORAGE_KEY) {
        state.settings = {
          ...defaultSettings,
          ...readJsonStorage(SETTINGS_STORAGE_KEY, {}),
          ...getQueryOverrides()
        };
        updateConfigFields();
        manageAutoRefresh();
        manageCommunicationRefresh();
        syncBoard();
        syncCommunication();
      }
    });
  }

  function init() {
    state.settings.pageView = 'public';

    if (isSupabaseConfigured()) {
      state.settings.mode = 'live';
    }

    if (!state.publicAuthorized) {
      showLectureGate(true, 'Public mode 비밀번호 0330을 입력하거나 창을 닫으십시오.', 'public');
    } else {
      showLectureGate(false);
    }

    updateConfigFields();
    bindEvents();
    renderCommunication();
    maybeShowPublicAnnouncement();
    manageAutoRefresh();
    manageCommunicationRefresh();

    if (!readJsonStorage(BOARD_STORAGE_KEY, []).length) {
      saveJsonStorage(BOARD_STORAGE_KEY, SAMPLE_TEAMS);
    }

    syncBoard();
    syncCommunication();
  }

  init();
})();
