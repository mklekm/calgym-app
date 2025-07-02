// calculator.js

export const coCmMaxScores_calc = { '1AC': 3, '2AC': 4, '3AC': 5 };

const rules_calc = {
    '1AC': { req: { A: 3, B: 2, C: 0 }, points: { A: 1.0, B: 1.5, C: 0 } },
    '2AC': { req: { A: 3, B: 2, C: 1 }, points: { A: 0.75, B: 1.0, C: 1.75 } },
    '3AC': { req: { A: 2, B: 4, C: 1 }, points: { A: 0.5, B: 0.75, C: 2.0 } }
};

export function calculateDifficulty(year, pA, pB, pC) {
    if (!rules_calc[year]) return { score: 0, explanation: "Niveau non valide." };
    const reqs = rules_calc[year].req, points = rules_calc[year].points;
    let explanation = [], currentPA = pA, currentPB = pB, currentPC = pC;
    let extraC = Math.max(0, currentPC - reqs.C);
    if (extraC > 0) {
        currentPB += extraC;
        explanation.push(`&#8227; ${extraC} élément(s) C en trop compte(nt) comme B.`);
    }
    let extraB = Math.max(0, currentPB - reqs.B);
    if (extraB > 0) {
        currentPA += extraB;
        explanation.push(`&#8227; ${extraB} élément(s) B en trop compte(nt) comme A.`);
    }
    const scoredC = Math.min(currentPC, reqs.C),
        scoredB = Math.min(currentPB, reqs.B),
        scoredA = Math.min(currentPA, reqs.A);
    let baseScore = (scoredA * points.A) + (scoredB * points.B) + (scoredC * points.C);
    explanation.push(`&#8227; Score de base : (${scoredA}A×${points.A}) + (${scoredB}B×${points.B}) + (${scoredC}C×${points.C}) = ${baseScore.toFixed(2)} pts.`);
    let partialBonus = 0;
    const missingB = reqs.B - scoredB,
        remainingExtraA = Math.max(0, pA - reqs.A);
    if (missingB > 0 && remainingExtraA > 0) {
        const replacements = Math.min(missingB, remainingExtraA);
        partialBonus = replacements * 0.25;
        explanation.push(`&#8227; Bonus : ${replacements} B manquant(s) remplacé(s) par A pour +${partialBonus.toFixed(2)} pts.`);
    }
    const totalScore = baseScore + partialBonus;
    if (explanation.length === 1 && partialBonus === 0) {
        explanation = ["&#8227; Calculé sur la base des éléments fournis."];
    }
    return { score: Math.min(totalScore, 6.0), explanation: explanation.join('<br>') };
}

export function getLinkingQualityScore(year, quality) {
    const scores = {
        '1AC': { excellent: 4.5, good: 3.5, average: 2.5, weak: 1.0 },
        '2AC': { excellent: 3.5, good: 2.5, average: 1.5, weak: 0.5 },
        '3AC': { excellent: 2.5, good: 1.75, average: 1.0, weak: 0.5 }
    };
    return scores[year]?.[quality] ?? 0;
}

export function createResultRow(label, value, max, extra = "") {
    const score = `<span class="font-bold">${value.toFixed(2)} / ${max}</span>`;
    const header = `<div class="flex justify-between">${label}${score}</div>`;
    const note = extra ? `<div class="pl-4 text-sm text-gray-600">${extra}</div>` : "";
    return `<div class="border-b pb-2 mb-2">${header}${note}</div>`;
}