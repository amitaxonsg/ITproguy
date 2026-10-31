const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '—');
const date = value => value ? new Date(Number(value)).toLocaleString() : '—';
const money = (amount, currency = 'usd') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: String(currency || 'usd').toUpperCase()
  }).format((Number(amount) || 0) / 100);

function renderTable(target, headers, records, pick) {
  const host = $(target);
  host.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No records yet.';
    host.append(empty);
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headerRow.append(th);
  });
  head.append(headerRow);
  table.append(head);
  const body = document.createElement('tbody');
  records.forEach(record => {
    const tr = document.createElement('tr');
    pick(record).forEach(value => {
      const td = document.createElement('td');
      if (value && typeof value === 'object' && value.href) {
        if (String(value.href).startsWith('https://')) {
          const a = document.createElement('a');
          a.href = value.href;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = value.label;
          td.append(a);
        } else td.textContent = '—';
      } else td.textContent = esc(value);
      tr.append(td);
    });
    body.append(tr);
  });
  table.append(body);
  wrap.append(table);
  host.append(wrap);
}

function renderMetrics(totals, usageCount) {
  const metrics = [
    ['Accounts', totals.users],
    ['Recorded purchases', totals.purchases],
    ['Pending requests', totals.pendingRequests],
    ['Recent usage records', usageCount]
  ];
  $('#metrics').replaceChildren();
  metrics.forEach(([label, value]) => {
    const card = document.createElement('div');
    card.className = 'metric';
    const title = document.createElement('span');
    title.textContent = label;
    const count = document.createElement('strong');
    count.textContent = String(value ?? 0);
    card.append(title, count);
    $('#metrics').append(card);
  });
}

function renderUsers(records) {
  const host = $('#users');
  host.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No accounts yet.';
    host.append(empty);
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  const head = document.createElement('thead');
  const header = document.createElement('tr');
  ['Email', 'Name', 'Created', 'Last sign-in', 'Trial minutes', 'Account status', 'Update'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    header.append(th);
  });
  head.append(header);
  table.append(head);
  const body = document.createElement('tbody');
  records.forEach(account => {
    const row = document.createElement('tr');
    [account.email, account.name || '—', date(account.created_at), date(account.last_login),
      Math.floor((Number(account.trial_seconds) || 0) / 60)].forEach(value => {
      const td = document.createElement('td');
      td.textContent = esc(value);
      row.append(td);
    });
    const statusCell = document.createElement('td');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Account status for ' + account.email);
    ['active', 'under_review', 'suspended'].forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status.replaceAll('_', ' ');
      option.selected = status === (account.account_status || 'active');
      select.append(option);
    });
    statusCell.append(select);
    row.append(statusCell);
    const actionCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'action-button';
    button.textContent = 'Save';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const response = await fetch('/api/admin/account-status', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: account.id, status: select.value })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Account status could not be updated.');
        await load();
      } catch (error) {
        showError(error.message);
        button.disabled = false;
      }
    });
    actionCell.append(button);
    row.append(actionCell);
    body.append(row);
  });
  table.append(body);
  wrap.append(table);
  host.append(wrap);
}

function renderRequests(records) {
  const host = $('#requests');
  host.replaceChildren();
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No review requests yet.';
    host.append(empty);
    return;
  }
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'data-table';
  const head = document.createElement('thead');
  const header = document.createElement('tr');
  ['Account', 'Type', 'Reason', 'Details', 'Status', 'Created', 'Update'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    header.append(th);
  });
  head.append(header);
  table.append(head);
  const body = document.createElement('tbody');
  records.forEach(item => {
    const row = document.createElement('tr');
    [item.email, item.kind, item.reason, item.details, item.status, date(item.created_at)].forEach(text => {
      const td = document.createElement('td');
      td.textContent = esc(text);
      row.append(td);
    });
    const actionCell = document.createElement('td');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'New status for request ' + item.id);
    ['pending', 'reviewed', 'approved', 'declined'].forEach(status => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      option.selected = status === item.status;
      select.append(option);
    });
    const button = document.createElement('button');
    button.className = 'action-button';
    button.textContent = 'Save';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const response = await fetch('/api/admin/request-status', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, status: select.value })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Status could not be updated.');
        await load();
      } catch (error) {
        showError(error.message);
        button.disabled = false;
      }
    });
    actionCell.append(select, document.createTextNode(' '), button);
    row.append(actionCell);
    body.append(row);
  });
  table.append(body);
  wrap.append(table);
  host.append(wrap);
}

function showError(message) {
  const error = $('#error');
  error.textContent = message;
  error.style.display = 'block';
}

async function load() {
  $('#error').style.display = 'none';
  try {
    const sessionResponse = await fetch('/api/session', { credentials: 'same-origin' });
    const session = await sessionResponse.json();
    if (!session.user) {
      $('#notice').textContent = 'Sign in with your administrator account to continue.';
      return;
    }
    if (String(session.user.email || '').toLowerCase() !== 'amit@axon.com.sg') {
      $('#notice').textContent = 'This account does not have administrator access.';
      return;
    }
    const response = await fetch('/api/admin/overview', { credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load admin records.');
    $('#notice').hidden = true;
    $('#console').hidden = false;
    renderMetrics(data.totals || {}, (data.usage || []).length);
    renderUsers(data.users || []);
    renderTable('#purchases', ['Account', 'Amount', 'Credit hours', 'Remaining hours', 'Status', 'Expires', 'Receipt'],
      data.purchases || [], x => [x.email, money(x.amount_cents, x.currency), (Number(x.seconds) || 0) / 3600,
        ((Number(x.remaining_seconds) || 0) / 3600).toFixed(2), x.status, date(x.expires),
        x.receipt_url ? { label: 'Open receipt ↗', href: x.receipt_url } : '—']);
    renderTable('#usage', ['Account', 'Time', 'Model', 'Duration', 'Result', 'Input tokens', 'Output tokens'],
      data.usage || [], x => [x.email, date(x.at), x.model, (Number(x.seconds) || 0) + ' sec', x.status, x.input_tokens || 0, x.output_tokens || 0]);
    renderTable('#logins', ['Account', 'Provider', 'Time'],
      data.logins || [], x => [x.email, x.provider, date(x.at)]);
    renderRequests(data.requests || []);
    renderTable('#audit', ['Actor', 'Action', 'Target', 'Time'],
      data.audit || [], x => [x.actor_email, x.action, x.target_id || '—', date(x.at)]);
  } catch (error) {
    showError(error.message);
  }
}

load();
