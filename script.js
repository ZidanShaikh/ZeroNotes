// --- UTILITIES ---

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatPrettyDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- STATE ---

let journalEntries = loadFromStorage("journalEntries", []); // [{id, title, content, timestamp}]
let tasksByDate = loadFromStorage("tasksByDate", {}); // { "YYYY-MM-DD": [{id, text, done}] }

const today = new Date();
let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDateKey = formatDateKey(today);

// --- DOM ELEMENTS ---

const todayDateEl = document.getElementById("today-date");

// journal
const journalForm = document.getElementById("journal-form");
const journalTitleInput = document.getElementById("journal-title");
const journalContentInput = document.getElementById("journal-content");
const journalListEl = document.getElementById("journal-list");

// calendar
const monthLabelEl = document.getElementById("month-label");
const calendarGridEl = document.getElementById("calendar-grid");
const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");

// tasks
const selectedDateLabelEl = document.getElementById("selected-date-label");
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const taskListEl = document.getElementById("task-list");

// --- INITIAL SETUP ---

todayDateEl.textContent = formatPrettyDate(today);

// JOURNAL RENDERING

function renderJournal() {
  journalListEl.innerHTML = "";
  if (journalEntries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No entries yet. Dump something.";
    li.style.fontSize = "0.85rem";
    li.style.color = "#9ca3af";
    journalListEl.appendChild(li);
    return;
  }

  // latest first
  const sorted = [...journalEntries].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  for (const entry of sorted) {
    const li = document.createElement("li");
    li.className = "journal-entry";

    const header = document.createElement("div");
    header.className = "journal-entry-header";

    const titleSpan = document.createElement("span");
    titleSpan.className = "journal-entry-title";
    titleSpan.textContent = entry.title || "(no title)";

    const metaSpan = document.createElement("span");
    metaSpan.className = "journal-entry-meta";
    const date = new Date(entry.timestamp);
    metaSpan.textContent = date.toLocaleString();

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "journal-entry-delete";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      journalEntries = journalEntries.filter((e) => e.id !== entry.id);
      saveToStorage("journalEntries", journalEntries);
      renderJournal();
    });

    header.appendChild(titleSpan);
    header.appendChild(metaSpan);
    header.appendChild(deleteBtn);

    const contentDiv = document.createElement("div");
    contentDiv.className = "journal-entry-content";
    contentDiv.textContent = entry.content;

    li.appendChild(header);
    li.appendChild(contentDiv);

    journalListEl.appendChild(li);
  }
}

journalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = journalTitleInput.value.trim();
  const content = journalContentInput.value.trim();

  if (!content) return;

  const entry = {
    id: Date.now() + Math.random().toString(16).slice(2),
    title,
    content,
    timestamp: Date.now(),
  };

  journalEntries.push(entry);
  saveToStorage("journalEntries", journalEntries);

  journalTitleInput.value = "";
  journalContentInput.value = "";

  renderJournal();
});

// CALENDAR RENDERING

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  monthLabelEl.textContent = currentMonth.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  calendarGridEl.innerHTML = "";

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const w of weekdays) {
    const div = document.createElement("div");
    div.className = "day-name";
    div.textContent = w;
    calendarGridEl.appendChild(div);
  }

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // empty cells before 1st
  for (let i = 0; i < firstDayIndex; i++) {
    const div = document.createElement("div");
    div.className = "day-empty";
    calendarGridEl.appendChild(div);
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateObj = new Date(year, month, day);
    const dateKey = formatDateKey(dateObj);

    const div = document.createElement("div");
    div.className = "day-cell";
    div.textContent = day;

    if (dateKey === selectedDateKey) {
      div.classList.add("selected");
    }

    const todayKey = formatDateKey(today);
    if (dateKey === todayKey) {
      div.classList.add("today");
    }

    if (tasksByDate[dateKey] && tasksByDate[dateKey].length > 0) {
      div.classList.add("has-tasks");
    }

    div.addEventListener("click", () => {
      selectedDateKey = dateKey;
      renderCalendar();
      renderTasks();
    });

    calendarGridEl.appendChild(div);
  }
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1
  );
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    1
  );
  renderCalendar();
});

// TASKS RENDERING

function renderTasks() {
  const dateObj = new Date(selectedDateKey);
  selectedDateLabelEl.textContent = formatPrettyDate(dateObj);

  const tasks = tasksByDate[selectedDateKey] || [];
  taskListEl.innerHTML = "";

  if (tasks.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No tasks. Add one or procrastinate, your call.";
    li.style.fontSize = "0.85rem";
    li.style.color = "#9ca3af";
    taskListEl.appendChild(li);
    return;
  }

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task-item";

    const mainDiv = document.createElement("div");
    mainDiv.className = "task-main";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = !!task.done;

    const textSpan = document.createElement("span");
    textSpan.className = "task-text";
    textSpan.textContent = task.text;
    if (task.done) {
      textSpan.classList.add("completed");
    }

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      if (task.done) textSpan.classList.add("completed");
      else textSpan.classList.remove("completed");
      saveToStorage("tasksByDate", tasksByDate);
    });

    mainDiv.appendChild(checkbox);
    mainDiv.appendChild(textSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "task-delete";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => {
      const list = tasksByDate[selectedDateKey] || [];
      tasksByDate[selectedDateKey] = list.filter((t) => t.id !== task.id);
      saveToStorage("tasksByDate", tasksByDate);
      renderTasks();
      renderCalendar();
    });

    li.appendChild(mainDiv);
    li.appendChild(deleteBtn);

    taskListEl.appendChild(li);
  }
}

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;

  if (!tasksByDate[selectedDateKey]) {
    tasksByDate[selectedDateKey] = [];
  }

  tasksByDate[selectedDateKey].push({
    id: Date.now() + Math.random().toString(16).slice(2),
    text,
    done: false,
  });

  saveToStorage("tasksByDate", tasksByDate);
  taskInput.value = "";
  renderTasks();
  renderCalendar();
});

// --- INITIAL RENDER ---

renderJournal();
renderCalendar();
renderTasks();
