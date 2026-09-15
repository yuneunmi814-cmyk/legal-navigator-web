(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('ask-form'), input = $('ask-input'), send = $('ask-send');
  const log = $('conversation'), option = $('ai-interview');
  let turns = [], topic = '', finished = false, busy = false, active, generation = 0;
  const node = (tag, cls, text) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  };
  const link = (label, url, cls = 'result-link') => {
    const a = node('a', cls, label);
    try {
      const parsed = new URL(url, location.origin);
      if (!['https:', 'http:', 'tel:'].includes(parsed.protocol)) return node('span', cls, label);
      a.href = parsed.href;
      if (parsed.origin !== location.origin && parsed.protocol !== 'tel:') {
        a.target = '_blank'; a.rel = 'noopener noreferrer';
      }
    } catch { return node('span', cls, label); }
    return a;
  };
  const unclip = (text, full) => {
    const t = String(text || '');
    if (!full || !/(…|\.\.\.)/.test(t)) return t;
    const head = t.replace(/^[^가-힣A-Za-z0-9]+/, '').slice(0, 8);
    return head && full.includes(head) ? full : t;
  };
  // Remove tool-call notation, keeping the surrounding source wording intact.
  const readable = text => String(text || '').replace(/\((?:calculate_deadline|get_form_template|get_procedure|get_checklist|check_crime|search_topics):[^)]*\)/g, '').replace(/^[✅🏛️⚖️⏰📞★]+\s*/u, '');
  function cardView(card, full = {}) {
    const box = node('article', 'answer-card');
    let stepsShown = false;
    const children = card.type === 'ListView' ? (card.items || card.children || []).flatMap(item => item.children || []) : (card.children || []);
    for (const c of children) {
      if (c.type === 'Title') box.append(node('h2', '', c.value));
      else if (c.type === 'Caption') box.append(node('p', 'answer-caption', readable(unclip(c.value, full.laws))));
      else if (c.type === 'Text') {
        if ((/^•/.test(c.value) || /^\d+\./.test(c.value)) && full.steps?.length) {
          if (!stepsShown) {
            const steps = node('ol', 'procedure-steps');
            for (const step of full.steps) steps.append(node('li', '', readable(step).replace(/^\d+(?:-[a-z])?\)\s*/, '')));
            box.append(steps); stepsShown = true;
          }
        } else box.append(node('p', c.size === 'sm' ? (/^⏰/.test(c.value) ? 'deadline-text' : '') : 'answer-heading', readable(c.value)));
      }
      else if (c.type === 'Divider') box.append(node('hr'));
      else if (c.type === 'Row') {
        const row = node('div', 'answer-badges');
        for (const badge of c.children || []) {
          if (badge.type !== 'Badge') { row.append(cardView({children:[badge]})); continue; }
          if (badge.type === 'Badge') row.append(node('span', `answer-badge${badge.color === 'danger' ? ' urgent' : ''}`, unclip(badge.label, badge.color === 'danger' ? full.deadline : '')));
        }
        box.append(row);
      } else if (c.type === 'Col') { box.append(cardView(c));
      } else if (c.type === 'Markdown') { box.append(node('p', '', readable(c.value)));
      } else if (c.type === 'Button') {
        const url = c.onClickAction?.payload?.target?.url;
        if (url) box.append(link(readable(c.label), url));
      }
    }
    return box;
  }
  function showForms() {
    $('forms').scrollIntoView({ block: 'start' });
    $('q').focus({ preventScroll: true });
  }
  function setStage(stage) {
    const n = stage === 'prepare' ? 2 : ['need','date'].includes(stage) ? 1 : 0;
    [...$('guide-progress').children].forEach((el,i) => { if(i === n) el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current'); el.classList.toggle('complete',i<n); });
  }
  function inlineForm(key, parent) {
    const known = [...document.querySelectorAll('#flist .fitem')].find(el=>el.dataset.k===key);
    if (!known || parent.querySelector('iframe')) return;
    const frame = node('iframe','inline-form'); frame.title=known.dataset.t+' 작성'; frame.src=known.getAttribute('href')+'#save';
    const close=node('button','chip','서식 접기');close.type='button'; close.addEventListener('click',()=>{frame.hidden=!frame.hidden;close.textContent=frame.hidden?'작성 중인 서식 펼치기':'서식 접기';});
    parent.append(close,link('별도 창에서 크게 작성하기 ↗',known.getAttribute('href')),frame); frame.scrollIntoView({block:'start'});
  }
  function resultView(data) {
    const fragment = document.createDocumentFragment();
    if (data.stage) setStage(data.stage);
    if (data.reply) fragment.append(node('p', 'reply-text', data.reply));
    if (data.empty) {
      fragment.append(node('p', 'reply-text', data.message || '관련 절차를 찾지 못했습니다. 상대방과 일어난 일을 조금 더 구체적으로 적어주세요.'));
      const examples = node('div', 'related-topics');
      for (const example of data.examples || []) {
        const b = node('button', '', example); b.type = 'button';
        b.addEventListener('click', () => startExample(example)); examples.append(b);
      }
      fragment.append(examples);
    }
    if (data.card || (data.forms || []).length) {
      const layout = node('div', 'result-layout');
      if (data.card) layout.append(cardView(data.card, data.full || {}));
      else { const text = node('article', 'answer-card'); text.append(node('h2', '', '찾은 서식을 확인해 보세요'), node('p', '', '상황에 맞는 서식인지 설명을 읽고 선택해 주세요.')); layout.append(text); }
      const aside = node('aside', 'result-aside');
      if (data.full?.authority) { aside.append(node('h3', '', '어디에 제출하나요?'), node('p', '', readable(data.full.authority))); }
      if (data.full?.evidence && !data.evidence) { aside.append(node('h3', '', '미리 모아둘 자료'), node('p', '', readable(data.full.evidence))); }
      aside.append(node('h3', '', '관련 서식'));
      let found = 0;
      for (const f of data.forms || []) {
        // Only link to files that are actually published in this site's catalog.
        const known = [...document.querySelectorAll('#flist .fitem')].find(el => el.dataset.k === f.key);
        if (!known) continue;
        const a = link(known.dataset.t, known.getAttribute('href') + '#save');
        if (f.desc) a.append(node('small', '', f.desc));
        aside.append(a); found++;
      }
      if (!found) aside.append(node('p', '', '이 안내에 연결된 서식은 아직 없습니다. 필요한 서식은 전체 목록에서 찾아보세요.'));
      const browse = link('서식 전체에서 찾기 →', '#forms');
      browse.addEventListener('click', e => { e.preventDefault(); showForms(); }); aside.append(browse);
      aside.append(link('받은 서류 확인하기 →', '/절차/'));
      aside.append(link('사건 경위·증거 목록 작성하기 →', '/절차/작성.html'));
      aside.append(node('p', '', '작성 도우미는 기기 안에서만 작동합니다. 이 대화는 자동으로 옮기지 않습니다.'));
      layout.append(aside); fragment.append(layout);
    }
    for (const [key, label] of [['evidence', '준비할 자료'], ['submit', '제출 전 확인']]) {
      if (!data[key]?.length) continue;
      const section = node('div', 'reply-text'); section.append(node('strong', '', label));
      const items = Array.isArray(data[key]) ? data[key] : [data[key]];
      items.forEach(item => section.append(node('p', '', String(item)))); fragment.append(section);
    }
    if ((data.topics || []).length) {
      const related = node('div', 'related-topics'); related.append(node('h3', '', '상황이 다르다면'));
      for (const t of data.topics) {
        const label = t.label.replace(/^\[[^\]]+\]\s*/, '');
        const b = node('button', '', label); b.type = 'button'; b.addEventListener('click', () => startExample(label)); related.append(b);
      }
      fragment.append(related);
    }
    if (data.widgets?.length) {
      const cards=node('section','tool-cards'); cards.setAttribute('aria-label','MCP 위젯 카드');
      for (const widget of data.widgets) {
        const group=node('div','tool-card');group.append(node('p','tool-label',({form:'서식 카드',checklist:'준비 자료 카드',deadline:'기한 계산 카드',submission:'제출처 카드'})[widget.kind]||'안내 카드'));
        if(widget.card) group.append(cardView(widget.card));
        else if(widget.text) group.append(node('p','reply-text',widget.text));
        if(widget.kind==='form') {
          const known=[...document.querySelectorAll('#flist .fitem')].find(el=>el.dataset.k===widget.key);
          if(known) {
            const open=node('button','open-form','대화 안에서 서식 작성하기');open.type='button';open.addEventListener('click',()=>inlineForm(widget.key,group));group.append(open);
            // The MCP's preview button opens the same published form inside the conversation.
            const preview=[...group.querySelectorAll('a')].find(a=>/빈칸.*채우기/.test(a.textContent));
            if(preview) preview.addEventListener('click',e=>{e.preventDefault();inlineForm(widget.key,group);});
          }
        }
        cards.append(group);
      }
      fragment.append(cards);
      if(data.goal==='forms' || data.goal==='deadline') { const first=fragment.firstChild; if(first!==cards) first.after(cards); }
    }
    if (data.datePrompt) {
      const dates=node('form','date-prompt'); const label=node('label','','기산 기준일');const date=node('input');date.type='date';date.required=true;label.append(date);dates.append(node('p','',data.deadlineNote),label);
      const calculate=node('button','open-form','이 날짜로 기한 계산');calculate.type='submit';dates.append(calculate);
      dates.addEventListener('submit',e=>{e.preventDefault();if(busy)return;ask('기준일: '+date.value,{payload:{...data.context,stage:'finish',goal:'deadline',date:date.value},route:'guide',append:true});});fragment.append(dates);
    }
    if(data.choices?.length || data.answerChoices?.length) {
      const choices=node('div','guided-choices');
      for(const choice of data.choices || []) {
        const button=node('button','choice-button',choice.label);button.type='button';
        button.addEventListener('click',()=>{if(busy)return;choices.querySelectorAll('button').forEach(b=>b.disabled=true);ask(choice.label,{payload:{...data.context,...choice},route:'guide',append:true});});choices.append(button);
      }
      for(const label of data.answerChoices || []) {
        const button=node('button','choice-button',label);button.type='button';button.addEventListener('click',()=>{if(busy)return;input.value=label;form.requestSubmit();choices.querySelectorAll('button').forEach(b=>b.disabled=true);});choices.append(button);
      }
      fragment.append(choices);
    }
    if (data.fellBack) fragment.append(node('p', 'answer-note', '지금은 AI 문답을 이용할 수 없어, 수록된 절차 안내로 보여드립니다.'));
    if (data.card || data.empty || data.forms?.length) fragment.append(node('p', 'answer-note', '일반적인 절차 안내입니다. 실제 기한·제출 요건은 받은 서류와 담당 기관에서 확인하세요. 개별 사건 상담은 대한법률구조공단 132.'));
    return fragment;
  }
  function setBusy(value) {
    busy = value; send.disabled = value; input.disabled = value; option.disabled = value || turns.length > 0;
    form.setAttribute('aria-busy', String(value));
    document.querySelectorAll('[data-example]').forEach(b => b.disabled = value);
  }
  function reset() {
    setStage('situation'); generation++; active?.abort(); turns = []; topic = ''; finished = false;
    log.replaceChildren(); log.hidden = true; $('workspace-top').hidden = true;
    document.body.classList.remove('work-started'); setBusy(false);
    input.value = ''; input.placeholder = '예) 외주 작업을 끝냈는데 잔금을 안 줍니다';
    $('composer-label').textContent = '겪으신 일을 편하게 적어주세요';
  }
  function startExample(text) {
    if (busy) return;
    reset(); input.value = text; form.requestSubmit();
    document.querySelector('.workspace').scrollIntoView({ block: 'start' });
  }
  async function ask(question, retry = null) {
    if (busy) return;
    const seq = generation;
    if (finished) { turns = []; topic = ''; finished = false; }
    const interview = option.checked;
    const nextTurns = retry?.turns || [...turns, { role: 'user', text: question }];
    const payload = retry?.payload || (interview ? { messages: nextTurns, topic } : { q: question, stage:'start' });
    const route = retry?.route || (interview ? 'chat' : 'guide');
    document.body.classList.add('work-started'); log.hidden = false; $('workspace-top').hidden = false;
    if (!retry || retry.append) log.append(node('p', 'user-question', question));
    const status = node('div', 'request-status', '관련 절차와 서식을 찾고 있습니다.'); status.setAttribute('role', 'status'); log.append(status);
    log.querySelectorAll('.guided-choices button').forEach(b=>b.disabled=true);
    setBusy(true); const controller = new AbortController(); active = controller; const timer = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch(`/api/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new Error('server');
      const data = await response.json();
      if (data.error) throw new Error('server');
      if (seq !== generation) return;
      if (!data.card && !data.reply && !data.empty && !data.forms?.length && !data.widgets?.length) throw new Error('empty response');
      const answer = node('div', 'answer-turn'); answer.append(resultView(data));
      status.replaceWith(answer); answer.scrollIntoView({ block: 'start' });
      turns = nextTurns; if (data.reply) turns.push({ role: 'bot', text: data.reply });
      topic = data.topic || topic; finished = route === 'ask' || !!data.done || !!data.fellBack || !!data.empty || !!data.noTopic;
      input.value = ''; input.placeholder = finished ? '다른 상황도 물어보세요' : (route === 'guide' ? '위 선택지를 누르거나 새로운 상황을 적어주세요' : '위 질문에 답해주세요');
      $('composer-label').textContent = finished ? '새로운 상황을 입력하면 다시 찾아드립니다' : '답할 수 있는 내용만 적어주세요';
    } catch (error) {
      if (seq !== generation) return;
      status.classList.add('error'); status.setAttribute('role', 'alert');
      status.textContent = error.name === 'AbortError' ? '응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.' : '안내 서버에 연결하지 못했습니다. 다시 시도하거나 아래 서식 검색을 이용해 주세요.';
      const retryButton = node('button', '', '다시 시도'); retryButton.type = 'button';
      retryButton.addEventListener('click', () => { if (busy) return; status.remove(); ask(question, { payload, route, turns: nextTurns }); });
      status.append(retryButton); status.append(link('서식 찾아보기 →', '#forms'));
      status.scrollIntoView({ block: 'start' });
    } finally {
      clearTimeout(timer); if (seq === generation) setBusy(false);
    }
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); const text = input.value.trim();
    if (text.length < 2) { input.setCustomValidity('상황을 두 글자 이상 적어주세요.'); input.reportValidity(); return; }
    ask(text);
  });
  input.addEventListener('input', () => input.setCustomValidity(''));
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  document.querySelectorAll('[data-example]').forEach(b => b.addEventListener('click', () => startExample(b.dataset.example)));
  $('restart').addEventListener('click', () => { reset(); input.focus(); });
  fetch('/api/caps', { signal: AbortSignal.timeout(6000) }).then(r => r.ok ? r.json() : null).then(c => { $('interview-option').hidden = !c?.interview; }).catch(() => {});
})();
