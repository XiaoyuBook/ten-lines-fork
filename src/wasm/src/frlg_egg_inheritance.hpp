#pragma once

#include <Core/Parents/Daycare.hpp>
#include <array>

namespace frlg_egg
{
inline void set_inheritance(
    const Daycare& daycare,
    std::array<u8, 6>& ivs,
    std::array<u8, 6>& inheritance,
    const u8* inherited_stats,
    const u8* inherited_parents)
{
    constexpr u8 stat_order[6] = { 0, 1, 2, 5, 3, 4 };
    u8 available[6] = { 0, 1, 2, 3, 4, 5 };
    auto remove_available = [&available](u8 index, u8 size) {
        for (u8 i = index; i < size; i++) {
            available[i] = available[i + 1];
        }
    };

    for (u8 selection = 0; selection < 3; selection++) {
        const u8 sampled_index = inherited_stats[selection];
        const u8 stat = available[sampled_index];
        const u8 iv_index = stat_order[stat];
        const u8 parent = inherited_parents[selection];

        ivs[iv_index] = daycare.getParentIV(parent, iv_index);
        inheritance[iv_index] = parent + 1;

        if (selection < 2) {
            // The RNG result indexes the current available array; it is not a stat id.
            remove_available(sampled_index, 5 - selection);
        }
    }
}
}
