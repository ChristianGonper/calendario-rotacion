// Validation script to verify that the shift logic matches the specifications

const FESTIVOS = {
    "1-1": "Año Nuevo",
    "1-6": "Epifanía / Día de Reyes",
    "4-2": "Jueves Santo",
    "4-3": "Viernes Santo",
    "4-23": "Día de Aragón",
    "5-1": "Día del Trabajo",
    "8-15": "Asunción de la Virgen",
    "9-8": "Festivo Local (Asturias/Extremadura)",
    "9-9": "Festivo Local",
    "10-12": "Fiesta Nacional de España",
    "11-2": "Todos los Santos (trasladado)",
    "12-7": "Día de la Constitución (trasladado)",
    "12-8": "Inmaculada Concepción",
    "12-25": "Navidad"
};

const VACACIONES = new Set([
    "1-2",
    "8-3", "8-4", "8-5", "8-6", "8-7",
    "8-10", "8-11", "8-12", "8-13", "8-14",
    "10-26", "10-27", "10-28", "10-29", "10-30",
    "11-3", "11-4", "11-5", "11-6",
    "12-24", "12-31"
]);

const AJUSTES = new Set([
    "1-5",
    "9-7",
    "12-21", "12-22", "12-23",
    "12-28", "12-29", "12-30"
]);

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

function getDayDetails(year, month, day) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const dateKey = `${month + 1}-${day}`;
    const isoWeek = getISOWeek(date);

    let type = "DESCANSO";
    let label = "Descanso";
    let isWorkDay = false;

    if (FESTIVOS[dateKey]) {
        type = "FESTIVO";
        label = `Festivo: ${FESTIVOS[dateKey]}`;
    } else if (VACACIONES.has(dateKey)) {
        type = "VACACIONES";
        label = "Vacaciones";
    } else if (AJUSTES.has(dateKey)) {
        type = "AJUSTE";
        label = "Ajuste";
    } else {
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        if (isWeekend) {
            type = "DESCANSO";
            label = "Fin de Semana";
        } else {
            const cycleIndex = (isoWeek - 2 + 600) % 6;
            isWorkDay = true;
            if (cycleIndex === 0 || cycleIndex === 1) {
                type = "T";
                label = "Tarde";
            } else if (cycleIndex === 2 || cycleIndex === 3) {
                type = "M";
                label = "Mañana";
            } else {
                type = "N";
                label = "Noche";
            }
        }
    }
    return { type, label, isWorkDay, isoWeek };
}

// Running Assertions
let errors = 0;
function assert(condition, message) {
    if (!condition) {
        console.error("❌ FAILED: " + message);
        errors++;
    } else {
        console.log("✅ PASSED: " + message);
    }
}

console.log("=== INICIANDO VALIDACIÓN DEL CALENDARIO LABORAL 2026 ===");

// Test original exceptions
assert(getDayDetails(2026, 0, 2).type === "VACACIONES", "Enero 2 es Vacaciones");
assert(getDayDetails(2026, 0, 5).type === "AJUSTE", "Enero 5 es Ajuste");

// Test August modifications
for (let d = 3; d <= 7; d++) {
    assert(getDayDetails(2026, 7, d).type === "VACACIONES", `Agosto ${d} es Vacaciones`);
}
for (let d = 10; d <= 14; d++) {
    assert(getDayDetails(2026, 7, d).type === "VACACIONES", `Agosto ${d} es Vacaciones`);
}

// Test September modifications
assert(getDayDetails(2026, 8, 7).type === "AJUSTE", "Septiembre 7 es Ajuste");

// Test October modifications
for (let d = 26; d <= 30; d++) {
    assert(getDayDetails(2026, 9, d).type === "VACACIONES", `Octubre ${d} es Vacaciones`);
}

// Test November modifications
assert(getDayDetails(2026, 10, 2).type === "FESTIVO", "Noviembre 2 es Festivo");
for (let d = 3; d <= 6; d++) {
    assert(getDayDetails(2026, 10, d).type === "VACACIONES", `Noviembre ${d} es Vacaciones`);
}

// Test December modifications
for (let d = 21; d <= 23; d++) {
    assert(getDayDetails(2026, 11, d).type === "AJUSTE", `Diciembre ${d} es Ajuste`);
}
assert(getDayDetails(2026, 11, 24).type === "VACACIONES", "Diciembre 24 es Vacaciones");
assert(getDayDetails(2026, 11, 25).type === "FESTIVO", "Diciembre 25 es Festivo");
for (let d = 28; d <= 30; d++) {
    assert(getDayDetails(2026, 11, d).type === "AJUSTE", `Diciembre ${d} es Ajuste`);
}
assert(getDayDetails(2026, 11, 31).type === "VACACIONES", "Diciembre 31 es Vacaciones");

// Test regular shift rotation alignment with the image
assert(getDayDetails(2026, 1, 2).type === "N", "Febrero 2 es Noche (Semana 6)");
assert(getDayDetails(2026, 1, 23).type === "T", "Febrero 23 es Tarde (Semana 9)");
assert(getDayDetails(2026, 2, 2).type === "M", "Marzo 2 es Mañana (Semana 10)");
assert(getDayDetails(2026, 2, 16).type === "N", "Marzo 16 es Noche (Semana 12)");
assert(getDayDetails(2026, 5, 1).type === "M", "Junio 1 es Mañana (Semana 23)");
assert(getDayDetails(2026, 5, 8).type === "N", "Junio 8 es Noche (Semana 24)");
assert(getDayDetails(2026, 5, 22).type === "T", "Junio 22 es Tarde (Semana 26)");

// Output Summary
console.log("\n=== RESUMEN DE LA VALIDACIÓN ===");
if (errors === 0) {
    console.log("🎉 ¡Todas las pruebas han pasado correctamente! La lógica del calendario coincide al 100%.");
    process.exit(0);
} else {
    console.error(`💥 Se encontraron ${errors} errores en la validación.`);
    process.exit(1);
}
