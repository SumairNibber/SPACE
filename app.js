const LOCAL_STORAGE_PRIMARY_KEY = "space-mentor-tracker:v2";
const LOCAL_STORAGE_FALLBACK_KEYS = [LOCAL_STORAGE_PRIMARY_KEY, "space-mentor-tracker:v1"];

const DEFAULT_COHORT = [
  "Samuel Puhachevsky",
  "Nicolette Penaranda Roy",
  "Zoe Chen",
  "Laetitia Saran-Hafner",
  "Ananya Gandikota",
  "Matthew Gill",
  "Noelle Tadross",
  "Jillian Chinchillo",
  "Richie Li",
  "Valerie Rey",
  "Nikki Sanghvi",
  "Summer Hsia",
  "Sara Glusman",
  "Isabella Li",
  "Nico Smith",
];

const DEFAULT_MENTORS = [
  "Olivia",
  "Charles",
  "Ann",
  "Julia",
  "Devin",
  "Phillip",
  "Tanmay",
  "Evan",
  "Sumair",
];

const DEFAULT_CASES = [];

const elements = {};
let state = buildDefaultState();
let storageProvider = null;
let autoRefreshHandle = null;
let lastSyncAt = null;

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
  cacheElements();
  bindEvents();
  storageProvider = createStorageProvider();
  renderStorageStatus();
  await syncFromStorage({ announce: false });
  startAutoRefresh();
}

function cacheElements() {
  elements.tabButtons = Array.from(document.querySelectorAll(".tab-button"));
  elements.panels = Array.from(document.querySelectorAll(".panel"));

  elements.storageMode = document.getElementById("storage-mode");
  elements.storageDetail = document.getElementById("storage-detail");
  elements.storageNote = document.getElementById("storage-note");

  elements.refreshData = document.getElementById("refresh-data");
  elements.exportData = document.getElementById("export-data");
  elements.importData = document.getElementById("import-data");

  elements.summaryCohort = document.getElementById("summary-cohort");
  elements.summaryUncased = document.getElementById("summary-uncased");
  elements.summarySessions = document.getElementById("summary-sessions");
  elements.summaryMostActive = document.getElementById("summary-most-active");
  elements.summaryCases = document.getElementById("summary-cases");
  elements.summaryCaseCoverage = document.getElementById("summary-case-coverage");
  elements.summaryReached = document.getElementById("summary-reached");
  elements.summaryLastSession = document.getElementById("summary-last-session");

  elements.sessionForm = document.getElementById("session-form");
  elements.sessionDate = document.getElementById("session-date");
  elements.sessionMentor = document.getElementById("session-mentor");
  elements.sessionStudent = document.getElementById("session-student");
  elements.sessionCase = document.getElementById("session-case");
  elements.sessionCustomCase = document.getElementById("session-custom-case");
  elements.sessionAddCase = document.getElementById("session-add-case");
  elements.sessionNotes = document.getElementById("session-notes");
  elements.sessionStatus = document.getElementById("session-status");
  elements.sessionFilter = document.getElementById("session-filter");
  elements.sessionTableBody = document.getElementById("session-table-body");
  elements.uncasedList = document.getElementById("uncased-list");
  elements.mentorSummaryBody = document.getElementById("mentor-summary-body");

  elements.cohortSearch = document.getElementById("cohort-search");
  elements.cohortTableBody = document.getElementById("cohort-table-body");
  elements.studentForm = document.getElementById("student-form");
  elements.studentName = document.getElementById("student-name");
  elements.studentStatus = document.getElementById("student-status");

  elements.caseForm = document.getElementById("case-form");
  elements.caseTitle = document.getElementById("case-title");
  elements.caseCategory = document.getElementById("case-category");
  elements.caseDifficulty = document.getElementById("case-difficulty");
  elements.caseLink = document.getElementById("case-link");
  elements.caseNotes = document.getElementById("case-notes");
  elements.caseStatus = document.getElementById("case-status");
  elements.caseImport = document.getElementById("case-import");
  elements.exportCases = document.getElementById("export-cases");
  elements.caseTableBody = document.getElementById("case-table-body");
}

function bindEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  elements.refreshData.addEventListener("click", () => {
    void syncFromStorage({ announce: true });
  });
  elements.exportData.addEventListener("click", exportFullBackup);
  elements.importData.addEventListener("change", handleBackupImport);

  elements.sessionForm.addEventListener("submit", handleSessionSubmit);
  elements.sessionFilter.addEventListener("change", renderRecentSessions);
  elements.sessionTableBody.addEventListener("click", handleSessionTableActions);

  elements.studentForm.addEventListener("submit", handleStudentSubmit);
  elements.cohortSearch.addEventListener("input", renderCohortTable);

  elements.caseForm.addEventListener("submit", handleCaseSubmit);
  elements.caseImport.addEventListener("change", handleCaseImport);
  elements.exportCases.addEventListener("click", exportCases);
  elements.caseTableBody.addEventListener("click", handleCaseTableActions);
}

function buildDefaultState() {
  return {
    mentors: DEFAULT_MENTORS.map((name) => createPerson(name, "mentor")),
    cohort: DEFAULT_COHORT.map((name) => createPerson(name, "student")),
    cases: DEFAULT_CASES.map((title) => createCase({ title })),
    sessions: [],
  };
}

function getStorageConfig() {
  const raw = window.SPACE_STORAGE_CONFIG || {};
  return {
    provider: raw.provider || "local",
    supabaseUrl: String(raw.supabaseUrl || "").trim(),
    supabaseAnonKey: String(raw.supabaseAnonKey || "").trim(),
    autoRefreshMs: Number(raw.autoRefreshMs || 60000),
    tables: {
      cohort: raw.tables?.cohort || "space_cohort_members",
      cases: raw.tables?.cases || "space_cases",
      sessions: raw.tables?.sessions || "space_sessions",
    },
  };
}

function createStorageProvider() {
  const config = getStorageConfig();
  if (config.provider === "supabase" && config.supabaseUrl && config.supabaseAnonKey) {
    return createSupabaseProvider(config);
  }

  return createLocalProvider();
}

function createLocalProvider() {
  return {
    kind: "local",
    label: "Browser only",
    detail:
      "Saved in this browser only. Add Supabase settings in storage-config.js to enable shared tracking on GitHub Pages.",
    autoRefreshMs: 0,
    async loadState() {
      return loadLocalSnapshot();
    },
    async createSession(session) {
      const snapshot = normalizeState(loadLocalSnapshot());
      snapshot.sessions.push(session);
      saveLocalSnapshot(snapshot);
    },
    async deleteSession(sessionId) {
      const snapshot = normalizeState(loadLocalSnapshot());
      snapshot.sessions = snapshot.sessions.filter((session) => session.id !== sessionId);
      saveLocalSnapshot(snapshot);
    },
    async createStudent(student) {
      const snapshot = normalizeState(loadLocalSnapshot());
      snapshot.cohort = mergePeople(snapshot.cohort, [student], "student");
      saveLocalSnapshot(snapshot);
    },
    async createCase(caseItem) {
      const snapshot = normalizeState(loadLocalSnapshot());
      snapshot.cases = sanitizeCases([...snapshot.cases, caseItem]);
      saveLocalSnapshot(snapshot);
    },
    async createCases(caseItems) {
      const snapshot = normalizeState(loadLocalSnapshot());
      snapshot.cases = sanitizeCases([...snapshot.cases, ...caseItems]);
      saveLocalSnapshot(snapshot);
    },
    async deleteCase(caseId) {
      const snapshot = normalizeState(loadLocalSnapshot());
      snapshot.cases = snapshot.cases.filter((caseItem) => caseItem.id !== caseId);
      saveLocalSnapshot(snapshot);
    },
    async syncSnapshot(snapshot) {
      saveLocalSnapshot(normalizeState(snapshot));
    },
  };
}

function createSupabaseProvider(config) {
  const baseUrl = config.supabaseUrl.replace(/\/$/, "");
  const authHeaders = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
  };

  async function request(method, path, body, prefer = "return=representation") {
    const headers = { ...authHeaders };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (prefer) {
      headers.Prefer = prefer;
    }

    const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Supabase request failed: ${method} ${path}`);
    }

    if (response.status === 204) {
      return [];
    }

    const text = await response.text();
    return text ? JSON.parse(text) : [];
  }

  function fetchRows(tableName) {
    return request("GET", `${tableName}?select=*`, undefined, "");
  }

  function upsertRows(tableName, rows) {
    if (!rows.length) {
      return Promise.resolve([]);
    }

    return request(
      "POST",
      `${tableName}?on_conflict=id`,
      rows,
      "resolution=merge-duplicates,return=representation"
    );
  }

  function deleteRow(tableName, id) {
    return request("DELETE", `${tableName}?id=eq.${encodeURIComponent(id)}`, undefined, "return=minimal");
  }

  return {
    kind: "supabase",
    label: "Shared cloud storage",
    detail: "Live shared storage is enabled. Changes are written to Supabase and refreshed automatically.",
    autoRefreshMs: config.autoRefreshMs,
    async loadState() {
      const [cohortRows, caseRows, sessionRows] = await Promise.all([
        fetchRows(config.tables.cohort),
        fetchRows(config.tables.cases),
        fetchRows(config.tables.sessions),
      ]);

      return {
        mentors: buildDefaultState().mentors,
        cohort: cohortRows.map(mapStudentRowToState),
        cases: caseRows.map(mapCaseRowToState),
        sessions: sessionRows.map(mapSessionRowToState),
      };
    },
    async createSession(session) {
      await upsertRows(config.tables.sessions, [mapSessionStateToRow(session)]);
    },
    async deleteSession(sessionId) {
      await deleteRow(config.tables.sessions, sessionId);
    },
    async createStudent(student) {
      await upsertRows(config.tables.cohort, [mapStudentStateToRow(student)]);
    },
    async createCase(caseItem) {
      await upsertRows(config.tables.cases, [mapCaseStateToRow(caseItem)]);
    },
    async createCases(caseItems) {
      await upsertRows(config.tables.cases, caseItems.map(mapCaseStateToRow));
    },
    async deleteCase(caseId) {
      await deleteRow(config.tables.cases, caseId);
    },
    async syncSnapshot(snapshot) {
      await Promise.all([
        upsertRows(config.tables.cohort, snapshot.cohort.map(mapStudentStateToRow)),
        upsertRows(config.tables.cases, snapshot.cases.map(mapCaseStateToRow)),
        upsertRows(config.tables.sessions, snapshot.sessions.map(mapSessionStateToRow)),
      ]);
    },
  };
}

async function syncFromStorage(options = {}) {
  const { announce = true, quiet = false } = options;

  try {
    setBusyState(true);
    const loadedState = await storageProvider.loadState();
    state = normalizeState(loadedState);
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    refreshApp();
    renderStorageStatus();

    if (announce && !quiet) {
      setStatus(elements.sessionStatus, "Data refreshed.", "success");
    }
  } catch (error) {
    console.warn("Unable to sync tracker data.", error);
    state = normalizeState(loadLocalSnapshot());
    refreshApp();
    renderStorageStatus(error);

    if (!quiet) {
      setStatus(
        elements.sessionStatus,
        storageProvider.kind === "supabase"
          ? "Could not reach shared storage. Showing cached browser data instead."
          : "Could not refresh saved data.",
        "error"
      );
    }
  } finally {
    setBusyState(false);
  }
}

function startAutoRefresh() {
  if (!storageProvider || !storageProvider.autoRefreshMs) {
    return;
  }

  if (autoRefreshHandle) {
    window.clearInterval(autoRefreshHandle);
  }

  autoRefreshHandle = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void syncFromStorage({ announce: false, quiet: true });
    }
  }, storageProvider.autoRefreshMs);
}

function refreshApp() {
  ensureDefaultDate();
  populateSelects();
  renderSummary();
  renderCoverageSnapshot();
  renderMentorSummary();
  renderRecentSessions();
  renderCohortTable();
  renderCaseTable();
}

function renderStorageStatus(error) {
  elements.storageMode.textContent = storageProvider ? storageProvider.label : "Loading...";

  if (error && storageProvider?.kind === "supabase") {
    elements.storageDetail.textContent = "Shared storage unreachable. Using the most recent cached browser data.";
    elements.storageNote.textContent = "The app is still usable, but remote changes are not syncing right now.";
    return;
  }

  if (!storageProvider) {
    elements.storageDetail.textContent = "Checking available storage";
    elements.storageNote.textContent = "Checking available storage";
    return;
  }

  const syncedText = lastSyncAt ? `Last synced ${formatTime(lastSyncAt)}` : storageProvider.detail;
  elements.storageDetail.textContent = syncedText;
  elements.storageNote.textContent = storageProvider.detail;
}

function setBusyState(isBusy) {
  elements.refreshData.disabled = isBusy;
  elements.refreshData.textContent = isBusy ? "Refreshing..." : "Refresh data";
}

function ensureDefaultDate() {
  if (!elements.sessionDate.value) {
    elements.sessionDate.value = formatDateForInput(new Date());
  }
}

function populateSelects() {
  syncSelectOptions(
    elements.sessionMentor,
    state.mentors.map((mentor) => ({ value: mentor.id, label: mentor.name })),
    "Select a mentor"
  );

  syncSelectOptions(
    elements.sessionStudent,
    state.cohort
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((student) => ({ value: student.id, label: student.name })),
    "Select a cohort member"
  );

  syncSelectOptions(
    elements.sessionCase,
    state.cases
      .slice()
      .sort((left, right) => left.title.localeCompare(right.title))
      .map((caseItem) => ({ value: caseItem.id, label: caseItem.title })),
    "Select a case"
  );

  syncSelectOptions(
    elements.sessionFilter,
    state.mentors.map((mentor) => ({ value: mentor.id, label: mentor.name })),
    "All mentors",
    "all"
  );
}

function syncSelectOptions(select, options, placeholder, placeholderValue = "") {
  const currentValue = select.value;
  const fragment = document.createDocumentFragment();
  const placeholderOption = document.createElement("option");
  placeholderOption.value = placeholderValue;
  placeholderOption.textContent = placeholder;
  fragment.appendChild(placeholderOption);

  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    fragment.appendChild(item);
  });

  select.replaceChildren(fragment);

  if (options.some((option) => option.value === currentValue) || currentValue === placeholderValue) {
    select.value = currentValue;
  }
}

function activateTab(tabId) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  elements.panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `panel-${tabId}`);
  });
}

async function handleSessionSubmit(event) {
  event.preventDefault();

  const mentor = state.mentors.find((item) => item.id === elements.sessionMentor.value);
  const student = state.cohort.find((item) => item.id === elements.sessionStudent.value);
  const selectedCase = state.cases.find((item) => item.id === elements.sessionCase.value);
  const customCaseTitle = elements.sessionCustomCase.value.trim();

  if (!mentor || !student || !elements.sessionDate.value) {
    setStatus(elements.sessionStatus, "Choose a date, mentor, and cohort member first.", "error");
    return;
  }

  if (!selectedCase && !customCaseTitle) {
    setStatus(elements.sessionStatus, "Select a case from the library or type a new one.", "error");
    return;
  }

  let caseItem = selectedCase || null;
  if (customCaseTitle) {
    caseItem = findCaseByTitle(customCaseTitle);
  }

  const shouldCreateCase = customCaseTitle && !caseItem && elements.sessionAddCase.checked;
  const createdCase = shouldCreateCase ? createCase({ title: customCaseTitle }) : null;
  const caseTitle = createdCase ? createdCase.title : caseItem ? caseItem.title : customCaseTitle;
  const caseId = createdCase ? createdCase.id : caseItem ? caseItem.id : "";

  const session = {
    id: createId("session"),
    date: elements.sessionDate.value,
    mentorId: mentor.id,
    mentorName: mentor.name,
    studentId: student.id,
    studentName: student.name,
    caseId,
    caseTitle,
    notes: elements.sessionNotes.value.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    setStatus(elements.sessionStatus, "Saving session...", "success");

    if (createdCase) {
      await storageProvider.createCase(createdCase);
      state.cases = sanitizeCases([...state.cases, createdCase]);
    }

    await storageProvider.createSession(session);
    state.sessions.push(session);
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    elements.sessionForm.reset();
    ensureDefaultDate();
    elements.sessionAddCase.checked = true;
    refreshApp();
    renderStorageStatus();
    setStatus(elements.sessionStatus, `Saved ${mentor.name}'s session with ${student.name}.`, "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.sessionStatus, "The session could not be saved.", "error");
  }
}

async function handleStudentSubmit(event) {
  event.preventDefault();

  const name = elements.studentName.value.trim();
  if (!name) {
    setStatus(elements.studentStatus, "Enter the student's full name.", "error");
    return;
  }

  if (findPersonByName(state.cohort, name)) {
    setStatus(elements.studentStatus, "That student is already in the cohort list.", "error");
    return;
  }

  const student = createPerson(name, "student");

  try {
    await storageProvider.createStudent(student);
    state.cohort = mergePeople(state.cohort, [student], "student");
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    elements.studentForm.reset();
    refreshApp();
    renderStorageStatus();
    setStatus(elements.studentStatus, `${name} was added to the cohort.`, "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.studentStatus, "The student could not be added.", "error");
  }
}

async function handleCaseSubmit(event) {
  event.preventDefault();

  const title = elements.caseTitle.value.trim();
  if (!title) {
    setStatus(elements.caseStatus, "Add a case title first.", "error");
    return;
  }

  if (findCaseByTitle(title)) {
    setStatus(elements.caseStatus, "That case is already in the library.", "error");
    return;
  }

  const caseItem = createCase({
    title,
    category: elements.caseCategory.value.trim(),
    difficulty: elements.caseDifficulty.value,
    link: elements.caseLink.value.trim(),
    notes: elements.caseNotes.value.trim(),
  });

  try {
    await storageProvider.createCase(caseItem);
    state.cases = sanitizeCases([...state.cases, caseItem]);
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    elements.caseForm.reset();
    refreshApp();
    renderStorageStatus();
    setStatus(elements.caseStatus, `${title} was added to the library.`, "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.caseStatus, "The case could not be added.", "error");
  }
}

async function handleCaseImport(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    const content = await readTextFile(file);
    const importedCases = file.name.toLowerCase().endsWith(".json")
      ? parseCaseJson(content)
      : parseCaseCsv(content);

    const newCases = importedCases
      .map((caseInput) => createCase(caseInput))
      .filter((caseItem) => !findCaseByTitle(caseItem.title));

    if (!newCases.length) {
      setStatus(elements.caseStatus, "Nothing new to import. Duplicate case titles were skipped.", "error");
      return;
    }

    await storageProvider.createCases(newCases);
    state.cases = sanitizeCases([...state.cases, ...newCases]);
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    refreshApp();
    renderStorageStatus();
    setStatus(elements.caseStatus, `Imported ${newCases.length} cases.`, "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.caseStatus, "The case file could not be imported.", "error");
  } finally {
    elements.caseImport.value = "";
  }
}

async function handleBackupImport(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  try {
    const content = await readTextFile(file);
    const snapshot = normalizeState(JSON.parse(content));
    await storageProvider.syncSnapshot(snapshot);
    state = snapshot;
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    refreshApp();
    renderStorageStatus();
    setStatus(elements.sessionStatus, "Backup imported.", "success");
    setStatus(elements.caseStatus, "Backup imported.", "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.sessionStatus, "That backup file could not be imported.", "error");
  } finally {
    elements.importData.value = "";
  }
}

async function handleSessionTableActions(event) {
  const trigger = event.target.closest("[data-action='delete-session']");
  if (!trigger) {
    return;
  }

  const session = state.sessions.find((item) => item.id === trigger.dataset.id);
  if (!session) {
    return;
  }

  if (!window.confirm(`Remove the session for ${session.studentName} with ${session.mentorName}?`)) {
    return;
  }

  try {
    await storageProvider.deleteSession(session.id);
    state.sessions = state.sessions.filter((item) => item.id !== session.id);
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    refreshApp();
    renderStorageStatus();
    setStatus(elements.sessionStatus, "Session removed.", "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.sessionStatus, "The session could not be removed.", "error");
  }
}

async function handleCaseTableActions(event) {
  const trigger = event.target.closest("[data-action='delete-case']");
  if (!trigger) {
    return;
  }

  const caseItem = state.cases.find((item) => item.id === trigger.dataset.id);
  if (!caseItem) {
    return;
  }

  if (!window.confirm(`Remove ${caseItem.title} from the case library?`)) {
    return;
  }

  try {
    await storageProvider.deleteCase(caseItem.id);
    state.cases = state.cases.filter((item) => item.id !== caseItem.id);
    saveLocalSnapshot(state);
    lastSyncAt = new Date();
    refreshApp();
    renderStorageStatus();
    setStatus(elements.caseStatus, "Case removed from the library.", "success");
  } catch (error) {
    console.warn(error);
    setStatus(elements.caseStatus, "The case could not be removed.", "error");
  }
}

function exportFullBackup() {
  downloadJson("space-mentor-tracker-backup.json", state);
}

function exportCases() {
  downloadJson("space-case-library.json", state.cases);
}

function renderSummary() {
  const sessions = getSortedSessions();
  const studentKeys = new Set(sessions.map((session) => session.studentId || normalizeText(session.studentName)));
  const uncasedCount = Math.max(state.cohort.length - studentKeys.size, 0);
  const latestSession = sessions[0];
  const mostActive = getMostActiveMentor();
  const uniqueCasesUsed = uniqueValues(sessions.map((session) => session.caseTitle));

  elements.summaryCohort.textContent = String(state.cohort.length);
  elements.summaryUncased.textContent =
    uncasedCount === 0 ? "Everyone has been cased at least once" : `${uncasedCount} still need casing`;
  elements.summarySessions.textContent = String(sessions.length);
  elements.summaryMostActive.textContent = mostActive
    ? `${mostActive.name} leads with ${mostActive.count} session${mostActive.count === 1 ? "" : "s"}`
    : "No mentor activity yet";
  elements.summaryCases.textContent = String(state.cases.length);
  elements.summaryCaseCoverage.textContent = uniqueCasesUsed.length
    ? `${uniqueCasesUsed.length} unique case${uniqueCasesUsed.length === 1 ? "" : "s"} used`
    : "No case usage yet";
  elements.summaryReached.textContent = String(studentKeys.size);
  elements.summaryLastSession.textContent = latestSession
    ? `Latest: ${latestSession.mentorName} with ${latestSession.studentName} on ${formatHumanDate(latestSession.date)}`
    : "No sessions logged yet";
}

function renderCoverageSnapshot() {
  const studentSessionMap = buildStudentSessionMap();
  const uncasedStudents = state.cohort.filter((student) => !(studentSessionMap.get(student.id) || []).length);

  elements.uncasedList.replaceChildren();
  if (!uncasedStudents.length) {
    const item = document.createElement("li");
    item.textContent = "All students have at least one logged session.";
    elements.uncasedList.appendChild(item);
    return;
  }

  uncasedStudents
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .forEach((student) => {
      const item = document.createElement("li");
      item.textContent = student.name;
      elements.uncasedList.appendChild(item);
    });
}

function renderMentorSummary() {
  elements.mentorSummaryBody.replaceChildren();

  const rows = state.mentors.map((mentor) => {
    const sessions = getSortedSessions().filter((session) => session.mentorId === mentor.id);
    return {
      mentor,
      sessions,
      students: uniqueValues(sessions.map((session) => session.studentName)),
      cases: uniqueValues(sessions.map((session) => session.caseTitle)),
    };
  });

  if (!rows.length) {
    appendEmptyRow(elements.mentorSummaryBody, 5, "No mentor data available.");
    return;
  }

  rows.forEach((rowData) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(rowData.mentor.name)}</td>
      <td>${rowData.sessions.length}</td>
      <td>${escapeHtml(rowData.students.length ? rowData.students.join(", ") : "None yet")}</td>
      <td>${escapeHtml(rowData.cases.length ? rowData.cases.join(", ") : "None yet")}</td>
      <td>${escapeHtml(rowData.sessions[0] ? formatHumanDate(rowData.sessions[0].date) : "No activity yet")}</td>
    `;
    elements.mentorSummaryBody.appendChild(row);
  });
}

function renderRecentSessions() {
  const mentorFilter = elements.sessionFilter.value;
  const sessions = getSortedSessions().filter((session) => {
    return mentorFilter === "all" ? true : session.mentorId === mentorFilter;
  });

  elements.sessionTableBody.replaceChildren();
  if (!sessions.length) {
    appendEmptyRow(elements.sessionTableBody, 6, "No sessions in this view yet.");
    return;
  }

  sessions.forEach((session) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(formatHumanDate(session.date))}</td>
      <td>${escapeHtml(session.mentorName)}</td>
      <td>${escapeHtml(session.studentName)}</td>
      <td>${escapeHtml(session.caseTitle)}</td>
      <td>${escapeHtml(session.notes || "No notes")}</td>
      <td><button class="link-button" type="button" data-action="delete-session" data-id="${session.id}">Delete</button></td>
    `;
    elements.sessionTableBody.appendChild(row);
  });
}

function renderCohortTable() {
  const searchTerm = normalizeText(elements.cohortSearch.value);
  const studentSessionMap = buildStudentSessionMap();
  const students = state.cohort
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .filter((student) => normalizeText(student.name).includes(searchTerm));

  elements.cohortTableBody.replaceChildren();
  if (!students.length) {
    appendEmptyRow(elements.cohortTableBody, 5, "No students match that search.");
    return;
  }

  students.forEach((student) => {
    const sessions = studentSessionMap.get(student.id) || [];
    const mentors = uniqueValues(sessions.map((session) => session.mentorName));
    const cases = uniqueValues(sessions.map((session) => session.caseTitle));
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(student.name)}</td>
      <td>${renderStatusTagHtml(sessions.length ? `${sessions.length} session${sessions.length === 1 ? "" : "s"}` : "Needs casing", !sessions.length)}</td>
      <td>${escapeHtml(mentors.length ? mentors.join(", ") : "Not yet assigned")}</td>
      <td>${escapeHtml(cases.length ? cases.join(", ") : "No cases logged")}</td>
      <td>${escapeHtml(sessions[0] ? formatHumanDate(sessions[0].date) : "No activity yet")}</td>
    `;
    elements.cohortTableBody.appendChild(row);
  });
}

function renderCaseTable() {
  const cases = state.cases.slice().sort((left, right) => left.title.localeCompare(right.title));
  elements.caseTableBody.replaceChildren();

  if (!cases.length) {
    appendEmptyRow(elements.caseTableBody, 6, "The case library is empty.");
    return;
  }

  cases.forEach((caseItem) => {
    const usageCount = state.sessions.filter((session) => session.caseId === caseItem.id || session.caseTitle === caseItem.title).length;
    const sourceCell = caseItem.link
      ? `<a class="table-link" href="${escapeAttribute(caseItem.link)}" target="_blank" rel="noreferrer">Open link</a>`
      : "No link";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(caseItem.title)}</td>
      <td>${escapeHtml(caseItem.category || "Not set")}</td>
      <td>${escapeHtml(caseItem.difficulty || "Not set")}</td>
      <td>${usageCount}</td>
      <td>${sourceCell}</td>
      <td><button class="link-button" type="button" data-action="delete-case" data-id="${caseItem.id}">Delete</button></td>
    `;
    elements.caseTableBody.appendChild(row);
  });
}

function buildStudentSessionMap() {
  const map = new Map();
  getSortedSessions().forEach((session) => {
    const key = session.studentId || normalizeText(session.studentName);
    const current = map.get(key) || [];
    current.push(session);
    map.set(key, current);
  });
  return map;
}

function getSortedSessions() {
  return state.sessions
    .slice()
    .sort((left, right) => {
      const dateComparison = right.date.localeCompare(left.date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return (right.createdAt || "").localeCompare(left.createdAt || "");
    });
}

function getMostActiveMentor() {
  const counts = state.mentors
    .map((mentor) => ({
      name: mentor.name,
      count: state.sessions.filter((session) => session.mentorId === mentor.id).length,
    }))
    .filter((mentor) => mentor.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  return counts[0] || null;
}

function loadLocalSnapshot() {
  for (const key of LOCAL_STORAGE_FALLBACK_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (error) {
      console.warn("Unable to read local snapshot.", error);
    }
  }

  return buildDefaultState();
}

function saveLocalSnapshot(snapshot) {
  localStorage.setItem(LOCAL_STORAGE_PRIMARY_KEY, JSON.stringify(snapshot));
}

function normalizeState(input) {
  const defaults = buildDefaultState();
  const mentors = mergePeople(defaults.mentors, input?.mentors, "mentor");
  const cohort = mergePeople(defaults.cohort, input?.cohort, "student");
  const cases = sanitizeCases(input?.cases);
  const sessions = alignSessionReferences(sanitizeSessions(input?.sessions), mentors, cohort);

  return { mentors, cohort, cases, sessions };
}

function sanitizeCases(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  const unique = new Map();
  input.forEach((caseItem) => {
    const normalized = normalizeCaseInput(caseItem);
    if (!normalized.title) {
      return;
    }
    const key = normalizeText(normalized.title);
    if (!unique.has(key)) {
      unique.set(key, {
        id: caseItem.id || createId("case"),
        ...normalized,
      });
    }
  });

  return Array.from(unique.values());
}

function sanitizeSessions(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((session) => ({
      id: session.id || createId("session"),
      date: String(session.date || "").trim(),
      mentorId: String(session.mentorId || "").trim(),
      mentorName: String(session.mentorName || "").trim(),
      studentId: String(session.studentId || "").trim(),
      studentName: String(session.studentName || "").trim(),
      caseId: String(session.caseId || "").trim(),
      caseTitle: String(session.caseTitle || "").trim(),
      notes: String(session.notes || "").trim(),
      createdAt: String(session.createdAt || "").trim(),
    }))
    .filter((session) => session.date && session.mentorName && session.studentName && session.caseTitle);
}

function alignSessionReferences(sessions, mentors, cohort) {
  const mentorLookup = new Map(mentors.map((mentor) => [normalizeText(mentor.name), mentor.id]));
  const studentLookup = new Map(cohort.map((student) => [normalizeText(student.name), student.id]));

  return sessions.map((session) => ({
    ...session,
    mentorId: mentorLookup.get(normalizeText(session.mentorName)) || session.mentorId,
    studentId: studentLookup.get(normalizeText(session.studentName)) || session.studentId,
  }));
}

function mergePeople(defaultPeople, importedPeople, kind) {
  const map = new Map(defaultPeople.map((person) => [normalizeText(person.name), person]));

  if (Array.isArray(importedPeople)) {
    importedPeople.forEach((person) => {
      const name = String(person.name || "").trim();
      if (!name) {
        return;
      }

      const key = normalizeText(name);
      if (!map.has(key)) {
        map.set(key, {
          id: person.id || `${kind}-${slugify(name)}`,
          name,
        });
      }
    });
  }

  return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function createPerson(name, kind) {
  const trimmedName = String(name).trim();
  return {
    id: `${kind}-${slugify(trimmedName)}`,
    name: trimmedName,
  };
}

function createCase(input) {
  const normalized = normalizeCaseInput(input);
  return {
    id: input.id || `case-${slugify(normalized.title)}`,
    title: normalized.title,
    category: normalized.category,
    difficulty: normalized.difficulty,
    link: normalized.link,
    notes: normalized.notes,
  };
}

function normalizeCaseInput(input) {
  return {
    title: String(input?.title || "").trim(),
    category: String(input?.category || "").trim(),
    difficulty: String(input?.difficulty || "").trim(),
    link: String(input?.link || "").trim(),
    notes: String(input?.notes || "").trim(),
  };
}

function findCaseByTitle(title) {
  const key = normalizeText(title);
  return state.cases.find((caseItem) => normalizeText(caseItem.title) === key) || null;
}

function findPersonByName(collection, name) {
  const key = normalizeText(name);
  return collection.find((person) => normalizeText(person.name) === key) || null;
}

function parseCaseJson(content) {
  const parsed = JSON.parse(content);
  const cases = Array.isArray(parsed) ? parsed : parsed.cases;
  if (!Array.isArray(cases)) {
    throw new Error("Invalid case JSON payload.");
  }
  return cases.map(normalizeCaseInput).filter((caseItem) => caseItem.title);
}

function parseCaseCsv(content) {
  const rows = parseCsv(content);
  if (!rows.length) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map((header) => normalizeText(header));

  return dataRows
    .map((row) => {
      const item = {};
      normalizedHeaders.forEach((header, index) => {
        item[header] = row[index] || "";
      });

      return normalizeCaseInput({
        title: item.title || row[0] || "",
        category: item.category || "",
        difficulty: item.difficulty || "",
        link: item.link || item.url || "",
        notes: item.notes || item.description || "",
      });
    })
    .filter((caseItem) => caseItem.title);
}

function parseCsv(content) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function mapStudentStateToRow(student) {
  return {
    id: student.id,
    name: student.name,
  };
}

function mapStudentRowToState(row) {
  return {
    id: String(row.id || "").trim(),
    name: String(row.name || "").trim(),
  };
}

function mapCaseStateToRow(caseItem) {
  return {
    id: caseItem.id,
    title: caseItem.title,
    category: caseItem.category || null,
    difficulty: caseItem.difficulty || null,
    link: caseItem.link || null,
    notes: caseItem.notes || null,
  };
}

function mapCaseRowToState(row) {
  return {
    id: String(row.id || "").trim(),
    title: String(row.title || "").trim(),
    category: String(row.category || "").trim(),
    difficulty: String(row.difficulty || "").trim(),
    link: String(row.link || "").trim(),
    notes: String(row.notes || "").trim(),
  };
}

function mapSessionStateToRow(session) {
  return {
    id: session.id,
    date: session.date,
    mentor_id: session.mentorId,
    mentor_name: session.mentorName,
    student_id: session.studentId,
    student_name: session.studentName,
    case_id: session.caseId || null,
    case_title: session.caseTitle,
    notes: session.notes || null,
    created_at: session.createdAt || new Date().toISOString(),
  };
}

function mapSessionRowToState(row) {
  return {
    id: String(row.id || "").trim(),
    date: String(row.date || "").trim(),
    mentorId: String(row.mentor_id || "").trim(),
    mentorName: String(row.mentor_name || "").trim(),
    studentId: String(row.student_id || "").trim(),
    studentName: String(row.student_name || "").trim(),
    caseId: String(row.case_id || "").trim(),
    caseTitle: String(row.case_title || "").trim(),
    notes: String(row.notes || "").trim(),
    createdAt: String(row.created_at || "").trim(),
  };
}

function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read the selected file."));
    reader.readAsText(file);
  });
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function appendEmptyRow(tableBody, columnCount, message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = message;
  cell.appendChild(empty);
  row.appendChild(cell);
  tableBody.appendChild(row);
}

function renderStatusTagHtml(text, warning = false) {
  return `<span class="tag ${warning ? "tag-warning" : "tag-muted"}">${escapeHtml(text)}</span>`;
}

function setStatus(element, message, tone) {
  element.textContent = message;
  element.classList.remove("is-success", "is-error");
  if (tone === "success") {
    element.classList.add("is-success");
  }
  if (tone === "error") {
    element.classList.add("is-error");
  }
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeText(value);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || createId("item");
}

function createId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatHumanDate(value) {
  if (!value) {
    return "No date";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
