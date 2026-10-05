#ifndef TEN_LINES_FRLG_EGG_PID_HPP
#define TEN_LINES_FRLG_EGG_PID_HPP

#include <Core/Enum/Method.hpp>
#include <Core/Gen3/Profile3.hpp>
#include <Core/Gen3/States/EggState3.hpp>
#include <Core/Parents/Daycare.hpp>
#include <Core/Parents/Filters/StateFilter.hpp>
#include <array>
#include <vector>

namespace ten_lines
{
void set_frlg_inheritance(
    const Daycare& daycare,
    std::array<u8, 6>& ivs,
    std::array<u8, 6>& inheritance,
    const u8* inherited_stats,
    const u8* inherited_parents);

std::vector<EggState3> generate_frlg_pid_states(
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
    u32 target_pid);
}

#endif // TEN_LINES_FRLG_EGG_PID_HPP
