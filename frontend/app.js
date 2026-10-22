const API_BASE = "http://127.0.0.1:8000";
const HISTORY_KEY = "nandshield_scan_history";
let latestReport = null;
let currentResults = [];
let activeFilter = "all";

const byId = (id) => document.getElementById(id);

function getHistory() {
    try {
        const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function saveHistory(report) {
    const history = getHistory();

    history.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        scannedAt: new Date().toISOString(),
        totalTests: report.total_tests ?? 0,
        flaggedTests: report.flagged_tests ?? 0,
        passedTests: report.passed_tests ?? 0,
        totalFindings: report.total_findings ?? 0,
        severity: report.severity_breakdown ?? {},
        results: report.results ?? [],
        target: report.target ?? "Local Simulated Chatbot",
        note: report.note ?? ""
    });

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
    renderHistory();
    renderComparisonOptions();
}

async function checkConnection() {
    const status = byId("connection");

    try {
        const response = await fetch(`${API_BASE}/health`);
        if (!response.ok) throw new Error("API unavailable");

        const data = await response.json();
        status.textContent = `● API connected · ${data.status}`;
        status.style.color = "#4cdbad";
    } catch {
        status.textContent = "● API offline · Start the FastAPI backend.";
        status.style.color = "#ff657a";
    }
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function renderResults(results) {
    const container = byId("resultsList");
    currentResults = Array.isArray(results) ? results : [];

    if (currentResults.length === 0) {
        container.innerHTML = "<p class='muted'>No test results returned.</p>";
        return;
    }

    const filteredResults = currentResults.filter((result) => {
        const findings = Array.isArray(result.findings) ? result.findings : [];

        if (activeFilter === "flagged") return Boolean(result.vulnerable);
        if (activeFilter === "passed") return !result.vulnerable;
        if (["high", "medium", "low"].includes(activeFilter)) {
            return findings.some(
                (finding) => String(finding.severity).toLowerCase() === activeFilter
            );
        }
        return true;
    });

    if (filteredResults.length === 0) {
        container.innerHTML = "<p class='muted'>No tests match this filter.</p>";
        return;
    }

    container.innerHTML = filteredResults.map((result) => {
        const vulnerable = Boolean(result.vulnerable);
        const findings = Array.isArray(result.findings) ? result.findings : [];

        const visibleFindings = findings.filter((finding) => {
            return !["high", "medium", "low"].includes(activeFilter)
                || String(finding.severity).toLowerCase() === activeFilter;
        });

        const findingHTML = visibleFindings.length
            ? visibleFindings.map((finding) => {
                const severity = String(finding.severity || "Low").toLowerCase();

                return `
                    <div class="finding-detail">
                        <div class="finding-heading">
                            <span class="badge ${escapeHTML(severity)}">${escapeHTML(finding.severity || "Low")}</span>
                            <strong>${escapeHTML(finding.category || "Security Finding")}</strong>
                        </div>
                        <p><strong>Evidence</strong></p>
                        <p>${escapeHTML(finding.evidence || "No evidence supplied.")}</p>
                        <p><strong>What it means</strong></p>
                        <p>${escapeHTML(finding.description || "No description supplied by the scanner.")}</p>
                        <div class="recommendation">
                            <p><strong>Recommended mitigation</strong></p>
                            <p>${escapeHTML(finding.recommendation || "Review this finding and apply appropriate security controls.")}</p>
                        </div>
                    </div>
                `;
            }).join("")
            : (vulnerable
                ? ""
                : "<p class='muted'>No known issues detected by these demo checks.</p>");

        return `
            <article class="result">
                <div class="result-top">
                    <h3>${escapeHTML(result.test)}</h3>
                    <span class="badge ${vulnerable ? "high" : "pass"}">${vulnerable ? "FLAGGED" : "PASS"}</span>
                </div>
                <p><strong>Test prompt:</strong> ${escapeHTML(result.attack_prompt)}</p>
                <p class="response"><strong>Simulated response:</strong> ${escapeHTML(result.response)}</p>
                ${findingHTML}
            </article>
        `;
    }).join("");
}

function setFilter(filter) {
    activeFilter = filter;

    document.querySelectorAll("[data-filter]").forEach((button) => {
        const selected = button.dataset.filter === filter;
        button.classList.toggle("filter-active", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    renderResults(currentResults);
}

function renderHistory() {
    const container = byId("historyList");
    if (!container) return;

    const history = getHistory();
    const count = byId("historyCount");

    if (count) {
        count.textContent = `${history.length} saved scan${history.length === 1 ? "" : "s"}`;
    }

    if (history.length === 0) {
        container.innerHTML = "<p class='muted'>No saved scans yet. Run a security scan to build your history.</p>";
        return;
    }

    container.innerHTML = history.map((scan) => {
        const date = new Date(scan.scannedAt);
        const formattedDate = Number.isNaN(date.getTime())
            ? "Unknown date"
            : date.toLocaleString();

        return `
            <article class="history-item">
                <div class="history-info">
                    <strong>${escapeHTML(formattedDate)}</strong>
                    <span class="muted">${escapeHTML(scan.target)}</span>
                </div>
                <div class="history-stats">
                    <span>${Number(scan.totalTests) || 0} tests</span>
                    <span class="red">${Number(scan.flaggedTests) || 0} flagged</span>
                    <span class="green">${Number(scan.passedTests) || 0} passed</span>
                    <span>${Number(scan.totalFindings) || 0} findings</span>
                </div>
                <button class="history-view" data-scan-id="${escapeHTML(scan.id)}">View report</button>
            </article>
        `;
    }).join("");

    container.querySelectorAll(".history-view").forEach((button) => {
        button.addEventListener("click", () => viewHistoryReport(button.dataset.scanId));
    });
}

function viewHistoryReport(id) {
    const scan = getHistory().find((item) => item.id === id);
    if (!scan) return;

    byId("total").textContent = scan.totalTests ?? 0;
    byId("flagged").textContent = scan.flaggedTests ?? 0;
    byId("passed").textContent = scan.passedTests ?? 0;
    byId("findings").textContent = scan.totalFindings ?? 0;
    byId("high").textContent = scan.severity?.High ?? 0;
    byId("medium").textContent = scan.severity?.Medium ?? 0;
    byId("low").textContent = scan.severity?.Low ?? 0;

    latestReport = {
        target: scan.target,
        total_tests: scan.totalTests,
        flagged_tests: scan.flaggedTests,
        passed_tests: scan.passedTests,
        total_findings: scan.totalFindings,
        severity_breakdown: scan.severity,
        results: scan.results,
        note: scan.note
    };

    byId("exportBtn").disabled = false;
    byId("scanStatus").textContent = "HISTORY VIEW";
    setFilter("all");
    byId("results").scrollIntoView({ behavior: "smooth" });
}

function clearHistory() {
    if (getHistory().length === 0) {
        alert("There is no scan history to clear.");
        return;
    }

    if (!confirm("Delete all saved scan history from this browser?")) return;

    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    renderComparisonOptions();
}

function exportReport() {
    if (!latestReport) {
        alert("Run a security scan or open a saved report first.");
        return;
    }

    const report = {
        project: "NandShield AI",
        generated_at: new Date().toISOString(),
        target: latestReport.target,
        summary: {
            total_tests: latestReport.total_tests,
            flagged_tests: latestReport.flagged_tests,
            passed_tests: latestReport.passed_tests,
            total_findings: latestReport.total_findings,
            severity_breakdown: latestReport.severity_breakdown
        },
        results: latestReport.results,
        note: latestReport.note
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nandshield-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function runScan() {
    const button = byId("scanBtn");
    button.disabled = true;
    button.textContent = "Scanning...";
    byId("scanStatus").textContent = "RUNNING";

    try {
        const response = await fetch(`${API_BASE}/security/run-all`, { method: "POST" });
        if (!response.ok) throw new Error(`Scan request failed (${response.status})`);

        const report = await response.json();
        latestReport = report;

        byId("total").textContent = report.total_tests ?? 0;
        byId("flagged").textContent = report.flagged_tests ?? 0;
        byId("passed").textContent = report.passed_tests ?? 0;
        byId("findings").textContent = report.total_findings ?? 0;

        const severity = report.severity_breakdown || {};
        byId("high").textContent = severity.High ?? 0;
        byId("medium").textContent = severity.Medium ?? 0;
        byId("low").textContent = severity.Low ?? 0;

        setFilter("all");
        renderResults(report.results);
        saveHistory(report);

        byId("scanStatus").textContent = "SCAN COMPLETE";
        byId("connection").textContent = "● Scan completed · Results are from the local simulated chatbot.";
        byId("connection").style.color = "#4cdbad";
        byId("exportBtn").disabled = false;
    } catch (error) {
        byId("scanStatus").textContent = "SCAN FAILED";
        byId("connection").textContent = `● ${error.message}. Check the backend at ${API_BASE}.`;
        byId("connection").style.color = "#ff657a";
    } finally {
        button.disabled = false;
        button.textContent = "▶ Run All Tests";
    }
}

document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
});

renderHistory();
checkConnection();

// ===== NANDSHIELD CINEMATIC INTRO TRANSITION =====
window.addEventListener("load", () => {
    const intro = document.getElementById("ns-intro");
    if (!intro) return;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
        intro.remove();
        return;
    }

    document.body.classList.add("ns-dashboard-prep");

    // Allow the logo reveal to finish before launching the wordmark.
    window.setTimeout(() => {
        intro.classList.add("ns-intro-launch");
        document.body.classList.remove("ns-dashboard-prep");
        document.body.classList.add("ns-dashboard-enter");

        window.setTimeout(() => {
            intro.remove();
            document.body.classList.remove("ns-dashboard-enter");
        }, 1100);
    }, 1650);
});

// ===== SCAN COMPARISON =====
function renderComparisonOptions() {
    const olderSelect = byId("compareOlder");
    const newerSelect = byId("compareNewer");
    const button = byId("compareBtn");
    if (!olderSelect || !newerSelect || !button) return;

    const history = getHistory();
    const previousOlder = olderSelect.value;
    const previousNewer = newerSelect.value;

    const options = history.map((scan) => {
        const date = new Date(scan.scannedAt);
        const label = Number.isNaN(date.getTime())
            ? "Unknown date"
            : date.toLocaleString();
        return {
            id: String(scan.id),
            label: `${label} · ${Number(scan.totalFindings) || 0} findings`
        };
    });

    const makeOptions = (selectedId) => {
        if (!options.length) {
            return '<option value="">No saved scans</option>';
        }
        return options.map((option) =>
            `<option value="${escapeHTML(option.id)}">${escapeHTML(option.label)}</option>`
        ).join("");
    };

    olderSelect.innerHTML = makeOptions(previousOlder);
    newerSelect.innerHTML = makeOptions(previousNewer);

    if (options.some((option) => option.id === previousOlder)) {
        olderSelect.value = previousOlder;
    } else if (options.length > 1) {
        olderSelect.value = options[1].id;
    } else if (options.length) {
        olderSelect.value = options[0].id;
    }

    if (options.some((option) => option.id === previousNewer)) {
        newerSelect.value = previousNewer;
    } else if (options.length) {
        newerSelect.value = options[0].id;
    }

    button.disabled = history.length < 2;

    const message = byId("comparisonMessage");
    if (history.length < 2) {
        message.textContent = "Save at least two scans to compare their results.";
        byId("comparisonSummary").innerHTML = "";
        byId("comparisonChanges").innerHTML = "";
    } else {
        message.textContent = "Choose the older and newer reports, then compare.";
    }
}

function getComparisonFindings(scan) {
    const items = [];
    const results = Array.isArray(scan?.results) ? scan.results : [];

    results.forEach((result) => {
        const findings = Array.isArray(result.findings) ? result.findings : [];
        findings.forEach((finding) => {
            const test = String(result.test || "Unknown test").trim();
            const category = String(finding.category || "Security Finding").trim();
            const description = String(finding.description || "").trim();

            // Keep the identity stable across severity changes.
            const key = `${test.toLowerCase()}|${category.toLowerCase()}|${description.toLowerCase()}`;
            items.push({
                key,
                test,
                category,
                description: description || "No description supplied.",
                severity: String(finding.severity || "Low"),
                evidence: String(finding.evidence || ""),
                recommendation: String(finding.recommendation || "")
            });
        });
    });

    return items;
}

function compareSavedScans() {
    const history = getHistory();
    const olderId = byId("compareOlder")?.value;
    const newerId = byId("compareNewer")?.value;
    const older = history.find((scan) => String(scan.id) === olderId);
    const newer = history.find((scan) => String(scan.id) === newerId);
    const message = byId("comparisonMessage");
    const summary = byId("comparisonSummary");
    const changes = byId("comparisonChanges");

    if (!older || !newer) {
        message.textContent = "Select two saved scans to continue.";
        summary.innerHTML = "";
        changes.innerHTML = "";
        return;
    }

    if (String(older.id) === String(newer.id)) {
        message.textContent = "Choose two different scans for a meaningful comparison.";
        summary.innerHTML = "";
        changes.innerHTML = "";
        return;
    }

    const oldFindings = getComparisonFindings(older);
    const newFindings = getComparisonFindings(newer);
    const oldMap = new Map(oldFindings.map((item) => [item.key, item]));
    const newMap = new Map(newFindings.map((item) => [item.key, item]));
    const newItems = [];
    const resolvedItems = [];
    const unchangedItems = [];
    const severityChanges = [];

    newMap.forEach((item, key) => {
        if (!oldMap.has(key)) {
            newItems.push(item);
        } else {
            const oldItem = oldMap.get(key);
            unchangedItems.push(item);
            if (oldItem.severity.toLowerCase() !== item.severity.toLowerCase()) {
                severityChanges.push({
                    ...item,
                    previousSeverity: oldItem.severity
                });
            }
        }
    });

    oldMap.forEach((item, key) => {
        if (!newMap.has(key)) resolvedItems.push(item);
    });

    const metrics = [
        { label: "New findings", value: newItems.length, kind: "new" },
        { label: "Resolved findings", value: resolvedItems.length, kind: "resolved" },
        { label: "Unchanged findings", value: unchangedItems.length, kind: "unchanged" },
        { label: "Severity changes", value: severityChanges.length, kind: "changed" }
    ];

    summary.innerHTML = metrics.map((metric) => `
        <article class="comparison-metric ${metric.kind}">
            <span>${escapeHTML(metric.label)}</span>
            <strong>${metric.value}</strong>
        </article>
    `).join("");

    const sections = [
        { title: "New findings", items: newItems, kind: "new" },
        { title: "Resolved findings", items: resolvedItems, kind: "resolved" },
        { title: "Unchanged findings", items: unchangedItems, kind: "unchanged" },
        { title: "Severity changes", items: severityChanges, kind: "changed" }
    ];

    changes.innerHTML = sections.map((section) => {
        const entries = section.items.length
            ? section.items.map((item) => {
                const severityLine = section.kind === "changed"
                    ? `<p class="muted">Severity: ${escapeHTML(item.previousSeverity)} → ${escapeHTML(item.severity)}</p>`
                    : `<p class="muted">Severity: ${escapeHTML(item.severity)}</p>`;

                return `
                    <article class="comparison-item">
                        <div class="comparison-item-heading">
                            <strong>${escapeHTML(item.category)}</strong>
                            <span class="badge ${escapeHTML(item.severity.toLowerCase())}">${escapeHTML(item.severity)}</span>
                        </div>
                        <p class="muted">${escapeHTML(item.test)}</p>
                        ${severityLine}
                        <p>${escapeHTML(item.description)}</p>
                    </article>
                `;
            }).join("")
            : '<p class="muted comparison-empty">No items in this category.</p>';

        return `
            <section class="comparison-group ${section.kind}">
                <h3>${escapeHTML(section.title)} <span>${section.items.length}</span></h3>
                ${entries}
            </section>
        `;
    }).join("");

    const oldDate = new Date(older.scannedAt).toLocaleString();
    const newDate = new Date(newer.scannedAt).toLocaleString();
    message.textContent = `Comparing ${oldDate} → ${newDate}. Findings are matched by test, category, and description.`;

    byId("comparison").scrollIntoView({ behavior: "smooth", block: "start" });
}

const comparisonButton = byId("compareBtn");
if (comparisonButton) {
    comparisonButton.addEventListener("click", compareSavedScans);
}

renderComparisonOptions();
