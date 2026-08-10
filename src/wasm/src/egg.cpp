#include "frlg_egg_pid.hpp"
#include "initial_seed.hpp"
#include "pokefinder_glue.hpp"
#include "util.hpp"
#include <Core/Enum/Game.hpp>
#include <Core/Enum/Method.hpp>
#include <Core/Gen3/Generators/EggGenerator3.hpp>
#include <Core/Gen3/Profile3.hpp>
#include <Core/Parents/Daycare.hpp>
#include <Core/Parents/Filters/StateFilter.hpp>
#include <array>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <string>
#include <unordered_map>
#include <vector>

namespace
{
constexpr int RESULT_BATCH_SIZE = 100;
constexpr u32 PROGRESS_UPDATE_INTERVAL = 1024;

class SearchingStatus {
public:
    explicit SearchingStatus(emscripten::callback<void(bool)> callback)
        : callback(callback)
    {
        this->callback(true);
    }

    ~SearchingStatus()
    {
        if (active) {
            callback(false);
        }
    }

    SearchingStatus(const SearchingStatus&) = delete;
    SearchingStatus& operator=(const SearchingStatus&) = delete;

private:
    emscripten::callback<void(bool)> callback;
    bool active = true;
};

bool is_frlg_egg_method(Method method)
{
    return method == Method::RSFRLGBred
        || method == Method::RSFRLGBredSplit
        || method == Method::RSFRLGBredAlternate
        || method == Method::RSFRLGBredMixed;
}

std::array<u8, 6> build_iv_row(emscripten::typed_array<u8> row)
{
    return {
        row[0],
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
    };
}

std::array<std::array<u8, 6>, 2> build_parent_ivs(emscripten::typed_array<emscripten::typed_array<u8>> parent_ivs)
{
    return {
        build_iv_row(parent_ivs[0]),
        build_iv_row(parent_ivs[1]),
    };
}

StateFilter build_egg_filter(
    u8 shininess,
    int nature,
    u8 gender,
    u8 ability,
    int hidden_power,
    emscripten::typed_array<emscripten::typed_range<u8>> iv_ranges)
{
    std::array<u8, 6> min_ivs = {
        iv_ranges[0].min(),
        iv_ranges[1].min(),
        iv_ranges[2].min(),
        iv_ranges[3].min(),
        iv_ranges[4].min(),
        iv_ranges[5].min(),
    };
    std::array<u8, 6> max_ivs = {
        iv_ranges[0].max(),
        iv_ranges[1].max(),
        iv_ranges[2].max(),
        iv_ranges[3].max(),
        iv_ranges[4].max(),
        iv_ranges[5].max(),
    };

    std::array<bool, 25> natures;
    natures.fill(true);
    if (nature != -1) {
        natures.fill(false);
        natures[nature] = true;
    }

    std::array<bool, 16> powers;
    powers.fill(true);
    if (hidden_power != -1) {
        powers.fill(false);
        powers[hidden_power] = true;
    }

    return StateFilter(gender, ability, shininess, 0, 255, 0, 255, false, min_ivs, max_ivs, natures, powers);
}

void flush_batch(
    emscripten::typed_array<ExtendedEggGeneratorState>& batch,
    emscripten::callback<void(emscripten::typed_array<ExtendedEggGeneratorState>)> result_callback)
{
    if (batch.size() > 0) {
        result_callback(batch);
        batch = emscripten::typed_array<ExtendedEggGeneratorState>();
    }
}
}

void check_seeds_frlg_egg(
    emscripten::typed_array<FRLGContiguousSeedEntry> held_seeds,
    emscripten::typed_array<FRLGContiguousSeedEntry> pickup_seeds,
    emscripten::typed_range<u32> held_advances_range,
    emscripten::typed_range<u32> pickup_advances_range,
    u32 held_offset,
    u32 pickup_offset,
    Game game,
    u16 trainer_id,
    u16 secret_id,
    Method method,
    u8 compatibility,
    emscripten::typed_array<emscripten::typed_array<u8>> parent_ivs_input,
    emscripten::typed_array<u8> parent_genders_input,
    u16 egg_species,
    u8 shininess,
    int nature,
    u8 gender,
    u8 ability,
    int hidden_power,
    emscripten::typed_array<emscripten::typed_range<u8>> iv_ranges,
    u32 max_results,
    std::string held_settings,
    std::string pickup_settings,
    double target_pid,
    bool same_initial_seed_only,
    emscripten::callback<void(emscripten::typed_array<ExtendedEggGeneratorState>)> result_callback,
    emscripten::callback<void(double, double)> progress_callback,
    emscripten::callback<void(bool)> searching_callback)
{
    SearchingStatus searching(searching_callback);

    if (!is_frlg_egg_method(method)) {
        return;
    }

    std::array<std::array<u8, 6>, 2> parent_ivs = build_parent_ivs(parent_ivs_input);
    std::array<u8, 2> parent_ability = { 0, 0 };
    std::array<u8, 2> parent_gender = { parent_genders_input[0], parent_genders_input[1] };
    std::array<u8, 2> parent_item = { 0, 0 };
    std::array<u8, 2> parent_nature = { 0, 0 };

    Daycare daycare(parent_ivs, parent_ability, parent_gender, parent_item, parent_nature, egg_species, false);
    Profile3 profile = build_profile(game, trainer_id, secret_id);
    StateFilter filter = build_egg_filter(shininess, nature, gender, ability, hidden_power, iv_ranges);

    u32 held_initial_advances = held_advances_range.min();
    u32 held_max_advances = held_advances_range.max() - held_initial_advances;
    u32 pickup_initial_advances = pickup_advances_range.min();
    u32 pickup_max_advances = pickup_advances_range.max() - pickup_initial_advances;

    u32 result_count = 0;
    u64 checked_seed_pairs = 0;
    std::unordered_map<u16, std::vector<int>> pickup_indices_by_seed;
    u64 total_seed_pairs = 0;
    if (same_initial_seed_only) {
        pickup_indices_by_seed.reserve(pickup_seeds.size());
        for (int pickup_index = 0; pickup_index < pickup_seeds.size(); pickup_index++) {
            FRLGContiguousSeedEntry pickup_entry = pickup_seeds[pickup_index];
            pickup_indices_by_seed[pickup_entry.initialSeed].push_back(pickup_index);
        }
        for (int held_index = 0; held_index < held_seeds.size(); held_index++) {
            FRLGContiguousSeedEntry held_entry = held_seeds[held_index];
            auto matching_pickups = pickup_indices_by_seed.find(held_entry.initialSeed);
            if (matching_pickups != pickup_indices_by_seed.end()) {
                total_seed_pairs += static_cast<u64>(matching_pickups->second.size());
            }
        }
    } else {
        total_seed_pairs = static_cast<u64>(held_seeds.size()) * static_cast<u64>(pickup_seeds.size());
    }
    emscripten::typed_array<ExtendedEggGeneratorState> batch;
    progress_callback(static_cast<double>(checked_seed_pairs), static_cast<double>(total_seed_pairs));

    auto report_progress = [&](bool force = false) {
        if (force || checked_seed_pairs % PROGRESS_UPDATE_INTERVAL == 0 || checked_seed_pairs == total_seed_pairs) {
            progress_callback(static_cast<double>(checked_seed_pairs), static_cast<double>(total_seed_pairs));
        }
    };

    auto process_seed_pair = [&](const FRLGContiguousSeedEntry& held_entry, const FRLGContiguousSeedEntry& pickup_entry) {
        const std::string resolved_held_settings = held_entry.settings.empty() ? held_settings : held_entry.settings;
        const std::string resolved_pickup_settings = pickup_entry.settings.empty() ? pickup_settings : pickup_entry.settings;

        EggGenerator3 generator(
            held_initial_advances,
            held_max_advances,
            held_offset,
            pickup_initial_advances,
            pickup_max_advances,
            pickup_offset,
            0,
            0,
            0,
            method,
            compatibility,
            daycare,
            profile,
            filter);

        auto states = target_pid < 0
            ? generator.generate(held_entry.initialSeed, pickup_entry.initialSeed)
            : ten_lines::generate_frlg_pid_states(
                held_entry.initialSeed,
                pickup_entry.initialSeed,
                held_initial_advances,
                held_max_advances,
                held_offset,
                pickup_initial_advances,
                pickup_max_advances,
                pickup_offset,
                method,
                compatibility,
                daycare,
                profile,
                filter,
                static_cast<u32>(target_pid));
        for (const auto& state : states) {
            batch.push_back(ExtendedEggGeneratorState(
                held_entry.initialSeed,
                held_entry.seedTime,
                resolved_held_settings,
                pickup_entry.initialSeed,
                pickup_entry.seedTime,
                resolved_pickup_settings,
                state));
            result_count++;

            if (batch.size() >= RESULT_BATCH_SIZE) {
                flush_batch(batch, result_callback);
            }

            if (max_results > 0 && result_count >= max_results) {
                checked_seed_pairs++;
                report_progress(true);
                flush_batch(batch, result_callback);
                return true;
            }
        }
        checked_seed_pairs++;
        report_progress();
        return false;
    };

    for (int held_index = 0; held_index < held_seeds.size(); held_index++) {
        FRLGContiguousSeedEntry held_entry = held_seeds[held_index];
        if (same_initial_seed_only) {
            auto matching_pickups = pickup_indices_by_seed.find(held_entry.initialSeed);
            if (matching_pickups == pickup_indices_by_seed.end()) {
                continue;
            }
            for (int pickup_index : matching_pickups->second) {
                if (process_seed_pair(held_entry, pickup_seeds[pickup_index])) {
                    return;
                }
            }
        } else {
            for (int pickup_index = 0; pickup_index < pickup_seeds.size(); pickup_index++) {
                if (process_seed_pair(held_entry, pickup_seeds[pickup_index])) {
                    return;
                }
            }
        }
    }

    report_progress(true);
    flush_batch(batch, result_callback);
}

EMSCRIPTEN_BINDINGS(egg)
{
    emscripten::smart_function("check_seeds_frlg_egg", &check_seeds_frlg_egg);
}
