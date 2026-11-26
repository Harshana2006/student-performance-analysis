/* ==========================================================
   Student Performance Analysis System - Application Logic
   Pure vanilla JavaScript with localStorage & HTML5 Canvas
   ========================================================== */

const STORAGE_KEY = "studentPerformanceSystem_v1";

const SUBJECTS = [
  { key: "math", label: "Math", fullName: "Mathematics" },
  { key: "science", label: "Science", fullName: "Science" },
  { key: "english", label: "English", fullName: "English" },
  { key: "social", label: "Social", fullName: "Social Studies" },
  { key: "computer", label: "Computer", fullName: "Computer Science" }
];

const GRADE_COLORS = {
  "A+": "#059669",
  A: "#2563eb",
  B: "#4f46e5",
  C: "#d97706",
  D: "#dc2626"
};

/* ---------- Sample Student Records ---------- */
function createSampleStudents() {
  const rawSamples = [
    {
      name: "Aarav Sharma",
      roll: "10A-01",
      studentClass: "Class 10-A",
      attendance: 96,
      marks: { math: 95, science: 94, english: 91, social: 93, computer: 99 }
    },
    {
      name: "Priya Nair",
      roll: "10A-02",
      studentClass: "Class 10-A",
      attendance: 91,
      marks: { math: 86, science: 84, english: 89, social: 82, computer: 88 }
    },
    {
      name: "Rohan Verma",
      roll: "10B-01",
      studentClass: "Class 10-B",
      attendance: 84,
      marks: { math: 74, science: 71, english: 78, social: 75, computer: 77 }
    },
    {
      name: "Ananya Iyer",
      roll: "10B-02",
      studentClass: "Class 10-B",
      attendance: 72,
      marks: { math: 68, science: 65, english: 73, social: 66, computer: 70 }
    },
    {
      name: "Kabir Khan",
      roll: "11A-01",
      studentClass: "Class 11-A",
      attendance: 88,
      marks: { math: 82, science: 80, english: 79, social: 84, computer: 90 }
    },
    {
      name: "Meera Patel",
      roll: "11A-02",
      studentClass: "Class 11-A",
      attendance: 66,
      marks: { math: 52, science: 55, english: 58, social: 54, computer: 56 }
    }
  ];

  return rawSamples.map(buildStudentRecord);
}

/* ---------- Grade & Metrics Calculation ---------- */
function calculateGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  return "D";
}

function getGradeClass(grade) {
  if (grade === "A+") return "grade-aplus";
  if (grade === "A") return "grade-a";
  if (grade === "B") return "grade-b";
  if (grade === "C") return "grade-c";
  if (grade === "D") return "grade-d";
  return "grade-neutral";
}

function buildStudentRecord(input) {
  const marks = {
    math: Number(input.marks.math),
    science: Number(input.marks.science),
    english: Number(input.marks.english),
    social: Number(input.marks.social),
    computer: Number(input.marks.computer)
  };

  const total = SUBJECTS.reduce((sum, sub) => sum + marks[sub.key], 0);
  const average = Number((total / SUBJECTS.length).toFixed(2));
  const percentage = Number(((total / (SUBJECTS.length * 100)) * 100).toFixed(2));
  const grade = calculateGrade(percentage);

  return {
    id: input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    roll: input.roll.trim(),
    studentClass: input.studentClass.trim(),
    attendance: Number(Number(input.attendance).toFixed(1)),
    marks,
    total,
    average,
    percentage,
    grade
  };
}

function needsImprovement(student) {
  return student.percentage < 60 || student.attendance < 75;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ---------- Storage Management ---------- */
function loadStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      const defaults = createSampleStudents();
      saveStudents(defaults);
      return defaults;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      const defaults = createSampleStudents();
      saveStudents(defaults);
      return defaults;
    }

    // Re-normalize saved records so calculations are always consistent
    return parsed
      .filter(item => item && item.marks && typeof item.name === "string")
      .map(buildStudentRecord);
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return createSampleStudents();
  }
}

function saveStudents(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

/* ---------- Application State ---------- */
let students = loadStudents();
let marksChartView = "students"; // "students" | "subjects"
let perfChartView = "classes";   // "classes" | "grades"
let lastDeleted = null;
let toastTimer = null;
let chartHitboxes = { marks: [], performance: [] };

/* ---------- DOM Elements ---------- */
const studentForm = document.getElementById("studentForm");
const studentNameInput = document.getElementById("studentName");
const rollNumberInput = document.getElementById("rollNumber");
const studentClassInput = document.getElementById("studentClass");
const attendanceInput = document.getElementById("attendance");
const subjectInputs = {
  math: document.getElementById("mathMarks"),
  science: document.getElementById("scienceMarks"),
  english: document.getElementById("englishMarks"),
  social: document.getElementById("socialMarks"),
  computer: document.getElementById("computerMarks")
};

const previewTotal = document.getElementById("previewTotal");
const previewAverage = document.getElementById("previewAverage");
const previewPercentage = document.getElementById("previewPercentage");
const previewGrade = document.getElementById("previewGrade");
const formMessage = document.getElementById("formMessage");

const searchInput = document.getElementById("searchInput");
const classFilter = document.getElementById("classFilter");
const gradeFilter = document.getElementById("gradeFilter");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const resetSampleBtn = document.getElementById("resetSampleBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const confirmModal = document.getElementById("confirmModal");
const cancelClearBtn = document.getElementById("cancelClearBtn");
const confirmClearBtn = document.getElementById("confirmClearBtn");

const marksCanvas = document.getElementById("marksChart");
const performanceCanvas = document.getElementById("performanceChart");
const chartTooltip = document.getElementById("chartTooltip");
const toastEl = document.getElementById("toast");

/* ---------- Live Form Preview ---------- */
function updateLivePreview() {
  const values = SUBJECTS.map(sub => {
    const raw = subjectInputs[sub.key].value.trim();
    if (raw === "") return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  });

  if (values.every(v => v === null)) {
    previewTotal.textContent = "0 / 500";
    previewAverage.textContent = "0.00";
    previewPercentage.textContent = "0.00%";
    previewGrade.textContent = "-";
    previewGrade.className = "grade-badge grade-neutral";
    return;
  }

  const validSum = values.reduce((sum, v) => sum + (v !== null ? Math.min(100, Math.max(0, v)) : 0), 0);
  const avg = validSum / SUBJECTS.length;
  const pct = (validSum / 500) * 100;
  const grade = calculateGrade(pct);

  previewTotal.textContent = `${validSum} / 500`;
  previewAverage.textContent = avg.toFixed(2);
  previewPercentage.textContent = `${pct.toFixed(2)}%`;
  previewGrade.textContent = grade;
  previewGrade.className = `grade-badge ${getGradeClass(grade)}`;
}

Object.values(subjectInputs).forEach(input => {
  input.addEventListener("input", updateLivePreview);
});

/* ---------- Inline Form Feedback & Toast ---------- */
function showFormMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function hideFormMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message hidden";
}

function showToast(message, showUndo = false) {
  clearTimeout(toastTimer);
  toastEl.innerHTML = "";

  const textSpan = document.createElement("span");
  textSpan.textContent = message;
  toastEl.appendChild(textSpan);

  if (showUndo && lastDeleted) {
    const undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "toast-undo-btn";
    undoBtn.textContent = "Undo";
    undoBtn.addEventListener("click", () => {
      if (!lastDeleted) return;
      const { student, index } = lastDeleted;
      students.splice(Math.min(index, students.length), 0, student);
      lastDeleted = null;
      saveStudents(students);
      renderDashboard();
      toastEl.classList.add("hidden");
    });
    toastEl.appendChild(undoBtn);
  }

  toastEl.classList.remove("hidden");
  toastTimer = setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 4500);
}

/* ---------- Form Submission & Validation ---------- */
studentForm.addEventListener("submit", function (event) {
  event.preventDefault();
  hideFormMessage();

  const name = studentNameInput.value.trim();
  const roll = rollNumberInput.value.trim();
  const studentClass = studentClassInput.value.trim();
  const attendanceRaw = attendanceInput.value.trim();

  if (!name || !roll || !studentClass || attendanceRaw === "") {
    showFormMessage("Please fill in student name, roll number, class, and attendance.", "error");
    return;
  }

  const attendance = Number(attendanceRaw);
  if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) {
    showFormMessage("Attendance percentage must be between 0 and 100.", "error");
    return;
  }

  const marks = {};
  for (const sub of SUBJECTS) {
    const rawVal = subjectInputs[sub.key].value.trim();
    if (rawVal === "") {
      showFormMessage(`Please enter marks for ${sub.fullName}.`, "error");
      return;
    }
    const numVal = Number(rawVal);
    if (!Number.isFinite(numVal) || numVal < 0 || numVal > 100) {
      showFormMessage(`${sub.fullName} marks must be between 0 and 100.`, "error");
      return;
    }
    marks[sub.key] = numVal;
  }

  const duplicate = students.some(
    s => s.roll.toLowerCase() === roll.toLowerCase()
  );
  if (duplicate) {
    showFormMessage(`Roll number "${roll}" already exists. Please enter a unique roll number.`, "error");
    return;
  }

  const newStudent = buildStudentRecord({
    name,
    roll,
    studentClass,
    attendance,
    marks
  });

  students.push(newStudent);
  saveStudents(students);
  studentForm.reset();
  updateLivePreview();
  clearAllFilters();
  showFormMessage(`${newStudent.name} (${newStudent.grade}, ${newStudent.percentage}%) added successfully!`, "success");
  showToast(`Added ${newStudent.name} to ${newStudent.studentClass}.`);
  renderDashboard();
});

resetFormBtn.addEventListener("click", () => {
  studentForm.reset();
  updateLivePreview();
  hideFormMessage();
});

/* ---------- Header Actions (Reset Sample & Clear All) ---------- */
resetSampleBtn.addEventListener("click", () => {
  students = createSampleStudents();
  lastDeleted = null;
  saveStudents(students);
  clearAllFilters();
  renderDashboard();
  showToast("Sample student records restored.");
});

clearAllBtn.addEventListener("click", () => {
  if (students.length === 0) {
    showToast("There are no records to clear.");
    return;
  }
  confirmModal.classList.remove("hidden");
});

cancelClearBtn.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
});

confirmClearBtn.addEventListener("click", () => {
  students = [];
  lastDeleted = null;
  saveStudents(students);
  confirmModal.classList.add("hidden");
  renderDashboard();
  showToast("All student records cleared.");
});

confirmModal.addEventListener("click", event => {
  if (event.target === confirmModal) {
    confirmModal.classList.add("hidden");
  }
});

/* ---------- Filtering & Searching ---------- */
function getFilteredStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedClass = classFilter.value;
  const selectedGrade = gradeFilter.value;

  return students.filter(student => {
    const matchesSearch =
      !query ||
      student.name.toLowerCase().includes(query) ||
      student.roll.toLowerCase().includes(query) ||
      student.studentClass.toLowerCase().includes(query);

    const matchesClass =
      selectedClass === "all" || student.studentClass === selectedClass;

    let matchesGrade = true;
    if (selectedGrade === "improvement") {
      matchesGrade = needsImprovement(student);
    } else if (selectedGrade !== "all") {
      matchesGrade = student.grade === selectedGrade;
    }

    return matchesSearch && matchesClass && matchesGrade;
  });
}

function populateClassFilter() {
  const currentValue = classFilter.value;
  const uniqueClasses = [...new Set(students.map(s => s.studentClass))].sort();

  classFilter.innerHTML = `<option value="all">All Classes</option>`;
  uniqueClasses.forEach(cls => {
    const option = document.createElement("option");
    option.value = cls;
    option.textContent = cls;
    classFilter.appendChild(option);
  });

  if (uniqueClasses.includes(currentValue)) {
    classFilter.value = currentValue;
  } else {
    classFilter.value = "all";
  }
}

function clearAllFilters() {
  searchInput.value = "";
  classFilter.value = "all";
  gradeFilter.value = "all";
}

searchInput.addEventListener("input", renderTableAndCharts);
classFilter.addEventListener("change", renderTableAndCharts);
gradeFilter.addEventListener("change", renderTableAndCharts);
clearFiltersBtn.addEventListener("click", () => {
  clearAllFilters();
  renderTableAndCharts();
});

/* ---------- Delete Student ---------- */
function deleteStudentById(id) {
  const index = students.findIndex(s => s.id === id);
  if (index === -1) return;

  const [removed] = students.splice(index, 1);
  lastDeleted = { student: removed, index };
  saveStudents(students);
  renderDashboard();
  showToast(`Deleted ${removed.name} (${removed.roll}).`, true);
}

/* ---------- KPI & Spotlight Rendering ---------- */
function renderSummaryAndInsights() {
  const totalCount = students.length;
  document.getElementById("kpiTotalStudents").textContent = totalCount;

  const avgAttendance = totalCount
    ? students.reduce((sum, s) => sum + s.attendance, 0) / totalCount
    : 0;
  document.getElementById("kpiAvgAttendance").textContent =
    `Avg Attendance: ${avgAttendance.toFixed(1)}%`;

  const classAverage = totalCount
    ? students.reduce((sum, s) => sum + s.percentage, 0) / totalCount
    : 0;
  document.getElementById("kpiClassAverage").textContent = `${classAverage.toFixed(1)}%`;
  document.getElementById("kpiOverallGrade").textContent = totalCount
    ? `Overall Grade: ${calculateGrade(classAverage)}`
    : "Overall Grade: -";

  // Top Performer
  const topStudentCard = document.getElementById("topStudentCard");
  if (totalCount === 0) {
    document.getElementById("kpiTopStudentName").textContent = "None";
    document.getElementById("kpiTopStudentMeta").textContent = "No records yet";
    topStudentCard.innerHTML = `<div class="empty-highlight">Add student records to view the top performer.</div>`;
  } else {
    const topStudent = students.reduce((best, curr) =>
      curr.percentage > best.percentage ? curr : best
    );

    document.getElementById("kpiTopStudentName").textContent = topStudent.name;
    document.getElementById("kpiTopStudentMeta").textContent =
      `${topStudent.percentage}% (${topStudent.grade}) • ${topStudent.studentClass}`;

    topStudentCard.innerHTML = `
      <div class="top-student-header">
        <div>
          <h3 class="top-student-name">${escapeHtml(topStudent.name)}</h3>
          <p class="top-student-meta">
            Roll No: ${escapeHtml(topStudent.roll)} • ${escapeHtml(topStudent.studentClass)}
          </p>
        </div>
        <span class="grade-badge ${getGradeClass(topStudent.grade)}">
          Grade ${topStudent.grade}
        </span>
      </div>
      <div class="top-student-metrics">
        <div class="mini-metric">
          <span>Total Marks</span>
          <strong>${topStudent.total} / 500</strong>
        </div>
        <div class="mini-metric">
          <span>Percentage</span>
          <strong>${topStudent.percentage}%</strong>
        </div>
        <div class="mini-metric">
          <span>Attendance</span>
          <strong>${topStudent.attendance}%</strong>
        </div>
      </div>
      <div class="subject-chips">
        ${SUBJECTS.map(
          sub => `<span class="subject-chip">${sub.label}: <strong>${topStudent.marks[sub.key]}</strong></span>`
        ).join("")}
      </div>
    `;
  }

  // Students Needing Improvement
  const flagged = students.filter(needsImprovement);
  document.getElementById("kpiNeedsImprovementCount").textContent = flagged.length;
  document.getElementById("kpiNeedsImprovementMeta").textContent =
    flagged.length > 0 ? "Requires academic or attendance support" : "All students on track";
  document.getElementById("improvementBadge").textContent = `${flagged.length} Flagged`;

  const improvementList = document.getElementById("improvementList");
  if (totalCount === 0) {
    improvementList.innerHTML = `<div class="empty-highlight">No student records available yet.</div>`;
  } else if (flagged.length === 0) {
    improvementList.innerHTML = `<div class="empty-highlight">Great news! Every student has 60%+ marks and 75%+ attendance.</div>`;
  } else {
    improvementList.innerHTML = flagged
      .map(student => {
        const reasons = [];
        if (student.percentage < 60) reasons.push(`Score: ${student.percentage}% (Grade ${student.grade})`);
        if (student.attendance < 75) reasons.push(`Attendance: ${student.attendance}%`);
        const isAttendanceOnly = student.percentage >= 60 && student.attendance < 75;

        return `
          <div class="improvement-item ${isAttendanceOnly ? "attendance-only" : ""}">
            <div class="improvement-info">
              <strong>${escapeHtml(student.name)} (${escapeHtml(student.roll)})</strong>
              <span>${escapeHtml(student.studentClass)} • Total: ${student.total}/500</span>
            </div>
            <div class="improvement-reasons">
              ${reasons.map(r => `<div>${escapeHtml(r)}</div>`).join("")}
            </div>
          </div>
        `;
      })
      .join("");
  }
}

/* ---------- Table Rendering ---------- */
function renderTable(filteredList) {
  const tbody = document.getElementById("studentsTableBody");
  const emptyState = document.getElementById("tableEmptyState");
  const recordsCount = document.getElementById("recordsCount");

  recordsCount.textContent = `Showing ${filteredList.length} of ${students.length} student${students.length === 1 ? "" : "s"}`;

  if (filteredList.length === 0) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  tbody.innerHTML = filteredList
    .map(student => {
      const attClass = student.attendance < 75 ? "attendance-low" : "attendance-good";
      const rowClass = needsImprovement(student) ? "row-warning" : "";

      return `
        <tr class="${rowClass}">
          <td><strong>${escapeHtml(student.roll)}</strong></td>
          <td>${escapeHtml(student.name)}</td>
          <td>${escapeHtml(student.studentClass)}</td>
          <td><span class="attendance-pill ${attClass}">${student.attendance}%</span></td>
          <td>${student.marks.math}</td>
          <td>${student.marks.science}</td>
          <td>${student.marks.english}</td>
          <td>${student.marks.social}</td>
          <td>${student.marks.computer}</td>
          <td>${student.total} / 500</td>
          <td>${student.average.toFixed(2)}</td>
          <td><strong>${student.percentage.toFixed(2)}%</strong></td>
          <td><span class="grade-badge ${getGradeClass(student.grade)}">${student.grade}</span></td>
          <td>
            <button type="button" class="btn-delete" data-delete-id="${escapeHtml(student.id)}">
              Delete
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Event delegation for Delete buttons in the table
document.getElementById("studentsTableBody").addEventListener("click", event => {
  const deleteBtn = event.target.closest("[data-delete-id]");
  if (!deleteBtn) return;
  deleteStudentById(deleteBtn.getAttribute("data-delete-id"));
});

/* ---------- Canvas Charts (Responsive, Zero External Dependencies) ---------- */
function prepareCanvas(canvas) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(260, Math.floor(rect.width));
  const height = Math.max(220, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  return { ctx, width, height };
}

function drawBarChart(canvas, items, hitboxKey) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const pad = { top: 26, right: 16, bottom: 48, left: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  chartHitboxes[hitboxKey] = [];

  // Horizontal grid lines (0, 25, 50, 75, 100)
  ctx.font = "11px Segoe UI, sans-serif";
  ctx.textBaseline = "middle";
  for (let val = 0; val <= 100; val += 25) {
    const y = pad.top + plotH - (val / 100) * plotH;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.fillText(`${val}%`, pad.left - 8, y);
  }

  const slotW = plotW / items.length;
  const barW = Math.min(46, Math.max(14, slotW * 0.58));

  items.forEach((item, index) => {
    const barH = Math.max(2, (item.value / 100) * plotH);
    const x = pad.left + index * slotW + (slotW - barW) / 2;
    const y = pad.top + plotH - barH;

    // Rounded top bar
    const radius = Math.min(6, barW / 2, barH);
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(x, y + barH);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(x + barW - radius, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
    ctx.lineTo(x + barW, y + barH);
    ctx.closePath();
    ctx.fill();

    // Value label above bar (compact rounding on narrow slots so labels never overlap)
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const valueText = slotW < 42 ? `${Math.round(item.value)}%` : `${item.value.toFixed(1)}%`;
    ctx.fillText(valueText, x + barW / 2, y - 4);

    // X-axis label (truncated nicely if narrow)
    ctx.fillStyle = "#475569";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textBaseline = "top";
    const maxChars = slotW < 55 ? 5 : 11;
    const shortLabel = item.label.length > maxChars
      ? `${item.label.slice(0, maxChars - 1)}…`
      : item.label;
    ctx.fillText(shortLabel, x + barW / 2, pad.top + plotH + 10);

    chartHitboxes[hitboxKey].push({
      x,
      y,
      w: barW,
      h: barH,
      tooltip: item.tooltip
    });
  });
}

function drawGradeDistributionChart(canvas, list) {
  const { ctx, width, height } = prepareCanvas(canvas);
  const grades = ["A+", "A", "B", "C", "D"];
  const counts = grades.map(g => list.filter(s => s.grade === g).length);
  const total = list.length;

  chartHitboxes.performance = [];

  const isCompact = width < 380;
  const centerX = isCompact ? Math.min(width * 0.28, 92) : Math.min(width * 0.34, 150);
  const centerY = height / 2;
  const outerR = Math.max(36, Math.min(centerX - 14, height / 2 - 22));
  const innerR = outerR * 0.56;

  let startAngle = -Math.PI / 2;
  grades.forEach((grade, idx) => {
    const count = counts[idx];
    if (count === 0) return;
    const sliceAngle = (count / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerR, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = GRADE_COLORS[grade];
    ctx.fill();

    startAngle = endAngle;
  });

  // Center text inside donut
  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${isCompact ? 17 : 20}px Segoe UI, sans-serif`;
  ctx.fillText(String(total), centerX, centerY - 7);
  ctx.fillStyle = "#64748b";
  ctx.font = `${isCompact ? 11 : 12}px Segoe UI, sans-serif`;
  ctx.fillText("Students", centerX, centerY + 12);

  // Legend on the right (fits cleanly on both mobile and desktop)
  const legendX = centerX + outerR + (isCompact ? 18 : 28);
  const legendRight = width - 12;
  const startY = Math.max(24, centerY - 82);
  grades.forEach((grade, idx) => {
    const count = counts[idx];
    const pct = total ? ((count / total) * 100).toFixed(0) : 0;
    const rowY = startY + idx * 34;

    ctx.fillStyle = GRADE_COLORS[grade];
    ctx.fillRect(legendX, rowY, 12, 12);

    ctx.fillStyle = "#0f172a";
    ctx.font = `600 ${isCompact ? 12 : 13}px Segoe UI, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`Grade ${grade}`, legendX + 18, rowY + 6);

    ctx.fillStyle = "#64748b";
    ctx.font = `${isCompact ? 12 : 13}px Segoe UI, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(`${count} (${pct}%)`, legendRight, rowY + 6);

    chartHitboxes.performance.push({
      x: legendX,
      y: rowY - 4,
      w: Math.max(80, legendRight - legendX),
      h: 24,
      tooltip: `<strong>Grade ${grade}</strong><br>${count} student${count === 1 ? "" : "s"} (${pct}%)`
    });
  });
}

function renderCharts(filteredList) {
  const marksEmpty = document.getElementById("marksChartEmpty");
  const perfEmpty = document.getElementById("performanceChartEmpty");
  const marksSubtitle = document.getElementById("marksChartSubtitle");
  const perfSubtitle = document.getElementById("performanceChartSubtitle");

  if (filteredList.length === 0) {
    marksEmpty.classList.remove("hidden");
    perfEmpty.classList.remove("hidden");
    prepareCanvas(marksCanvas);
    prepareCanvas(performanceCanvas);
    chartHitboxes = { marks: [], performance: [] };
    return;
  }

  marksEmpty.classList.add("hidden");
  perfEmpty.classList.add("hidden");

  // 1. Marks Chart (By Student OR By Subject)
  if (marksChartView === "students") {
    marksSubtitle.textContent = "Overall percentage scored by each student";
    const studentItems = filteredList.map(s => ({
      label: s.name.split(" ")[0],
      value: s.percentage,
      color: GRADE_COLORS[s.grade],
      tooltip: `
        <strong>${escapeHtml(s.name)} (${escapeHtml(s.roll)})</strong><br>
        ${escapeHtml(s.studentClass)} • Grade ${s.grade} (${s.percentage}%)<br>
        Math: ${s.marks.math}, Sci: ${s.marks.science}, Eng: ${s.marks.english}<br>
        Soc: ${s.marks.social}, Comp: ${s.marks.computer}
      `
    }));
    drawBarChart(marksCanvas, studentItems, "marks");
  } else {
    marksSubtitle.textContent = "Average marks across the 5 subjects";
    const subjectColors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#0284c7"];
    const subjectItems = SUBJECTS.map((sub, idx) => {
      const avg = filteredList.reduce((sum, s) => sum + s.marks[sub.key], 0) / filteredList.length;
      return {
        label: sub.label,
        value: avg,
        color: subjectColors[idx],
        tooltip: `<strong>${sub.fullName}</strong><br>Average Score: ${avg.toFixed(2)} / 100`
      };
    });
    drawBarChart(marksCanvas, subjectItems, "marks");
  }

  // 2. Class Performance Chart (Class Averages OR Grade Distribution)
  if (perfChartView === "classes") {
    perfSubtitle.textContent = "Average percentage comparison across classes";
    const classMap = new Map();
    filteredList.forEach(s => {
      if (!classMap.has(s.studentClass)) classMap.set(s.studentClass, []);
      classMap.get(s.studentClass).push(s);
    });

    const classItems = [...classMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cls, members]) => {
        const avgPct = members.reduce((sum, m) => sum + m.percentage, 0) / members.length;
        const grade = calculateGrade(avgPct);
        return {
          label: cls,
          value: avgPct,
          color: GRADE_COLORS[grade],
          tooltip: `
            <strong>${escapeHtml(cls)}</strong><br>
            Students: ${members.length}<br>
            Class Avg: ${avgPct.toFixed(2)}% (Grade ${grade})
          `
        };
      });

    drawBarChart(performanceCanvas, classItems, "performance");
  } else {
    perfSubtitle.textContent = "Breakdown of student grades (A+ to D)";
    drawGradeDistributionChart(performanceCanvas, filteredList);
  }
}

/* ---------- Chart View Toggles & Hover Tooltips ---------- */
document.querySelectorAll("[data-marks-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    marksChartView = btn.getAttribute("data-marks-view");
    document.querySelectorAll("[data-marks-view]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderCharts(getFilteredStudents());
  });
});

document.querySelectorAll("[data-perf-view]").forEach(btn => {
  btn.addEventListener("click", () => {
    perfChartView = btn.getAttribute("data-perf-view");
    document.querySelectorAll("[data-perf-view]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderCharts(getFilteredStudents());
  });
});

function attachChartTooltip(canvas, hitboxKey) {
  canvas.addEventListener("mousemove", event => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hit = chartHitboxes[hitboxKey].find(
      box => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h
    );

    if (!hit) {
      chartTooltip.classList.add("hidden");
      canvas.style.cursor = "default";
      return;
    }

    canvas.style.cursor = "pointer";
    chartTooltip.innerHTML = hit.tooltip;
    chartTooltip.classList.remove("hidden");
    chartTooltip.style.left = `${Math.min(window.innerWidth - 250, event.clientX + 12)}px`;
    chartTooltip.style.top = `${Math.max(12, event.clientY - 12)}px`;
  });

  canvas.addEventListener("mouseleave", () => {
    chartTooltip.classList.add("hidden");
    canvas.style.cursor = "default";
  });
}

attachChartTooltip(marksCanvas, "marks");
attachChartTooltip(performanceCanvas, "performance");

/* ---------- Master Render Functions ---------- */
function renderTableAndCharts() {
  const filtered = getFilteredStudents();
  renderTable(filtered);
  renderCharts(filtered);
}

function renderDashboard() {
  populateClassFilter();
  renderSummaryAndInsights();
  renderTableAndCharts();
}

window.addEventListener("resize", () => {
  renderCharts(getFilteredStudents());
});

// Initialize Dashboard on Page Load
updateLivePreview();
renderDashboard();
