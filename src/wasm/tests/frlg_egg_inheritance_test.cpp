#include "frlg_egg_inheritance.hpp"
#include <array>

int main()
{
    const std::array<std::array<u8, 6>, 2> parent_ivs = {
        std::array<u8, 6> { 10, 11, 12, 13, 14, 15 },
        std::array<u8, 6> { 20, 21, 22, 23, 24, 25 },
    };
    const std::array<u8, 2> parent_ability = { 0, 0 };
    const std::array<u8, 2> parent_gender = { 0, 1 };
    const std::array<u8, 2> parent_item = { 0, 0 };
    const std::array<u8, 2> parent_nature = { 0, 0 };
    const Daycare daycare(
        parent_ivs,
        parent_ability,
        parent_gender,
        parent_item,
        parent_nature,
        1,
        false);

    std::array<u8, 6> ivs = { 0, 0, 0, 0, 0, 0 };
    std::array<u8, 6> inheritance = { 0, 0, 0, 0, 0, 0 };

    // After choosing index 1, available becomes [0, 2, 3, 4, 5].
    // Choosing index 1 again must remove that position, so the final pick is 3.
    const u8 inherited_stats[3] = { 1, 1, 1 };
    const u8 inherited_parents[3] = { 0, 1, 0 };
    frlg_egg::set_inheritance(
        daycare,
        ivs,
        inheritance,
        inherited_stats,
        inherited_parents);

    const std::array<u8, 6> expected_ivs = { 0, 11, 22, 0, 0, 15 };
    const std::array<u8, 6> expected_inheritance = { 0, 1, 2, 0, 0, 1 };
    return ivs == expected_ivs && inheritance == expected_inheritance ? 0 : 1;
}
