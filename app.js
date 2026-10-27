// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 일정은 Supabase 표 wx_tasks 에 저장 (연결 정보는 config.js, 표 만들기는 setup.sql)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// 표에서 일정을 읽음 (실패하면 안내 문구를 보이고 빈 목록)
async function loadTasks() {
  const { data, error } = await db.from('wx_tasks')
    .select('title, region, kind, owner').order('id');
  if (error) {
    tasks = [];
    document.getElementById('msgBox').textContent = '일정을 불러오지 못했습니다 (' + error.message + ')';
    return;
  }
  tasks = data;
}

function weatherText(w) {
  return w ? w.tempMax + '℃ · ' + w.windMax + 'm/s · ' + w.rainProb + '%' : '-';
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const msg = document.getElementById('msgBox');
  const { error } = await db.from('wx_tasks').insert(t);
  if (error) {
    msg.textContent = '일정을 저장하지 못했습니다 (' + error.message + ')';
    return;
  }
  msg.textContent = '';
  form.reset();
  await loadTasks();
  renderTasks();
}

// 지역별 날씨를 받아 목록을 다시 그림 (실패해도 목록은 그대로 보임)
async function loadWeather() {
  const box = document.getElementById('weatherBox');
  try {
    const res = await fetch(buildWeatherUrl());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    weatherByRegion = parseWeather(await res.json());
    // 시험용 : 주소 끝에 ?test=wind 를 붙이면 풍속을 12로 바꿈
    if (new URLSearchParams(location.search).get('test') === 'wind') {
      for (const name in weatherByRegion) weatherByRegion[name].windMax = 12;
    }
    box.textContent = Object.keys(weatherByRegion).length
      ? '오늘 날씨 (최고 기온 · 최대 풍속 · 강수확률)' : '날씨 정보를 해석하지 못했습니다';
  } catch (err) {
    weatherByRegion = {};
    box.textContent = '날씨를 불러오지 못했습니다 (' + err.message + ')';
  }
  renderTasks();
}

document.getElementById('taskForm').addEventListener('submit', addTask);
loadTasks().then(renderTasks);
loadWeather();
