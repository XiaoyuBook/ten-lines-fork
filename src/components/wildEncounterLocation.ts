export function getWildLocationOptions(locations: readonly number[]) {
    return locations.map((_location, index) => index);
}

export function normalizeWildLocationIndex(
    locations: readonly number[],
    locationIndex: number
) {
    return locationIndex >= 0 && locationIndex < locations.length
        ? locationIndex
        : 0;
}

export function getWildLocationId(
    locations: readonly number[],
    locationIndex: number
) {
    return locations[normalizeWildLocationIndex(locations, locationIndex)] ?? 0;
}
