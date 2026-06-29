// --- Data Structures for Calendar Logic ---
const YEAR = 2026;

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Public holidays in Spain/Autonomous Community for 2026
const FESTIVOS = {
    "1-1": "Año Nuevo",
    "1-6": "Epifanía / Día de Reyes",
    "4-2": "Jueves Santo",
    "4-3": "Viernes Santo",
    "4-23": "Día de Aragón",
    "5-1": "Día del Trabajo",
    "8-15": "Asunción de la Virgen",
    "9-8": "Festivo Local (Día de Asturias / Extremadura)",
    "9-9": "Festivo Local",
    "10-12": "Fiesta Nacional de España",
    "11-2": "Todos los Santos (trasladado al lunes)",
    "12-7": "Día de la Constitución (trasladado al lunes)",
    "12-8": "Inmaculada Concepción",
    "12-25": "Navidad"
};

// Vacation days (Yellow) - Original and new user requests
const VACACIONES = new Set([
    "1-2", // Original
    // Agosto
    "8-3", "8-4", "8-5", "8-6", "8-7",
    "8-10", "8-11", "8-12", "8-13", "8-14",
    // Octubre
    "10-26", "10-27", "10-28", "10-29", "10-30",
    // Noviembre
    "11-3", "11-4", "11-5", "11-6",
    // Diciembre
    "12-24", "12-31"
]);

// Adjustment days (Light Blue) - Original and new user requests
const AJUSTES = new Set([
    "1-5", // Original
    "9-7", // Septiembre 7
    // Diciembre
    "12-21", "12-22", "12-23",
    "12-28", "12-29", "12-30"
]);

// --- Helper Functions ---

// Calculate ISO Week Number for a Date
function getISOWeek(date) {
    const tempDate = new Date(date.valueOf());
    const dayNum = (date.getDay() + 6) % 7;
    tempDate.setDate(tempDate.getDate() - dayNum + 3);
    const firstThursday = tempDate.valueOf();
    tempDate.setMonth(0, 1);
    if (tempDate.getDay() !== 4) {
        tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
    }
    return 1 + Math.ceil((firstThursday - tempDate) / 604800000);
}

// Get the details of a day: type (M, T, N, FESTIVO, etc.), label, shift label, isWorkDay
function getDayDetails(year, month, day) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    const dateKey = `${month + 1}-${day}`;
    const isoWeek = getISOWeek(date);

    // Default status
    let type = "DESCANSO";
    let label = "Descanso";
    let shiftCode = "";
    let isWorkDay = false;

    // Check overlays
    if (FESTIVOS[dateKey]) {
        type = "FESTIVO";
        label = `Festivo: ${FESTIVOS[dateKey]}`;
    } else if (VACACIONES.has(dateKey)) {
        type = "VACACIONES";
        label = "Vacaciones";
    } else if (AJUSTES.has(dateKey)) {
        type = "AJUSTE";
        label = "Día de Ajuste";
    } else {
        // It's a standard day (work or rest)
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        if (isWeekend) {
            type = "DESCANSO";
            label = "Fin de Semana (Descanso)";
        } else {
            // Weekday: Calculate base shift based on ISO week
            // 6-week cycle: T, T, M, M, N, N
            // (isoWeek - 2) % 6:
            // 0, 1 -> T
            // 2, 3 -> M
            // 4, 5 -> N
            const cycleIndex = (isoWeek - 2 + 600) % 6; // Add 600 to prevent negative remainder

            isWorkDay = true;
            if (cycleIndex === 0 || cycleIndex === 1) {
                type = "T";
                label = "Turno de Tarde (T)";
                shiftCode = "T";
            } else if (cycleIndex === 2 || cycleIndex === 3) {
                type = "M";
                label = "Turno de Mañana (M)";
                shiftCode = "M";
            } else {
                type = "N";
                label = "Turno de Noche (N)";
                shiftCode = "N";
            }
        }
    }

    return { type, label, shiftCode, isWorkDay, date, isoWeek };
}

// Generate the whole year grid
function generateCalendar() {
    const gridContainer = document.getElementById("calendar-grid");
    gridContainer.innerHTML = "";

    const stats = {
        totalWork: 0,
        m: 0,
        t: 0,
        n: 0,
        vac: 0,
        ajuste: 0,
        festivo: 0,
        descanso: 0
    };

    // Render 12 months
    for (let month = 0; month < 12; month++) {
        // Month Card Container
        const monthCard = document.createElement("div");
        monthCard.className = "month-card";

        // Title
        const title = document.createElement("div");
        title.className = "month-title";
        title.textContent = MONTH_NAMES[month];
        monthCard.appendChild(title);

        // Grid
        const monthGrid = document.createElement("div");
        monthGrid.className = "month-grid";

        // Headers
        // Week number column header
        const wHeader = document.createElement("div");
        wHeader.className = "grid-header week-col";
        wHeader.textContent = "w";
        monthGrid.appendChild(wHeader);

        // Weekdays L M X J V S D
        WEEKDAYS.forEach(day => {
            const dayHeader = document.createElement("div");
            dayHeader.className = "grid-header";
            dayHeader.textContent = day;
            monthGrid.appendChild(dayHeader);
        });

        // Days rendering
        const firstDayDate = new Date(YEAR, month, 1);
        const numDays = new Date(YEAR, month + 1, 0).getDate();

        // 1st of month weekday (1 = Mon, 7 = Sun)
        const startDayOfWeek = firstDayDate.getDay() === 0 ? 7 : firstDayDate.getDay();
        const leadingEmptyCells = startDayOfWeek - 1;

        // Build list of cells for this month
        const cells = [];

        // Add leading empty cells
        for (let i = 0; i < leadingEmptyCells; i++) {
            cells.push({ type: "empty" });
        }

        // Add days of the month
        for (let day = 1; day <= numDays; day++) {
            const details = getDayDetails(YEAR, month, day);
            cells.push({ type: "day", day, details });

            // Accumulate stats
            if (details.type === "M") stats.m++;
            else if (details.type === "T") stats.t++;
            else if (details.type === "N") stats.n++;
            else if (details.type === "VACACIONES") stats.vac++;
            else if (details.type === "AJUSTE") stats.ajuste++;
            else if (details.type === "FESTIVO") stats.festivo++;
            else if (details.type === "DESCANSO") stats.descanso++;
        }

        // Fill trailing cells to align with full weeks
        const totalCells = cells.length;
        const trailingEmptyCells = (7 - (totalCells % 7)) % 7;
        for (let i = 0; i < trailingEmptyCells; i++) {
            cells.push({ type: "empty" });
        }

        // Group cells into weeks (7 cells per week row)
        const numWeeks = cells.length / 7;
        for (let w = 0; w < numWeeks; w++) {
            const weekCells = cells.slice(w * 7, (w + 1) * 7);

            // Determine ISO Week Number for this row
            // We find the first actual day in this week row to determine its ISO Week
            const firstActualDayCell = weekCells.find(c => c.type === "day");
            let rowISOWeek = "";
            if (firstActualDayCell) {
                rowISOWeek = firstActualDayCell.details.isoWeek;
            } else {
                // Should not happen, but fallback
                rowISOWeek = getISOWeek(new Date(YEAR, month, 1));
            }

            // 1. Add Week Number Cell
            const weekCell = document.createElement("div");
            weekCell.className = "grid-cell week-cell";
            weekCell.textContent = rowISOWeek;
            monthGrid.appendChild(weekCell);

            // 2. Add Day Cells
            weekCells.forEach(cell => {
                const cellDiv = document.createElement("div");

                if (cell.type === "empty") {
                    cellDiv.className = "grid-cell empty-cell";
                } else {
                    const d = cell.details;
                    cellDiv.className = `grid-cell day-cell shift-${d.type}`;
                    
                    // Formatting ISO date string for standard date attributes
                    const year = d.date.getFullYear();
                    const monthVal = String(d.date.getMonth() + 1).padStart(2, '0');
                    const dayVal = String(d.date.getDate()).padStart(2, '0');
                    const dateISOString = `${year}-${monthVal}-${dayVal}`;
                    cellDiv.setAttribute("data-date", dateISOString);
                    cellDiv.setAttribute("data-tooltip-label", d.label);

                    // Day Number
                    const dayNumSpan = document.createElement("span");
                    dayNumSpan.className = "day-num";
                    dayNumSpan.textContent = cell.day;
                    cellDiv.appendChild(dayNumSpan);

                    // Shift Label (M, T, N) below number if applicable
                    if (d.shiftCode) {
                        const shiftLabelSpan = document.createElement("span");
                        shiftLabelSpan.className = "day-shift-label";
                        shiftLabelSpan.textContent = d.shiftCode;
                        cellDiv.appendChild(shiftLabelSpan);
                    }
                }

                monthGrid.appendChild(cellDiv);
            });
        }

        monthCard.appendChild(monthGrid);
        gridContainer.appendChild(monthCard);
    }

    // Workdays count is sum of M, T, N
    stats.totalWork = stats.m + stats.t + stats.n;

    // Render stats on Dashboard
    document.getElementById("stat-total-work").textContent = stats.totalWork;
    document.getElementById("stat-m").textContent = stats.m;
    document.getElementById("stat-t").textContent = stats.t;
    document.getElementById("stat-n").textContent = stats.n;
    document.getElementById("stat-vac").textContent = stats.vac;
    document.getElementById("stat-ajuste").textContent = stats.ajuste;
    document.getElementById("stat-festivo").textContent = stats.festivo;
    document.getElementById("stat-descanso").textContent = stats.descanso;
}

// --- DOM Event Listeners & Bootstrapping ---

document.addEventListener("DOMContentLoaded", () => {
    // 1. Theme Selection
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const btnTheme = document.getElementById("btn-theme");
    btnTheme.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
    });

    // 2. Generate Calendar
    generateCalendar();

    // 3. Filtering Logic
    const filterSelect = document.getElementById("shift-filter");
    filterSelect.addEventListener("change", (e) => {
        const filter = e.target.value;
        const cells = document.querySelectorAll(".day-cell");

        cells.forEach(cell => {
            const isMatch = (filter === "all") || 
                            (filter === "M" && cell.classList.contains("shift-M")) ||
                            (filter === "T" && cell.classList.contains("shift-T")) ||
                            (filter === "N" && cell.classList.contains("shift-N")) ||
                            (filter === "FESTIVO" && cell.classList.contains("shift-FESTIVO")) ||
                            (filter === "VACACIONES" && cell.classList.contains("shift-VACACIONES")) ||
                            (filter === "AJUSTE" && cell.classList.contains("shift-AJUSTE"));

            if (isMatch) {
                cell.classList.remove("fade-out");
            } else {
                cell.classList.add("fade-out");
            }
        });
    });

    // 4. Click legend to trigger filters
    const legendItems = document.querySelectorAll(".legend-item");
    legendItems.forEach(item => {
        item.addEventListener("click", () => {
            const type = item.getAttribute("data-type");
            filterSelect.value = type;
            filterSelect.dispatchEvent(new Event("change"));
        });
    });

    // 5. Tooltip Interactive Hover
    const tooltip = document.getElementById("tooltip");

    document.addEventListener("mouseover", (e) => {
        const dayCell = e.target.closest(".day-cell");
        if (dayCell) {
            const label = dayCell.getAttribute("data-tooltip-label");
            const dateStr = dayCell.getAttribute("data-date");
            
            // Format Spanish date
            const parts = dateStr.split('-');
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const formattedDate = dateObj.toLocaleDateString('es-ES', options);
            const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            
            tooltip.innerHTML = `<strong>${capitalizedDate}</strong><br>${label}`;
            tooltip.style.opacity = 1;
            tooltip.setAttribute("aria-hidden", "false");
        }
    });

    document.addEventListener("mousemove", (e) => {
        const dayCell = e.target.closest(".day-cell");
        if (dayCell) {
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;
            let x = e.pageX + 15;
            let y = e.pageY + 15;

            // Constrain within viewport boundaries
            if (x + tooltipWidth > window.innerWidth + window.scrollX) {
                x = e.pageX - tooltipWidth - 15;
            }
            if (y + tooltipHeight > window.innerHeight + window.scrollY) {
                y = e.pageY - tooltipHeight - 15;
            }

            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
        }
    });

    document.addEventListener("mouseout", (e) => {
        if (e.target.closest(".day-cell")) {
            tooltip.style.opacity = 0;
            tooltip.setAttribute("aria-hidden", "true");
        }
    });

    // 6. Print Action
    const btnPrint = document.getElementById("btn-print");
    btnPrint.addEventListener("click", () => {
        window.print();
    });

    // 7. JPG High-Quality Export Action (with clone off-screen rendering to prevent mobile clipping)
    const btnDownload = document.getElementById("btn-download");
    btnDownload.addEventListener("click", () => {
        btnDownload.innerHTML = `
            <svg class="spinner-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;animation:spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            Generando...
        `;
        btnDownload.disabled = true;

        let wrapper = null;

        try {
            // Check if html2canvas is loaded
            if (typeof html2canvas === "undefined") {
                throw new Error("La librería html2canvas no se ha cargado. Verifica tu conexión a internet o el archivo local.");
            }

            // Clone element for standard rendering context
            const sourceElement = document.getElementById("calendar-canvas");
            const clone = sourceElement.cloneNode(true);

            // Create invisible wrapper in layout flow (behind body)
            wrapper = document.createElement("div");
            wrapper.id = "html2canvas-export-wrapper";
            wrapper.style.position = "fixed";
            wrapper.style.top = "0";
            wrapper.style.left = "0";
            wrapper.style.width = "1200px";
            wrapper.style.height = "auto";
            wrapper.style.zIndex = "-99999";
            wrapper.style.pointerEvents = "none";
            wrapper.style.overflow = "hidden";

            // Style clone to fit within wrapper
            clone.style.position = "relative";
            clone.style.width = "1200px";
            clone.style.margin = "0";
            clone.style.boxShadow = "none";
            clone.style.borderRadius = "0";
            clone.classList.remove("no-print");

            // Style the grid in clone to force a neat 3-column layout
            const cloneGrid = clone.querySelector("#calendar-grid");
            if (cloneGrid) {
                cloneGrid.style.width = "100%";
                cloneGrid.style.display = "grid";
                cloneGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
                cloneGrid.style.minWidth = "0";
                cloneGrid.style.gap = "1.5rem";
            }

            wrapper.appendChild(clone);
            document.body.appendChild(wrapper);

            // Determine correct background color based on theme
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            const bgColor = isDark ? "#0f172a" : "#ffffff";

            // Wait brief moment for layout engine to stabilize in DOM
            setTimeout(() => {
                html2canvas(clone, {
                    scale: 3, // High resolution for mobile screen and paper print
                    useCORS: true,
                    logging: true, // Enable debug logs in browser console
                    backgroundColor: bgColor
                }).then(canvas => {
                    canvas.toBlob(blob => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `Calendario_Rotacion_C_5-2_${YEAR}.jpg`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);

                        // Restore button state
                        btnDownload.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Descargar JPG
                        `;
                        btnDownload.disabled = false;
                        if (wrapper && wrapper.parentNode) {
                            document.body.removeChild(wrapper);
                        }
                    }, "image/jpeg", 0.95);
                }).catch(err => {
                    console.error("Export failure inside promise:", err);
                    alert("Error al procesar la imagen: " + err.message);
                    resetButton();
                });
            }, 150);

        } catch (err) {
            console.error("Export failure synchronous:", err);
            alert("Error al iniciar la descarga: " + err.message);
            resetButton();
        }

        function resetButton() {
            btnDownload.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon-svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Descargar JPG
            `;
            btnDownload.disabled = false;
            if (wrapper && wrapper.parentNode) {
                document.body.removeChild(wrapper);
            }
        }
    });
});

// Inject keyframe animation dynamically for the loading spinner
const styleElement = document.createElement("style");
styleElement.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(styleElement);
