/** DB category values for customization_options.category */
export const EXCLUSIVE_OPTION_CATEGORIES = new Set([
    "Ice Level",
    "Sugar Level",
]);

export function isExclusiveCategory(cat) {
    return EXCLUSIVE_OPTION_CATEGORIES.has(cat);
}

function idsInCategory(options, category) {
    return new Set(
        options.filter((o) => o.category === category).map((o) => o.id),
    );
}

/**
 * Replace any selected option in `category` with `selectedId` (radio behavior).
 */
export function selectExclusiveInCategory(
    prevIds,
    options,
    category,
    selectedId,
) {
    const inCat = idsInCategory(options, category);
    const rest = prevIds.filter((id) => !inCat.has(id));
    return [...rest, selectedId];
}

function findOption(options, category, nameLower) {
    return options.find(
        (o) =>
            o.category === category &&
            String(o.name || "").toLowerCase() === nameLower,
    );
}

/** Default ice + sugar when opening customize modal (IDs from catalog). */
export function defaultCustomizationSelection(options) {
    const ice = findOption(options, "Ice Level", "regular ice");
    const sugar = findOption(options, "Sugar Level", "100%");
    const ids = [];
    if (ice) ids.push(ice.id);
    if (sugar) ids.push(sugar.id);
    return ids;
}

/** Ensure one ice and one sugar if catalog defines those categories. */
export function ensureIceSugarDefaults(ids, options) {
    let next = [...ids];
    for (const category of ["Ice Level", "Sugar Level"]) {
        const inCat = options.filter((o) => o.category === category);
        if (inCat.length === 0) continue;
        const has = next.some((id) => inCat.some((o) => o.id === id));
        if (has) continue;
        const def =
            category === "Ice Level"
                ? findOption(options, "Ice Level", "regular ice")
                : findOption(options, "Sugar Level", "100%");
        if (def) next.push(def.id);
    }
    return next;
}

export function sortOptionsForDisplay(category, opts) {
    const copy = [...opts];
    if (category === "Sugar Level") {
        copy.sort(
            (a, b) =>
                parseInt(String(a.name), 10) - parseInt(String(b.name), 10),
        );
    } else if (category === "Ice Level") {
        const order = {
            "no ice": 0,
            "light ice": 1,
            "regular ice": 2,
            "extra ice": 3,
        };
        copy.sort(
            (a, b) =>
                (order[String(a.name).toLowerCase()] ?? 99) -
                (order[String(b.name).toLowerCase()] ?? 99),
        );
    }
    return copy;
}
