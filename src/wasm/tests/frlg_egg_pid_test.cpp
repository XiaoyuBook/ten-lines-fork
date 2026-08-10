#include "frlg_egg_pid.hpp"
#include <Core/Gen3/Generators/EggGenerator3.hpp>
#include <algorithm>
#include <array>
#include <cstdlib>
#include <iostream>
#include <string_view>
#include <vector>

namespace
{
struct StateSnapshot {
    u32 held_advances;
    u32 pickup_advances;
    u32 pid;
    u8 nature;
    u8 ability;
    u16 ability_index;
    u8 gender;
    std::array<u8, 6> ivs;
    std::array<u16, 6> stats;
    u8 shiny;
    std::array<u8, 6> inheritance;
    u8 hidden_power;
    u8 hidden_power_strength;

    bool operator==(const StateSnapshot&) const = default;
};

[[noreturn]] void fail(std::string_view message)
{
    std::cerr << message << '\n';
    std::exit(1);
}

void require(bool condition, std::string_view message)
{
    if (!condition) {
        fail(message);
    }
}

StateSnapshot snapshot(const EggState3& state)
{
    return {
        state.getAdvances(),
        state.getPickupAdvances(),
        state.getPID(),
        state.getNature(),
        state.getAbility(),
        state.getAbilityIndex(),
        state.getGender(),
        state.getIVs(),
        state.getStats(),
        state.getShiny(),
        state.getInheritance(),
        state.getHiddenPower(),
        state.getHiddenPowerStrength(),
    };
}

void require_states_equal(
    const std::vector<EggState3>& expected,
    const std::vector<EggState3>& actual,
    std::string_view label)
{
    if (expected.size() != actual.size()) {
        std::cerr << label << ": expected " << expected.size() << " states, got " << actual.size() << '\n';
        std::exit(1);
    }

    for (std::size_t index = 0; index < expected.size(); index++) {
        if (!(snapshot(expected[index]) == snapshot(actual[index]))) {
            std::cerr << label << ": mismatch at index " << index
                      << ", expected advances (" << expected[index].getAdvances() << ", "
                      << expected[index].getPickupAdvances() << "), got ("
                      << actual[index].getAdvances() << ", " << actual[index].getPickupAdvances() << ")\n";
            std::exit(1);
        }
    }
}

Daycare build_daycare()
{
    const std::array<std::array<u8, 6>, 2> parent_ivs = {
        std::array<u8, 6> { 1, 2, 3, 4, 5, 6 },
        std::array<u8, 6> { 11, 12, 13, 14, 15, 16 },
    };
    const std::array<u8, 2> parent_ability = { 0, 0 };
    const std::array<u8, 2> parent_gender = { 0, 1 };
    const std::array<u8, 2> parent_item = { 0, 0 };
    const std::array<u8, 2> parent_nature = { 0, 0 };
    return Daycare(parent_ivs, parent_ability, parent_gender, parent_item, parent_nature, 1, false);
}

StateFilter build_filter()
{
    std::array<u8, 6> min_ivs = { 0, 0, 0, 0, 0, 0 };
    std::array<u8, 6> max_ivs = { 31, 31, 31, 31, 31, 31 };
    std::array<bool, 25> natures;
    natures.fill(true);
    std::array<bool, 16> powers;
    powers.fill(true);
    return StateFilter(255, 255, 255, 0, 255, 0, 255, false, min_ivs, max_ivs, natures, powers);
}

std::vector<EggState3> generate_reference_states(
    u32 held_seed,
    u32 pickup_seed,
    u32 held_initial_advances,
    u32 held_max_advances,
    u32 held_offset,
    u32 pickup_initial_advances,
    u32 pickup_max_advances,
    u32 pickup_offset,
    Method method,
    u8 compatibility,
    const Daycare& daycare,
    const Profile3& profile,
    const StateFilter& filter,
    u32 target_pid)
{
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
    auto states = generator.generate(held_seed, pickup_seed);
    states.erase(
        std::remove_if(states.begin(), states.end(), [target_pid](const EggState3& state) {
            return state.getPID() != target_pid;
        }),
        states.end());
    return states;
}

std::vector<EggState3> generate_optimized_states(
    u32 held_seed,
    u32 pickup_seed,
    u32 held_initial_advances,
    u32 held_max_advances,
    u32 held_offset,
    u32 pickup_initial_advances,
    u32 pickup_max_advances,
    u32 pickup_offset,
    Method method,
    u8 compatibility,
    const Daycare& daycare,
    const Profile3& profile,
    const StateFilter& filter,
    u32 target_pid)
{
    return ten_lines::generate_frlg_pid_states(
        held_seed,
        pickup_seed,
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
        target_pid);
}

void test_pid_path_order_and_result_cap()
{
    // Low 0x4e89 occurs at held advances 0/4; high 0x4e88 occurs at pickup advances 1/5.
    constexpr u32 seed = 0x93dd;
    constexpr u32 target_pid = 0x4e884e89;
    constexpr std::array<Method, 4> methods = {
        Method::RSFRLGBred,
        Method::RSFRLGBredSplit,
        Method::RSFRLGBredAlternate,
        Method::RSFRLGBredMixed,
    };
    constexpr std::array<std::array<u32, 2>, 4> expected_advances = {
        std::array<u32, 2> { 0, 1 },
        std::array<u32, 2> { 0, 5 },
        std::array<u32, 2> { 4, 1 },
        std::array<u32, 2> { 4, 5 },
    };
    const Daycare daycare = build_daycare();
    const Profile3 profile("", Game::FireRed, 0, 0, false);
    const StateFilter filter = build_filter();

    for (Method method : methods) {
        auto expected = generate_reference_states(
            seed, seed, 0, 4, 0, 0, 5, 0, method, 70, daycare, profile, filter, target_pid);
        auto actual = generate_optimized_states(
            seed, seed, 0, 4, 0, 0, 5, 0, method, 70, daycare, profile, filter, target_pid);
        require_states_equal(expected, actual, "PID path order/full-state equivalence");
        require(actual.size() == expected_advances.size(), "PID path order fixture must produce four states");
        for (std::size_t index = 0; index < expected_advances.size(); index++) {
            require(
                actual[index].getAdvances() == expected_advances[index][0]
                    && actual[index].getPickupAdvances() == expected_advances[index][1],
                "PID path must preserve EggGenerator3 held/pickup ordering");
        }

        expected.resize(2);
        actual.resize(2);
        require_states_equal(expected, actual, "max-results truncation equivalence");
        require(
            actual[0].getAdvances() == 0 && actual[0].getPickupAdvances() == 1
                && actual[1].getAdvances() == 0 && actual[1].getPickupAdvances() == 5,
            "max-results truncation must retain the first two EggGenerator3-ordered states");
    }
}

void test_repeated_inheritance_semantics()
{
    // The sampled stats [0, 1, 1] map to HP, Defense, Defense under the RS/FRLG deletion bug.
    constexpr u32 target_pid = 0xcba7e97f;
    const Daycare daycare = build_daycare();
    const Profile3 profile("", Game::FireRed, 0, 0, false);
    const StateFilter filter = build_filter();
    auto expected = generate_reference_states(
        0, 0, 0, 0, 0, 15, 0, 0, Method::RSFRLGBredSplit, 70, daycare, profile, filter, target_pid);
    auto actual = generate_optimized_states(
        0, 0, 0, 0, 0, 15, 0, 0, Method::RSFRLGBredSplit, 70, daycare, profile, filter, target_pid);

    require_states_equal(expected, actual, "RS/FRLG repeated-inheritance equivalence");
    require(actual.size() == 1, "repeated-inheritance fixture must produce one state");
    require(
        actual[0].getIVs() == std::array<u8, 6> { 1, 14, 13, 29, 9, 6 },
        "RS/FRLG inheritance must allow Defense to be inherited twice and overwritten");
    require(
        actual[0].getInheritance() == std::array<u8, 6> { 1, 0, 2, 0, 0, 0 },
        "RS/FRLG inheritance markers must record the parent from the repeated final inheritance");
}
}

int main()
{
    test_pid_path_order_and_result_cap();
    test_repeated_inheritance_semantics();
    return 0;
}
